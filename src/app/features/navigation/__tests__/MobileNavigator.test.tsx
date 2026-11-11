import { test, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { MobileNavigator } from "../MobileNavigator";
const mockOffice = {
  workspace: {
    id: "office-a",
    kind: "office",
    name: "Planning Office",
    state: "active",
  },
  projects: [{ id: "project-a" }],
};
let mockRole = "head";
const mockPersonal = {
  workspace: {
    id: "personal-b",
    kind: "personal",
    name: "Personal QA",
    state: "active",
  },
  projects: [{ id: "project-b" }],
};
const mockWorkspace = {
  workspaces: [mockOffice.workspace, mockPersonal.workspace],
  selected: mockOffice as typeof mockOffice | undefined,
  loading: false,
  error: undefined as Error | undefined,
  select: jest.fn(),
  refresh: jest.fn(),
};
jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "actor", role: mockRole, full_name: "QA Head" },
    can: () => true,
    signOut: jest.fn(),
  }),
}));
jest.mock("../../workspaces", () => ({ useWorkspace: () => mockWorkspace }));
jest.mock("../../notifications", () => ({ usePushInbox: () => {} }));
jest.mock("../../communication", () => ({
  useConversationDirectory: () => ({ data: [] }),
}));
jest.mock("../../../components/brand/EFlowMark", () => ({
  EFlowMark: () => null,
}));
jest.mock("../../workspaces/WorkspaceSheet", () => {
  const { View, Button } = require("react-native");
  return {
    WorkspaceSheet: ({ open, onSelect }: any) =>
      open ? (
        <View>
          <Button
            title="Choose personal QA"
            onPress={() => onSelect("personal-b")}
          />
          <Button
            title="Choose Office QA"
            onPress={() => onSelect("office-a")}
          />
        </View>
      ) : null,
  };
});
jest.mock("../../../../platform/config", () => ({
  backendConfig: { webOrigin: "" },
}));
jest.mock("../../app-shell/MobileContent", () => {
  const { View, Text, Button } = require("react-native");
  const { useNavigation } = require("@react-navigation/native");
  return {
    MobileContent: ({ current, navigate }: any) => {
      const navigation = useNavigation();
      return (
        <View>
          <Text>{`Body ${current.name}${current.nodeId ? " " + current.nodeId : ""}`}</Text>
          <Button
            title="Open linked project"
            onPress={() => navigate({ name: "project", id: "project-a" })}
          />
          <Button
            title="Open project in Projects"
            onPress={() =>
              navigate({
                name: "project",
                id: "project-a",
                originTab: "projects",
              })
            }
          />
          <Button
            title="Open journal"
            onPress={() => navigate({ name: "accounting_journal" })}
          />
          <Button
            title="Back to previous"
            onPress={() => navigation.goBack()}
          />
        </View>
      );
    },
  };
});

beforeEach(() => {
  mockRole = "head";
  mockWorkspace.selected = mockOffice;
  mockWorkspace.loading = false;
  mockWorkspace.error = undefined;
  mockWorkspace.select.mockImplementation(async (...args: unknown[]) => {
    const selected = args[0] === "personal-b" ? mockPersonal : mockOffice;
    mockWorkspace.selected = selected;
    return selected;
  });
});

test("refresh keeps the same navigation bar and project destination while access is rechecked", async () => {
  const view = await render(<MobileNavigator />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Open project in Projects" }),
  );
  expect(screen.getByText("Body project")).toBeOnTheScreen();
  const bar = screen.getByTestId("native-bottom-navigation");

  mockWorkspace.selected = undefined;
  mockWorkspace.loading = true;
  await view.rerender(<MobileNavigator />);
  expect(screen.getByTestId("native-bottom-navigation")).toBe(bar);
  expect(
    screen.getByRole("tab", { name: "Projects", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Body project")).toBeNull();

  mockWorkspace.loading = false;
  mockWorkspace.error = new Error("Connection unavailable");
  await view.rerender(<MobileNavigator />);
  expect(screen.getByTestId("native-bottom-navigation")).toBe(bar);
  expect(
    screen.getByRole("tab", { name: "Projects", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Body project")).toBeNull();

  mockWorkspace.selected = mockOffice;
  mockWorkspace.error = undefined;
  await view.rerender(<MobileNavigator />);
  expect(screen.getByTestId("native-bottom-navigation")).toBe(bar);
  expect(screen.getByText("Body project")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Back to previous" }),
  );
  expect(screen.getByText("Body projects")).toBeOnTheScreen();
});

test("Home toolbar profile opens within Home and Back restores Home", async () => {
  await render(<MobileNavigator />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Open profile for QA Head" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body profile")).toBeOnTheScreen(),
  );
  expect(
    screen.getByRole("tab", { name: "Home" }).props.accessibilityState.selected,
  ).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Back to previous" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body overview")).toBeOnTheScreen(),
  );
});

test("an explicit link to an unvisited tab keeps that tab's root available for Back", async () => {
  await render(<MobileNavigator />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Open project in Projects" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body project")).toBeOnTheScreen(),
  );
  expect(
    screen.getByRole("tab", { name: "Projects" }).props.accessibilityState
      .selected,
  ).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Back to previous" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body projects")).toBeOnTheScreen(),
  );
});

test("a child opened from Home retains Home selection; Projects and More are stable peer destinations", async () => {
  await render(<MobileNavigator />);
  await waitFor(() =>
    expect(screen.getByText("Body overview")).toBeOnTheScreen(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Open linked project" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body project")).toBeOnTheScreen(),
  );
  expect(
    screen.getByRole("tab", { name: "Home" }).props.accessibilityState.selected,
  ).toBe(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Projects" }));
  await waitFor(() =>
    expect(screen.getByText("Body projects")).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("tab", { name: "More" }));
  await waitFor(() => expect(screen.getByText("QA Head")).toBeOnTheScreen());
  await fireEvent.press(
    screen.getByRole("button", { name: "Account & settings" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body settings")).toBeOnTheScreen(),
  );
  expect(
    screen.getByRole("tab", { name: "More" }).props.accessibilityState.selected,
  ).toBe(true);
});

test("a shared project starts with a real Projects root underneath, so back never exits into a missing stack", async () => {
  await render(
    <MobileNavigator
      initialRoute={{ name: "project", id: "project-a", nodeId: "node-eight" }}
    />,
  );
  await waitFor(() =>
    expect(screen.getByText("Body project node-eight")).toBeOnTheScreen(),
  );
  expect(
    screen.getByRole("tab", { name: "Projects" }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(
    screen.getByRole("button", { name: "Back to previous" }),
  ).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Back to previous" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body projects")).toBeOnTheScreen(),
  );
});

test.each(["head", "member", "accounting_staff"])(
  "%s can open Account & settings from a real More root while retaining selected-tab state (mocked actor, not emulator evidence)",
  async (role) => {
    mockRole = role;
    await render(<MobileNavigator />);
    const expected = "Home";
    expect(
      screen.getByRole("tab", { name: expected }).props.accessibilityState
        .selected,
    ).toBe(true);
    await fireEvent.press(screen.getByRole("tab", { name: "More" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Account & settings" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Body settings")).toBeOnTheScreen(),
    );
    expect(
      screen.getByRole("tab", { name: "More" }).props.accessibilityState
        .selected,
    ).toBe(true);
    await fireEvent.press(
      screen.getByRole("button", { name: "Back to previous" }),
    );
    await waitFor(() => expect(screen.getByText("QA Head")).toBeOnTheScreen());
  },
);

test("Accounting opens Projects in More and linked projects in Accounting, retaining Back", async () => {
  mockRole = "accounting_staff";
  await render(<MobileNavigator />);
  expect(screen.queryByRole("tab", { name: "Projects" })).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "More" }));
  await fireEvent.press(screen.getByRole("button", { name: "Projects" }));
  expect(await screen.findByText("Body projects")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Open linked project" }),
  );
  expect(await screen.findByText("Body project")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Back to previous" }),
  );
  expect(await screen.findByText("Body projects")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("tab", { name: "Accounting" }));
  expect(await screen.findByText("Body accounting_overview")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Open linked project" }),
  );
  expect(await screen.findByText("Body project")).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Back to previous" }),
  );
  expect(await screen.findByText("Body accounting_overview")).toBeOnTheScreen();
});

test("switching Office/personal context blocks stale work and retains the exact original task destination for a return", async () => {
  await render(
    <MobileNavigator
      initialRoute={{
        name: "task",
        id: "root",
        nodeId: "node-eight",
        projectId: "project-a",
        workspaceId: "office-a",
        originTab: "inbox",
      }}
    />,
  );
  await waitFor(() =>
    expect(screen.getByText("Body task node-eight")).toBeOnTheScreen(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: /Switch workspace. Current/ }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Choose personal QA" }),
  );
  await waitFor(() =>
    expect(
      screen.getByText("This item belongs to another workspace"),
    ).toBeOnTheScreen(),
  );
  expect(screen.queryByText("Body task node-eight")).toBeNull();
  expect(
    screen.getByRole("tab", { name: "Inbox" }).props.accessibilityState
      .selected,
  ).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Switch workspace" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Choose Office QA" }),
  );
  await waitFor(() =>
    expect(screen.getByText("Body task node-eight")).toBeOnTheScreen(),
  );
});
