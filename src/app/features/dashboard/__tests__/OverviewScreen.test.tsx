import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { nativeWindow } from "../../../../platform/webRuntime";
import { colors } from "../../../components/ui/theme";
import { OverviewScreen } from "../OverviewScreen";
import type { WorkRow } from "../../../../core/web/app/features/personal-work/types";
import type { WorkspaceSnapshot } from "../../../../core/web/app/features/workspaces/types";

let mockRole = "head";
let mockWorkRows: WorkRow[] = [];
let mockWorkStale = false;
let mockCashDecisionsImpl: () => Promise<unknown[]> = async () => [];
let mockFinanceReviewsImpl: () => Promise<unknown[]> = async () => [];
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
    stale: mockWorkStale,
    refresh: async () => {},
  }),
}));
jest.mock("../homeFinance", () => ({
  headCashDecisions: () => mockCashDecisionsImpl(),
  assignedFinanceReviews: () => mockFinanceReviewsImpl(),
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
let mockInboxUpdates: any[] = [];
jest.mock("../../notifications/inboxUpdates", () => ({
  fetchInboxUpdatePage: async () => ({ items: mockInboxUpdates }),
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
  expect(view.getByText("Office Command Overview")).toBeOnTheScreen();
  expect(view.getByText(/Planning Office/)).toBeOnTheScreen();
  expect(view.queryByText("Appointed Office Head")).toBeNull();
  expect(
    view.getByRole("button", { name: "See all projects" }),
  ).toBeOnTheScreen();
  expect(
    view.getByLabelText("Project completion: 50%"),
  ).toBeOnTheScreen();
  expect(view.getByText("Decisions")).toBeOnTheScreen();
  expect(
    view.getByRole("button", { name: "0 work items at risk" }),
  ).toBeOnTheScreen();
  await fireEvent.press(view.getByRole("button", { name: "Bridge works" }));
  expect(navigate).toHaveBeenLastCalledWith({
    name: "project",
    id: "project-a",
    workspaceId: "workspace",
  });
  await fireEvent.press(
    view.getByRole("button", { name: "See all projects" }),
  );
  expect(navigate).toHaveBeenLastCalledWith({ name: "projects" });
  await fireEvent.press(view.getByRole("button", { name: "Office Analytics" }));
  expect(navigate).toHaveBeenLastCalledWith({ name: "reports" });
  await fireEvent.press(view.getByRole("button", { name: "Office Budget" }));
  expect(navigate).toHaveBeenLastCalledWith({ name: "budget" });
});

test("Head Home displays attention cards with category labels for pending reviews", async () => {
  mockRole = "head";
  const navigate = jest.fn();
  const reviewRow = {
    id: "review-task",
    rootId: "review-task",
    key: "review-task",
    title: "Commercial Permit Inspection",
    kind: "office-task",
    status: "for_review",
    mine: false,
    leading: false,
    actionable: false,
    history: false,
    workspaceId: "workspace",
    timezone: "Asia/Manila",
    projectTitle: "District permits",
    projectId: "project-b",
    relation: "Head",
    task: {
      id: "review-task",
      status: "for_review",
      reviewerId: "actor",
      assigneeId: "other-user",
      latestSubmission: {
        id: "submission-1",
        submitterId: "other-user",
        submittedAt: 1234567,
      },
    },
  } as unknown as WorkRow;
  mockWorkRows = [reviewRow];
  try {
    const view = await render(<OverviewScreen navigate={navigate} />);
    expect(
      await view.findByText("Commercial Permit Inspection"),
    ).toBeOnTheScreen();
    expect(view.getByText("Review required")).toBeOnTheScreen();
    expect(view.getByText("Review work · District permits")).toBeOnTheScreen();
    expect(
      view.queryByText("Action required · Review work · District permits"),
    ).toBeNull();
    await fireEvent.press(
      view.getByRole("button", { name: "Commercial Permit Inspection" }),
    );
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        view: "review",
        recordId: "submission-1",
      }),
    );
  } finally {
    mockWorkRows = [];
  }
});

test("Head Home deduplicates the leading Action required prefix while preserving its eyebrow", async () => {
  mockRole = "head";
  const navigate = jest.fn();
  const blockedTaskRow = {
    id: "blocked-task",
    rootId: "blocked-task",
    key: "blocked-task",
    title: "Clearance bottleneck",
    kind: "office-task",
    status: "in_progress",
    mine: true,
    leading: true,
    actionable: true,
    history: false,
    blocker: "Waiting on clearance",
    workspaceId: "workspace",
    timezone: "Asia/Manila",
    projectTitle: "Bridge works",
    projectId: "project-a",
    relation: "Task Lead",
    task: {
      id: "blocked-task",
      orgId: "office",
      assigneeId: "actor",
      status: "in_progress",
    },
  } as unknown as WorkRow;
  mockWorkRows = [blockedTaskRow];
  try {
    const view = await render(<OverviewScreen navigate={navigate} />);
    expect(
      await view.findAllByText("Clearance bottleneck"),
    ).toHaveLength(2);
    expect(view.getByText("Office Risks")).toBeOnTheScreen();
    expect(view.getByText("Blocked · Waiting on clearance")).toBeOnTheScreen();
    expect(view.getByText("Action required")).toBeOnTheScreen();
    expect(
      StyleSheet.flatten(view.getByText("Action required").props.style).color,
    ).toBe(colors.danger);
    expect(
      view.getByText("Blocker reported · Bridge works · Task Lead"),
    ).toBeOnTheScreen();
    expect(
      view.queryByText(
        "Action required · Blocker reported · Bridge works · Task Lead",
      ),
    ).toBeNull();
    expect(
      view.getByRole("button", { name: "1 work item at risk" }),
    ).toBeOnTheScreen();
  } finally {
    mockWorkRows = [];
  }
});

test("Member Home displays personalized command center with contributor visibility and action hierarchy", async () => {
  mockRole = "member";
  const navigate = jest.fn();
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
  mockInboxUpdates = [
    {
      id: "notif-1",
      type: "task_assigned",
      title: "New subtask assigned",
      message: "You were assigned to verify soil samples",
      read: false,
      createdAt: Date.now() - 3600_000,
    },
  ];
  try {
    const view = await render(<OverviewScreen navigate={navigate} />);
    // Section A: Personal Work Overview
    expect(view.getByText("Personal Work Overview")).toBeOnTheScreen();
    expect(view.getByText("Planning Office")).toBeOnTheScreen();
    expect(view.getByText("Overdue")).toBeOnTheScreen();
    expect(view.getByText("Due Today")).toBeOnTheScreen();
    expect(view.getByText("Awaiting")).toBeOnTheScreen();

    // Section B: Needs Your Action - both lead and contributor visible
    expect(view.getByText("Needs Your Action")).toBeOnTheScreen();
    expect(view.getByText("Road survey")).toBeOnTheScreen();
    expect(view.getByText("Review requested changes")).toBeOnTheScreen();

    expect(view.getByText("Verify inventory")).toBeOnTheScreen();
    expect(view.getByText("Open assigned task")).toBeOnTheScreen();

    // Section D: Latest Updates
    expect(view.getByText("Latest Updates")).toBeOnTheScreen();
    expect(view.getByText("New subtask assigned")).toBeOnTheScreen();

    // Section E: Waiting on Others
    expect(view.getByText("Waiting on Others")).toBeOnTheScreen();
    expect(view.getByText("Check permits")).toBeOnTheScreen();
    expect(view.getByText("Awaiting independent review")).toBeOnTheScreen();

    // Tile navigation
    await fireEvent.press(view.getByText("Overdue"));
    expect(navigate).toHaveBeenCalledWith({
      name: "personal_work",
      view: "overdue",
    });

    await fireEvent.press(view.getByText("Due Today"));
    expect(navigate).toHaveBeenCalledWith({
      name: "personal_work",
      view: "today",
    });

    await fireEvent.press(view.getByText("Awaiting"));
    expect(navigate).toHaveBeenCalledWith({
      name: "personal_work",
      view: "awaiting",
    });

    // Compact "See all ›" section header actions
    expect(
      view.getByRole("button", { name: "See all assigned work" }),
    ).toBeOnTheScreen();
    expect(
      view.getByRole("button", { name: "See all in Inbox" }),
    ).toBeOnTheScreen();
    expect(view.queryByText("Project Progress")).toBeNull();
  } finally {
    mockWorkRows = [];
    mockInboxUpdates = [];
  }
});

test("Member Home hides Waiting on Others when no items are pending review or blocked", async () => {
  mockRole = "member";
  mockWorkRows = [
    {
      id: "task-open",
      rootId: "task-open",
      key: "task-open",
      title: "Active task",
      kind: "office-task",
      status: "in_progress",
      mine: true,
      leading: true,
      actionable: true,
      history: false,
      workspaceId: "workspace",
      timezone: "Asia/Manila",
      projectTitle: "Bridge works",
      relation: "Task Lead",
      task: { id: "task-open", assigneeId: "actor" },
    } as WorkRow,
  ];
  try {
    const view = await render(<OverviewScreen navigate={jest.fn()} />);
    expect(view.getByText("Needs Your Action")).toBeOnTheScreen();
    expect(view.getByText("Active task")).toBeOnTheScreen();
    expect(view.queryByText("Waiting on Others")).toBeNull();
  } finally {
    mockWorkRows = [];
  }
});

test("Head Home keeps loaded work and cash decisions visible during stale background refresh", async () => {
  mockRole = "head";
  mockCashDecisionsImpl = async () => [
    {
      key: "cash:1",
      title: "Survey allowance",
      description: "Waiting Head authorization",
      priority: 1,
      sort: 1,
      route: { name: "accounting_releases", recordId: "req-1" },
    },
  ];
  mockWorkRows = [
    {
      id: "task-stale",
      rootId: "task-stale",
      key: "task-stale",
      title: "Drainage review",
      kind: "office-task",
      status: "for_review",
      mine: true,
      leading: true,
      actionable: true,
      history: false,
      workspaceId: "workspace",
      timezone: "Asia/Manila",
      projectTitle: "Bridge works",
      projectId: "project-a",
      relation: "Task Lead",
      task: {
        id: "task-stale",
        orgId: "office",
        assigneeId: "worker",
        reviewerId: "actor",
        status: "for_review",
        latestSubmission: { id: "s1", submitterId: "worker" },
      },
    } as unknown as WorkRow,
  ];
  try {
    const view = await render(<OverviewScreen navigate={jest.fn()} />);
    expect(await view.findByText("Survey allowance")).toBeOnTheScreen();
    expect(view.getAllByText("Drainage review").length).toBeGreaterThan(0);

    let resolveCash!: (value: unknown[]) => void;
    mockCashDecisionsImpl = () =>
      new Promise<unknown[]>((resolve) => {
        resolveCash = resolve;
      });
    mockWorkStale = true;
    await view.rerender(<OverviewScreen navigate={jest.fn()} />);
    await act(async () => {
      nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
    });

    expect(view.getByText("Survey allowance")).toBeOnTheScreen();
    expect(view.getAllByText("Drainage review").length).toBeGreaterThan(0);

    await act(async () => {
      resolveCash([
        {
          key: "cash:1",
          title: "Survey allowance",
          description: "Waiting Head authorization",
          priority: 1,
          sort: 1,
          route: { name: "accounting_releases", recordId: "req-1" },
        },
      ]);
    });
  } finally {
    mockWorkRows = [];
    mockWorkStale = false;
    mockCashDecisionsImpl = async () => [];
    mockFinanceReviewsImpl = async () => [];
  }
});
