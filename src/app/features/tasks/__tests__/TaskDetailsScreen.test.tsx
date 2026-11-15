import { expect, jest, test, describe } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { TaskDetailsScreen } from "../TaskDetailsScreen";
import { getPhilippineCalendarDate } from "../../../../core/web/app/shared/calendarDates";
jest.mock("../WorkProposalSheet", () => ({ WorkProposalReview: () => null, WorkProposalSheet: () => null }));

let mockStructureAccess: "head" | "delegated" | null = "head";
jest.mock("../../projects/ProjectTaskEditor", () => {
  const actual = jest.requireActual("../../projects/ProjectTaskEditor") as Record<string, unknown>;
  return {
    ...actual,
    useTaskStructure: () => ({
      data: mockStructureAccess,
      loading: false,
      error: null,
      refresh: jest.fn(async () => {}),
    }),
  };
});

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "lead-1", role: "head", name: "Andres Manili", org_id: "office-1" },
    organization: { id: "office-1", name: "LEDIPO" },
  }),
}));

const mockRun = jest.fn();
jest.mock("../../../shared/useAction", () => ({
  useAction: () => ({ run: mockRun, loading: false }),
}));

jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: () => ({
    on: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: jest.fn() }),
      }),
    }),
  }),
}));

let mockTreeBlocker: string | null = null;
jest.mock("../../../../core/web/app/features/nested-work/services/workTreeService", () => ({
  fetchWorkTree: jest.fn(async (id: string) => {
    const snapshot = {
      revision: 1,
      root: {
        id,
        kind: "office",
        lead: mockTreeLead,
        status: "in_progress",
        blocker: mockTreeBlocker,
        open: true,
        project: "proj-1",
        office: "office-1",
        project_status: mockProjectStatus,
        people: [],
        capabilities: mockTreeRootCreateAllowed
          ? { create_child: { allowed: true, reason_code: null } }
          : {},
      },
      nodes: [],
      people: [{ id: "lead-1", name: "Andres Manili" }],
    };
    const {
      rememberWorkCapabilityContext,
    } = require("../../../../core/web/app/features/nested-work/selectors/capabilities") as typeof import("../../../../core/web/app/features/nested-work/selectors/capabilities");
    rememberWorkCapabilityContext(snapshot as never, "lead-1");
    return snapshot;
  }),
  WorkTreeUnavailable: class WorkTreeUnavailable extends Error {},
}));

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: {
    get: jest.fn(async () => null),
  },
}));

let mockProjectStatus = "on_hold";
let mockProjectLeadId: string | null = null;
let mockTreeLead = "lead-1";
let mockTreeRootCreateAllowed = false;
let mockDependencyRows: Array<{
  id: string;
  title: string;
  status: string;
  linked_project_id?: string | null;
}> = [];
let mockTaskRow: Record<string, unknown> = {
  id: "task-1",
  title: "Prepare invitations",
  linked_project_id: "proj-1",
  assigned_to: "lead-1",
  created_by: "lead-1",
  status: "in_progress",
  priority: "high",
  start_date: "2026-11-11",
  due_date: "2026-11-12",
  dependency_ids: [] as string[],
  completed_at: null,
  archived_at: null,
  deleted_at: null,
  org_id: "office-1",
};

jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    removeChannel: jest.fn(),
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          is: () => ({
            single: async () => ({ data: mockTaskRow, error: null }),
          }),
          maybeSingle: async () => {
            if (table === "projects") {
              return {
                data: {
                  status: mockProjectStatus,
                  project_lead_id: mockProjectLeadId,
                  title: "Test Project",
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
        in: () => ({
          is: async () => ({ data: mockDependencyRows, error: null }),
        }),
      }),
    }),
  },
}));

describe("TaskDetailsScreen with on-hold projects", () => {
  test("renders BentoProjectOnHoldCard and hides work action buttons when project is on hold", async () => {
    mockProjectStatus = "on_hold";

    const view = await render(
      <TaskDetailsScreen
        id="task-1"
        projectId="proj-1"
        navigate={jest.fn()}
      />,
    );

    // Expect Project on hold warning banner
    expect(await view.findByText("Project on hold")).toBeOnTheScreen();
    expect(view.getByText("Work actions unavailable")).toBeOnTheScreen();
    expect(
      view.getByText("Work updates are paused while the project is under review."),
    ).toBeOnTheScreen();

    // Expect work action buttons NOT to be rendered
    expect(view.queryByText("Update progress")).toBeNull();
    expect(view.queryByText("Mark as complete")).toBeNull();
  });

  test("renders action buttons when project is active", async () => {
    mockProjectStatus = "active";
    mockTaskRow.status = "in_progress";

    const view = await render(
      <TaskDetailsScreen
        id="task-1"
        projectId="proj-1"
        navigate={jest.fn()}
      />,
    );

    // Expect work action buttons to be rendered for active project
    expect(await view.findByText("Update progress")).toBeOnTheScreen();
    expect(view.getByText("Mark as complete")).toBeOnTheScreen();

    // Expect Project on hold banner NOT to be rendered
    expect(view.queryByText("Project on hold")).toBeNull();
  });

  test.each([
    ["todo", "Start work"],
    ["changes_requested", "Resume work"],
  ])("shows only %s's opening action before execution", async (status, label) => {
    mockProjectStatus = "active";
    mockTaskRow.status = status;
    mockTaskRow.start_date = getPhilippineCalendarDate();
    const view = await render(<TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />);
    expect(await view.findByText(label)).toBeOnTheScreen();
    expect(view.queryByText("Update progress")).toBeNull();
    expect(view.queryByText("Mark as complete")).toBeNull();
  });

  test("places compact Edit button beside title when authorized, even on hold, and omits Planning on eFlow Web and bottom Edit task", async () => {
    mockStructureAccess = "head";
    mockProjectStatus = "on_hold";
    mockTaskRow.status = "in_progress";
    mockTaskRow.dependency_ids = [];
    mockTreeBlocker = null;

    const view = await render(
      <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
    );

    const editBtn = await view.findByRole("button", { name: "Edit task" });
    expect(editBtn).toBeOnTheScreen();
    expect(view.getByText("Edit")).toBeOnTheScreen();
    expect(view.queryByText("Planning on eFlow Web")).toBeNull();
    expect(view.queryByText("Edit task")).toBeNull();
    expect(view.queryByText("DEPENDENCIES")).toBeNull();
    expect(view.queryByText("WORK BLOCKED")).toBeNull();

    // Tapping Edit opens ProjectTaskEditor with context-specific Save task button
    await fireEvent.press(editBtn);
    expect(await view.findByRole("button", { name: "Save task" })).toBeOnTheScreen();
  });

  test("hides Edit button when user is not authorized to edit task", async () => {
    mockStructureAccess = null;
    mockProjectStatus = "active";
    mockTaskRow.status = "in_progress";

    const view = await render(
      <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
    );

    expect(await view.findByText("Prepare invitations")).toBeOnTheScreen();
    expect(view.queryByRole("button", { name: "Edit task" })).toBeNull();
    expect(view.queryByText("Planning on eFlow Web")).toBeNull();
  });

  test("renders conditional Dependencies and Work blocked cards when present", async () => {
    mockStructureAccess = "head";
    mockProjectStatus = "active";
    mockTaskRow.status = "in_progress";
    mockTaskRow.dependency_ids = ["dep-1"];
    mockDependencyRows = [
      { id: "dep-1", title: "Secure permit", status: "completed", linked_project_id: "proj-1" },
    ];
    mockTreeBlocker = "Waiting for venue clearance";

    const view = await render(
      <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
    );

    expect(await view.findByText("DEPENDENCIES")).toBeOnTheScreen();
    expect(view.getByText("1 of 1 complete")).toBeOnTheScreen();
    expect(view.getByText("Secure permit")).toBeOnTheScreen();
    expect(view.getByText("WORK BLOCKED")).toBeOnTheScreen();
    expect(view.getByText("Waiting for venue clearance")).toBeOnTheScreen();
  });

  test("gates Mark as complete and shows a readiness notice when a task prerequisite is incomplete", async () => {
    mockStructureAccess = "head";
    mockProjectStatus = "active";
    mockTaskRow.status = "in_progress";
    mockTaskRow.dependency_ids = ["dep-pending"];
    mockDependencyRows = [
      {
        id: "dep-pending",
        title: "Approve site plan",
        status: "in_progress",
        linked_project_id: "proj-1",
      },
    ];
    mockTreeBlocker = null;

    const view = await render(
      <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
    );

    expect(await view.findByText("Update progress")).toBeOnTheScreen();
    expect(view.queryByText("Mark as complete")).toBeNull();
    expect(
      view.getByText(
        "Complete all task prerequisites before marking this task complete.",
      ),
    ).toBeOnTheScreen();
    mockTaskRow.dependency_ids = [];
    mockDependencyRows = [];
  });

  test("displays Stuck in the task status strip when an active task has a blocker, and In progress when cleared", async () => {
    mockStructureAccess = "head";
    mockProjectStatus = "active";
    mockTaskRow.status = "in_progress";
    mockTaskRow.dependency_ids = [];
    mockDependencyRows = [];
    mockTreeBlocker = "Awaiting engineering sign-off";

    const view = await render(
      <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
    );

    expect(await view.findByText("Stuck")).toBeOnTheScreen();
    expect(view.queryByText("In progress")).toBeNull();

    mockTreeBlocker = null;
    const clearedView = await render(
      <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
    );
    expect(await clearedView.findByText("In progress")).toBeOnTheScreen();
    expect(clearedView.queryByText("Stuck")).toBeNull();
  });

  test("blocks non-Task-Lead Project Lead from adding subtasks or executing work in active projects while allowing planning subtask creation", async () => {
    const prevAssignee = mockTaskRow.assigned_to;
    try {
      mockStructureAccess = null;
      mockProjectStatus = "active";
      mockProjectLeadId = "lead-1";
      mockTreeLead = "other-task-lead";
      mockTreeRootCreateAllowed = true;
      mockTaskRow.status = "in_progress";
      mockTaskRow.assigned_to = "other-task-lead";
      mockTaskRow.team_member_ids = [];
      mockTaskRow.dependency_ids = [];
      mockDependencyRows = [];
      mockTreeBlocker = null;

      const activeView = await render(
        <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
      );
      expect(await activeView.findByText("Prepare invitations")).toBeOnTheScreen();
      expect(activeView.queryByText("Update progress")).toBeNull();
      expect(activeView.queryByText("Mark as complete")).toBeNull();
      expect(activeView.queryByText("Submit for review")).toBeNull();
      expect(activeView.queryByRole("button", { name: "Add subtask" })).toBeNull();
      activeView.unmount();

      mockProjectStatus = "planning";
      const planningView = await render(
        <TaskDetailsScreen id="task-1" projectId="proj-1" navigate={jest.fn()} />,
      );
      expect(await planningView.findByRole("button", { name: "Add subtask" })).toBeOnTheScreen();
      expect(planningView.queryByText("Update progress")).toBeNull();
      expect(planningView.queryByText("Mark as complete")).toBeNull();
      expect(planningView.queryByText("Submit for review")).toBeNull();
    } finally {
      mockTaskRow.assigned_to = prevAssignee;
      mockProjectLeadId = null;
      mockTreeLead = "lead-1";
      mockTreeRootCreateAllowed = false;
    }
  });
});
