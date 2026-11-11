import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { OverviewScreen } from "../OverviewScreen";
import type { WorkRow } from "../../../../core/web/app/features/personal-work/types";
import type { WorkspaceSnapshot } from "../../../../core/web/app/features/workspaces/types";

let mockRole = "head";
let mockWorkRows: WorkRow[] = [];
const mockSelected: WorkspaceSnapshot = {
  workspace: {
    id: "workspace",
    name: "Planning Office",
    kind: "office",
    office_id: "office",
    owner_id: null,
    state: "active",
    timezone: "Asia/Manila",
  },
  projects: [
    {
      id: "project-a",
      title: "Bridge works",
      status: "active",
      kind: "office",
      home_workspace_id: "workspace",
    },
    {
      id: "project-b",
      title: "District permits",
      status: "on_hold",
      kind: "office",
      home_workspace_id: "workspace",
    },
    {
      id: "project-c",
      title: "Community desk",
      status: "planning",
      kind: "office",
      home_workspace_id: "workspace",
    },
    {
      id: "project-d",
      title: "Zoning",
      status: "active",
      kind: "office",
      home_workspace_id: "workspace",
    },
    {
      id: "archived",
      title: "Archived work",
      status: "archived",
      kind: "office",
      home_workspace_id: "workspace",
    },
    {
      id: "personal",
      title: "Personal shortcut",
      status: "active",
      kind: "personal",
      home_workspace_id: "other",
    },
  ],
};
jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "actor", org_id: "office", role: mockRole, is_active: true },
    organization: {
      id: "office",
      name: "Planning Office",
      head_user_id: "actor",
    },
    can: () => true,
  }),
}));
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({ selected: mockSelected, refresh: async () => {} }),
}));
jest.mock("../../personal-work/WorkFeedProvider", () => ({
  useMobileWorkFeed: () => ({
    data: { rows: mockWorkRows, issues: [], unavailable: [] },
    refresh: async () => {},
  }),
}));
jest.mock("../homeFinance", () => ({
  headCashDecisions: async () => [],
  assignedFinanceReviews: async () => [],
}));
jest.mock("../AccountingHome", () => ({ AccountingHome: () => null }));
jest.mock("../../projects/services", () => ({
  fetchProjectCompletion: async (id: string) => {
    if (id === "project-c") throw new Error("Counts unavailable");
    return id === "project-b"
      ? { completed: 0, required: 0 }
      : { completed: 2, required: 4 };
  },
}));
jest.mock("../../projects/subscriptions", () => ({
  netProjectUpdates: () => () => {},
}));

test("Head Home displays exactly three Office projects with consistent totals and no lifecycle label", async () => {
  mockRole = "head";
  const navigate = jest.fn();
  const view = await render(<OverviewScreen navigate={navigate} />);
  expect(await view.findByText("2 of 4 tasks completed")).toBeOnTheScreen();
  expect(view.getByText("50%")).toBeOnTheScreen();
  expect(view.getByText("No tasks yet")).toBeOnTheScreen();
  expect(view.getByText("Progress unavailable")).toBeOnTheScreen();
  expect(view.queryByText("Zoning")).toBeNull();
  expect(view.queryByText("Planning")).toBeNull();
  expect(view.queryByText("Archived work")).toBeNull();
  expect(view.queryByText("Personal shortcut")).toBeNull();
  expect(view.queryByText("Favorites")).toBeNull();
  await fireEvent.press(view.getByRole("button", { name: "Bridge works" }));
  expect(navigate).toHaveBeenLastCalledWith({
    name: "project",
    id: "project-a",
    workspaceId: "workspace",
  });
  await fireEvent.press(view.getByRole("button", { name: "Office Analytics" }));
  expect(navigate).toHaveBeenLastCalledWith({ name: "reports" });
});

test("Member Home separates pending work from an assignment they lead", async () => {
  mockRole = "member";
  const row = {
    id: "task",
    rootId: "task",
    key: "task",
    title: "Road survey",
    kind: "office-task",
    status: "changes_requested",
    mine: true,
    leading: true,
    actionable: true,
    history: false,
    workspaceId: "workspace",
    timezone: "Asia/Manila",
    projectTitle: "Bridge works",
    relation: "Task Lead",
    task: { id: "task", assigneeId: "actor" },
  } as WorkRow;
  mockWorkRows = [
    row,
    { ...row, key: "waiting", title: "Check permits", status: "for_review" },
    {
      ...row,
      key: "contributor",
      title: "Verify inventory",
      leading: false,
      relation: "Contributor",
    },
  ];
  try {
    const view = await render(<OverviewScreen navigate={jest.fn()} />);
    expect(view.getByText("My Priorities")).toBeOnTheScreen();
    expect(view.getByText("Road survey")).toBeOnTheScreen();
    expect(view.getByText("Waiting on Others")).toBeOnTheScreen();
    expect(view.getByText("Check permits")).toBeOnTheScreen();
    expect(view.queryByText("Verify inventory")).toBeNull();
    expect(view.queryByText("Project Progress")).toBeNull();
  } finally {
    mockWorkRows = [];
  }
});
