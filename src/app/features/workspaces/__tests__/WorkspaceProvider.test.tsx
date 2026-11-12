import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Button, Text, View } from "react-native";
import { WorkspaceProvider, useWorkspace } from "../WorkspaceProvider";
import {
  listWorkspaces,
  selectWorkspace,
} from "../../../../core/web/app/features/workspaces/services/workspaceService";
import type {
  Workspace,
  WorkspaceSnapshot,
} from "../../../../core/web/app/features/workspaces/types";

const mockProfile: {
  id: string;
  role: string;
  org_id: string | null;
  employee_id?: string;
} = { id: "qa-actor", role: "member", org_id: "office-a" };
jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: mockProfile,
  }),
}));
jest.mock(
  "../../../../core/web/app/features/workspaces/services/workspaceService",
  () => ({ listWorkspaces: jest.fn(), selectWorkspace: jest.fn() }),
);
const list = jest.mocked(listWorkspaces),
  select = jest.mocked(selectWorkspace);
const office: Workspace = {
  id: "office-a",
  name: "Office A",
  kind: "office",
  office_id: "office-a",
  owner_id: null,
  timezone: "Asia/Manila",
  state: "active",
};
const personal: Workspace = {
  ...office,
  id: "personal-b",
  name: "Personal B",
  kind: "personal",
  office_id: null,
  owner_id: "qa-actor",
};
const snapshot = (workspace: Workspace): WorkspaceSnapshot => ({
  workspace,
  projects: [],
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function Probe() {
  const context = useWorkspace();
  return (
    <View>
      <Text testID="selected">{context.selected?.workspace.id || "none"}</Text>
      <Text testID="projects">
        {context.selected?.projects.map((project) => project.id).join(",") ||
          "none"}
      </Text>
      <Text testID="loading">{String(context.loading)}</Text>
      <Text testID="error">{context.error?.message || "none"}</Text>
      <Button title="Office" onPress={() => void context.select("office-a")} />
      <Button
        title="Personal"
        onPress={() => void context.select("personal-b")}
      />
      <Button title="Unknown" onPress={() => void context.select("unlisted")} />
      <Button title="Refresh" onPress={() => void context.refresh()} />
    </View>
  );
}
async function mount() {
  await render(
    <WorkspaceProvider>
      <Probe />
    </WorkspaceProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("selected")).toHaveTextContent("office-a"),
  );
}
beforeEach(() => {
  delete mockProfile.employee_id;
  list.mockReset().mockResolvedValue([office, personal]);
  select
    .mockReset()
    .mockImplementation(async (id) =>
      snapshot(id === office.id ? office : personal),
    );
});

test("unlisted workspace IDs fail closed before requesting a snapshot and clear the previous context", async () => {
  await mount();
  select.mockClear();
  await fireEvent.press(screen.getByText("Unknown"));
  await waitFor(() =>
    expect(screen.getByTestId("error")).toHaveTextContent(
      /not in your current authorized workspace list/,
    ),
  );
  expect(select).not.toHaveBeenCalled();
  expect(screen.getByTestId("selected")).toHaveTextContent("none");
});

test("out-of-order selections cannot restore a superseded workspace", async () => {
  await mount();
  const late = deferred<WorkspaceSnapshot>();
  select.mockImplementation(async (id) =>
    id === personal.id ? late.promise : snapshot(office),
  );
  await fireEvent.press(screen.getByText("Personal"));
  expect(screen.getByTestId("selected")).toHaveTextContent("none");
  await fireEvent.press(screen.getByText("Office"));
  await waitFor(() =>
    expect(screen.getByTestId("selected")).toHaveTextContent("office-a"),
  );
  await act(async () => {
    late.resolve(snapshot(personal));
    await late.promise;
  });
  expect(screen.getByTestId("selected")).toHaveTextContent("office-a");
});

test("a fresh list revocation blocks the old selection, and selecting an authorized alternative recovers", async () => {
  await mount();
  list.mockResolvedValue([personal]);
  select.mockClear();
  await fireEvent.press(screen.getByText("Refresh"));
  await waitFor(() =>
    expect(screen.getByTestId("error")).toHaveTextContent(
      /not in your current authorized workspace list/,
    ),
  );
  expect(select).not.toHaveBeenCalled();
  expect(screen.getByTestId("selected")).toHaveTextContent("none");
  await fireEvent.press(screen.getByText("Personal"));
  await waitFor(() =>
    expect(screen.getByTestId("selected")).toHaveTextContent("personal-b"),
  );
  expect(screen.getByTestId("error")).toHaveTextContent("none");
});

test("a failed list refresh removes stale access and retry reloads the current selection", async () => {
  await mount();
  list.mockRejectedValueOnce(new Error("Workspace service unavailable"));
  await fireEvent.press(screen.getByText("Refresh"));
  await waitFor(() =>
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Workspace service unavailable",
    ),
  );
  expect(screen.getByTestId("selected")).toHaveTextContent("none");
  await fireEvent.press(screen.getByText("Refresh"));
  await waitFor(() =>
    expect(screen.getByTestId("selected")).toHaveTextContent("office-a"),
  );
});

test("a mismatched response cannot become current context", async () => {
  await mount();
  select.mockResolvedValueOnce(snapshot(office));
  await fireEvent.press(screen.getByText("Personal"));
  await waitFor(() =>
    expect(screen.getByTestId("error")).toHaveTextContent(
      /Could not verify the selected workspace context/,
    ),
  );
  expect(screen.getByTestId("selected")).toHaveTextContent("none");
});

test("an open guest workspace drops an expired project on the fallback check", async () => {
  jest.useFakeTimers();
  try {
    mockProfile.employee_id = "GUEST-qa-actor";
    select.mockResolvedValueOnce({
      ...snapshot(office),
      projects: [
        {
          id: "temporary-project",
          title: "Guest project",
          kind: "office",
          status: "active",
          home_workspace_id: office.id,
        },
      ],
    });
    await mount();
    expect(screen.getByTestId("projects")).toHaveTextContent(
      "temporary-project",
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(screen.getByTestId("projects")).toHaveTextContent("none");
    expect(screen.getByTestId("selected")).toHaveTextContent("office-a");
  } finally {
    jest.useRealTimers();
  }
});
