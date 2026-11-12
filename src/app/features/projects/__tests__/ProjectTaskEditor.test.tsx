import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProjectTaskEditor } from "../ProjectTaskEditor";
import type { ProjectGroup } from "../../../../core/web/app/features/project-table/types";

const mockRpc =
  jest.fn<
    (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: null }>
  >();
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args),
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "head" } } } }),
    },
  },
}));
jest.mock("../../../components/ui/Sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../services", () => ({
  fetchProject: async () => ({ status: "active" }),
}));
jest.mock(
  "../../../../core/web/app/features/project-table/services/workspaceService",
  () => ({
    fetchProjectGroups: async () => mockGroups,
  }),
);
const mockGroups: ProjectGroup[] = [
  {
    id: "group",
    projectId: "project",
    title: "Field work",
    color: "#123456",
    position: 0,
    isDefault: true,
  },
];

test("task creation rechecks both Web permissions and never writes when one is denied", async () => {
  mockRpc
    .mockReset()
    .mockImplementation(async (name) => ({
      data: name === "can_create_scoped_work",
      error: null,
    }));
  const view = await render(
    <ProjectTaskEditor
      scope={{ actor: "head", project: "project", office: "office" }}
      groups={mockGroups}
      onClose={jest.fn()}
      onSaved={async () => {}}
    />,
  );
  await fireEvent.changeText(view.getByLabelText("Task title"), "Survey site");
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    await view.findByText("Current project access does not allow this change."),
  ).toBeOnTheScreen();
  expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([
    "can_create_scoped_work",
    "can_manage_project",
  ]);
});

test("an unconfirmed Web create receipt locks submission instead of creating a duplicate", async () => {
  mockRpc
    .mockReset()
    .mockImplementation(async (name) => ({
      data: name === "phase3_create_task" ? null : true,
      error: null,
    }));
  const saved = jest.fn(async () => {});
  const view = await render(
    <ProjectTaskEditor
      scope={{ actor: "head", project: "project", office: "office" }}
      groups={mockGroups}
      onClose={jest.fn()}
      onSaved={saved}
    />,
  );
  await fireEvent.changeText(
    view.getByLabelText("Task title"),
    " Survey site ",
  );
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  await waitFor(() =>
    expect(view.getByRole("button", { name: "Add task" })).toBeDisabled(),
  );
  expect(
    await view.findByText(/The save could not be confirmed/),
  ).toBeOnTheScreen();
  expect(mockRpc).toHaveBeenLastCalledWith("phase3_create_task", {
    p_project_id: "project",
    p_group_id: "group",
    p_title: "Survey site",
  });
  await fireEvent.press(view.getByRole("button", { name: "Add task" }));
  expect(
    mockRpc.mock.calls.filter(([name]) => name === "phase3_create_task"),
  ).toHaveLength(1);
  expect(saved).not.toHaveBeenCalled();
});
