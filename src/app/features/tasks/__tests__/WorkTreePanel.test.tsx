import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import { WorkTreePanel } from "../WorkTreePanel";
import { ToastProvider } from "../../../components/ui/Toast";
import { fetchWorkTree } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import { sharedWorkRpc } from "../../../shared/sharedWorkRequest";

jest.mock("../../../../core/web/app/features/nested-work/services/workTreeService", () => ({
  fetchWorkTree: jest.fn(),
}));
jest.mock("../../../shared/sharedWorkRequest", () => ({ sharedWorkRpc: jest.fn() }));

jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "lead" } }),
}));
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../WorkProposalSheet", () => ({ WorkProposalReview: () => null, WorkProposalSheet: () => null }));
jest.mock("../OfficeSubitemUpdateSheet", () => ({
  OfficeSubitemUpdateSheet: () => null,
}));
jest.mock("../SubtaskCompletionSheet", () => ({
  SubtaskCompletionSheet: () => null,
}));
jest.mock("../WorkEditorSheet", () => {
  const actual = jest.requireActual("../WorkEditorSheet") as Record<string, unknown>;
  return {
    ...actual,
    WorkEditorSheet: ({
      edit,
      readOnly,
    }: {
      edit?: { command?: string };
      readOnly?: boolean;
    }) => {
      const { Text } = require("react-native");
      return (
        <Text testID="mock-work-editor">
          {`editor:${edit?.command ?? "none"}:${String(Boolean(readOnly))}`}
        </Text>
      );
    },
  };
});
jest.mock("../OfficeSubitemActivity", () => ({
  OfficeSubitemActivity: ({ nodeId }: { nodeId: string }) => {
    const { Text } = require("react-native");
    return <Text>Activity for {nodeId}</Text>;
  },
}));

test("a confirmed start updates the status while refresh is pending and refreshed fields win", async () => {
  const tree = {
    revision: 1,
    root: {
      kind: "office", id: "root", project: "project", office: "office", lead: "lead",
      open: true, status: "in_progress", scheduling: { version: 1, today: "2026-11-14" },
    },
    nodes: [{
      id: "node", task_id: "root", parent_subtask_id: null, title: "Prepare submission",
      lead_id: "lead", assigned_to_ids: [], status: "todo", effective_status: "todo",
      dependency_ids: [], priority: "low", start_date: "2026-11-13",
      due_date: "2026-11-17T17:00:00Z",
    }],
    people: [],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(tree, "lead");
  const refreshed = {
    ...tree,
    nodes: [{
      ...tree.nodes[0],
      effective_status: "in_progress", started_at: "2026-11-14T01:00:00Z",
      priority: "urgent", due_date: "2026-11-19",
    }],
  };
  let finishRefresh: (value: WorkTreeSnapshot) => void = () => {};
  jest.mocked(fetchWorkTree).mockResolvedValueOnce(tree).mockReturnValueOnce(
    new Promise((resolve) => { finishRefresh = resolve; }),
  );
  jest.mocked(sharedWorkRpc).mockResolvedValueOnce({
    id: "node", started_at: "2026-11-14T01:00:00Z",
  });
  const onSaved = jest.fn(async (_snapshot: WorkTreeSnapshot) => {});
  const panel = (data: WorkTreeSnapshot) => (
    <ToastProvider>
      <WorkTreePanel data={data} focusNodeId="node" onSaved={onSaved} navigate={jest.fn()} />
    </ToastProvider>
  );
  const view = await render(panel(tree));
  expect(screen.getByLabelText("Status: To Do")).toBeOnTheScreen();
  expect(screen.getByLabelText("Priority: Low")).toBeOnTheScreen();
  expect(screen.getByText("Low")).toBeOnTheScreen();
  expect(screen.queryByText("Low priority")).toBeNull();
  expect(screen.getByText("Nov 13, 2026")).toBeOnTheScreen();
  expect(screen.getByText("Nov 18, 2026")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Start work"));
  expect(await screen.findByLabelText("Status: In progress")).toBeOnTheScreen();
  expect(await screen.findByText("Subtask started.")).toBeOnTheScreen();
  expect(screen.queryByText("Start work")).toBeNull();
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => { finishRefresh(refreshed); });
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(refreshed));
  await view.rerender(panel(refreshed));
  expect(screen.getByLabelText("Priority: Urgent")).toBeOnTheScreen();
  expect(screen.getByText("Urgent")).toBeOnTheScreen();
  expect(screen.queryByText("Urgent priority")).toBeNull();
  expect(screen.getByText("Nov 19, 2026")).toBeOnTheScreen();
  await view.unmount();
  await render(panel(refreshed));
  expect(screen.getByLabelText("Status: In progress")).toBeOnTheScreen();
  expect(screen.getByLabelText("Priority: Urgent")).toBeOnTheScreen();
  expect(screen.getByText("Urgent")).toBeOnTheScreen();
  expect(screen.getByText("Nov 13, 2026")).toBeOnTheScreen();
  expect(screen.getByText("Nov 19, 2026")).toBeOnTheScreen();
});

test("a linked Subtask navigates supporting boxes to dedicated subpages and exposes Branch actions in top actions", async () => {
  const nodeId = "linked-subtask";
  const tree = {
    revision: 1,
    root: {
      id: "task",
      kind: "office",
      project: "project",
      office: "office",
      lead: "lead",
      open: true,
      status: "in_progress",
    },
    nodes: [
      {
        id: nodeId,
        task_id: "task",
        title: "Linked Subtask",
        status: "todo",
        effective_status: "todo",
        lead_id: "lead",
        parent_subtask_id: null,
        assigned_to_ids: [],
        dependency_ids: [],
        capabilities: {
          appoint_lead: { allowed: true, reason_code: null },
          manage_contributors: { allowed: true, reason_code: null },
          edit_details: { allowed: true, reason_code: null },
          create_child: { allowed: true, reason_code: null },
        },
      },
    ],
    people: [],
  } as unknown as WorkTreeSnapshot;
  rememberWorkCapabilityContext(tree, "lead");
  const navigate = jest.fn();

  await render(
    <WorkTreePanel
      data={tree}
      focusNodeId={nodeId}
      onSaved={async () => {}}
      navigate={navigate}
    />,
  );

  expect(screen.queryByText(/Activity for/)).toBeNull();
  expect(screen.queryByText("Subtask funding")).toBeNull();

  await fireEvent.press(
    screen.getByRole("button", { name: "Activity, Updates & history" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Evidence & review, Submissions" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Funding, Financial records" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Files, Attachments" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Planning details, Additional fields" }),
  );

  expect(navigate).toHaveBeenNthCalledWith(1, {
    name: "task",
    id: "task",
    projectId: "project",
    nodeId,
    view: "activity",
    title: "Activity",
  });
  expect(navigate).toHaveBeenNthCalledWith(2, {
    name: "task",
    id: "task",
    projectId: "project",
    nodeId,
    view: "review",
    title: "Evidence & review",
  });
  expect(navigate).toHaveBeenNthCalledWith(3, {
    name: "task",
    id: "task",
    projectId: "project",
    nodeId,
    view: "budget",
    title: "Funding",
  });
  expect(navigate).toHaveBeenNthCalledWith(4, {
    name: "task",
    id: "task",
    projectId: "project",
    nodeId,
    view: "files",
    title: "Files",
  });
  expect(navigate).toHaveBeenNthCalledWith(5, {
    name: "task",
    id: "task",
    projectId: "project",
    nodeId,
    view: "planning",
    title: "Planning details",
  });

  const branchActionsBtn = screen.getByRole("button", { name: "Branch actions" });
  expect(branchActionsBtn).toBeOnTheScreen();
  await fireEvent.press(branchActionsBtn);
  expect(screen.getAllByText("Branch actions").length).toBeGreaterThanOrEqual(2);
});

test("when project is on hold, Subtask Details renders BentoProjectOnHoldCard and hides work actions", async () => {
  const nodeId = "subtask-1";
  const tree = {
    revision: 1,
    root: {
      id: "task-1",
      kind: "office",
      lead: "task-lead",
      status: "in_progress",
      open: true,
      project: "proj-1",
      project_status: "on_hold",
    },
    nodes: [
      {
        id: nodeId,
        task_id: "task-1",
        title: "Prepare invitations",
        status: "todo",
        lead_id: "lead",
        parent_subtask_id: null,
        assigned_to_ids: [],
      },
    ],
    people: [{ id: "lead", name: "Andres Manili" }],
  } as unknown as WorkTreeSnapshot;

  const view = await render(
    <WorkTreePanel
      data={tree}
      focusNodeId={nodeId}
      projectOnHold={true}
      projectStatus="on_hold"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );

  // Expect On-Hold card to be visible
  expect(view.getByText("Project on hold")).toBeOnTheScreen();
  expect(view.getByText("Work actions unavailable")).toBeOnTheScreen();

  // Expect action buttons NOT to be rendered
  expect(view.queryByText("Update work")).toBeNull();
  expect(view.queryByText("Mark as complete")).toBeNull();
  expect(view.queryByText("Submit for review")).toBeNull();
});

test.each([
  ["todo", true],
  ["todo", false],
  ["in_progress", true],
] as const)("gates Subtask actions when the parent is %s and appointment is %s", async (status, appointed) => {
  const nodeId = "subtask-1";
  const tree = {
    revision: 1,
    root: {
      id: "task-1",
      kind: "office",
      lead: appointed ? "lead" : "other",
      status,
      open: true,
      project: "proj-1",
      office: "office-1",
      project_status: "active",
      capabilities: {},
    },
    nodes: [
      {
        id: nodeId,
        task_id: "task-1",
        title: "Prepare invitations",
        status: "todo",
        lead_id: appointed ? "lead" : "other",
        started_at: status === "in_progress" ? "2026-11-13T00:00:00Z" : null,
        parent_subtask_id: null,
        assigned_to_ids: [],
        capabilities: {
          execute: { allowed: true, reason_code: null },
          submit: { allowed: true, reason_code: null },
        },
      },
    ],
    people: [{ id: "lead", name: "Andres Manili" }],
  } as unknown as WorkTreeSnapshot;

  rememberWorkCapabilityContext(tree, "lead");

  const navigate = jest.fn();
  const view = await render(
    <WorkTreePanel
      data={tree}
      focusNodeId={nodeId}
      projectOnHold={false}
      projectStatus="active"
      onSaved={async () => {}}
      navigate={navigate}
    />,
  );

  if (status === "todo") {
    if (appointed) {
      expect(view.getByText("Waiting for the parent task")).toBeOnTheScreen();
      expect(
        view.getByText(
          "You're the Task Lead. Start the parent task first before you can update or complete this subtask.",
        ),
      ).toBeOnTheScreen();
      await fireEvent.press(view.getByRole("button", { name: "Go to Task details" }));
      expect(navigate).toHaveBeenCalledWith({
        name: "task",
        id: "task-1",
        projectId: "proj-1",
        title: "Task details",
      });
    } else {
      expect(view.queryByText("Waiting for the parent task")).toBeNull();
    }
    expect(view.queryByText("Update work")).toBeNull();
    expect(view.queryByText("Mark as complete")).toBeNull();
  } else {
    expect(view.queryByText("Waiting for the parent task")).toBeNull();
    expect(view.getByLabelText("Status: In progress")).toBeOnTheScreen();
    expect(view.getByLabelText("Priority: —")).toBeOnTheScreen();
    expect(view.getByText("Update work")).toBeOnTheScreen();
    expect(view.getByText("Mark as complete")).toBeOnTheScreen();
  }

  // Expect On-Hold card NOT to be rendered
  expect(view.queryByText("Project on hold")).toBeNull();
});

test("Subtask Details renders compact Edit button when authorized even when project is on hold, keeping execution locked", async () => {
  const nodeId = "subtask-1";
  const tree = {
    revision: 1,
    root: {
      id: "task-1",
      kind: "office",
      lead: "lead",
      status: "in_progress",
      open: true,
      project: "proj-1",
      office: "office-1",
      project_status: "on_hold",
      capabilities: {
        create_child: { allowed: true, reason_code: null },
      },
    },
    nodes: [
      {
        id: "subtask-0",
        task_id: "task-1",
        title: "First step",
        status: "completed",
        lead_id: "lead",
        parent_subtask_id: null,
        sibling_order: 0,
        position: 0,
        is_standalone: false,
        assigned_to_ids: [],
        capabilities: {},
      },
      {
        id: nodeId,
        task_id: "task-1",
        title: "Second step",
        dependency_ids: null,
        status: "todo",
        blocker: "Blocked by missing memo",
        lead_id: "lead",
        parent_subtask_id: null,
        sibling_order: 1,
        position: 1,
        is_standalone: false,
        assigned_to_ids: [],
        capabilities: {
          edit_details: { allowed: true, reason_code: null },
          execute: { allowed: true, reason_code: null },
        },
      },
    ],
    people: [{ id: "lead", name: "Andres Manili" }],
  } as unknown as WorkTreeSnapshot;

  rememberWorkCapabilityContext(tree, "lead");

  const view = await render(
    <WorkTreePanel
      data={tree}
      focusNodeId={nodeId}
      projectOnHold={true}
      projectStatus="on_hold"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );

  // Project on hold blocks execution actions, while Edit remains enabled for planning
  expect(view.getByText("Project on hold")).toBeOnTheScreen();
  expect(view.queryByText("Update work")).toBeNull();
  const editBtn = view.getByRole("button", { name: "Edit subtask" });
  expect(editBtn).toBeOnTheScreen();
  expect(view.getByText("Edit")).toBeOnTheScreen();

  // Sequential prerequisite sibling renders as Dependencies + Work blocked renders
  expect(view.getByText("DEPENDENCIES")).toBeOnTheScreen();
  expect(view.getByText("First step")).toBeOnTheScreen();
  expect(view.getByText("WORK BLOCKED")).toBeOnTheScreen();
  expect(view.getByText("Blocked by missing memo")).toBeOnTheScreen();

  // Tapping Edit opens WorkEditorSheet in non-readOnly planning mode even while on hold
  await fireEvent.press(editBtn);
  expect(view.getByTestId("mock-work-editor")).toHaveTextContent("editor:edit:false");
});

test("Subtask Details hides Edit button when user lacks edit_details capability", async () => {
  const nodeId = "subtask-locked";
  const tree = {
    revision: 1,
    root: {
      id: "task-1",
      kind: "office",
      lead: "other-lead",
      status: "in_progress",
      open: true,
      project: "proj-1",
      office: "office-1",
      project_status: "active",
      capabilities: {},
    },
    nodes: [
      {
        id: nodeId,
        task_id: "task-1",
        title: "Readonly subtask",
        status: "in_progress",
        lead_id: "other-lead",
        parent_subtask_id: null,
        sibling_order: 0,
        position: 0,
        is_standalone: true,
        assigned_to_ids: ["lead"],
        capabilities: {
          edit_details: { allowed: false, reason_code: "branch_denied" },
        },
      },
    ],
    people: [{ id: "other-lead", name: "Maria Clara" }],
  } as unknown as WorkTreeSnapshot;

  rememberWorkCapabilityContext(tree, "lead");

  const view = await render(
    <WorkTreePanel
      data={tree}
      focusNodeId={nodeId}
      projectOnHold={false}
      projectStatus="active"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );

  expect(view.queryByRole("button", { name: "Edit subtask" })).toBeNull();
  expect(view.queryByText("DEPENDENCIES")).toBeNull();
  expect(view.queryByText("WORK BLOCKED")).toBeNull();
});

test("workEditorActionLabel returns context-specific labels instead of generic placeholders", () => {
  const { workEditorActionLabel } = require("../WorkEditorSheet") as typeof import("../WorkEditorSheet");
  expect(workEditorActionLabel("create")).toBe("Add subtask");
  expect(workEditorActionLabel("edit")).toBe("Save subtask");
  expect(workEditorActionLabel("progress")).toBe("Post update");
  expect(workEditorActionLabel("delete")).toBe("Delete subtask");
  expect(workEditorActionLabel("staff")).toBe("Save team");
  expect(workEditorActionLabel("review", 100)).toBe("Approve subtask");
  expect(workEditorActionLabel("review", 60)).toBe("Request changes");
});

test("gates Subtask completion when child subtasks or prerequisite subtasks are incomplete", async () => {
  const treeWithIncompleteChild = {
    revision: 1,
    root: {
      id: "task-1",
      kind: "office",
      lead: "lead",
      status: "in_progress",
      open: true,
      project: "proj-1",
      office: "office-1",
      project_status: "active",
      capabilities: {},
    },
    nodes: [
      {
        id: "parent-sub",
        task_id: "task-1",
        title: "Parent subtask",
        status: "in_progress",
        started_at: "2026-11-13T00:00:00Z",
        lead_id: "lead",
        parent_subtask_id: null,
        sibling_order: 0,
        position: 0,
        is_standalone: true,
        dependency_ids: [],
        assigned_to_ids: [],
        capabilities: {
          execute: { allowed: true, reason_code: null },
          submit: { allowed: true, reason_code: null },
        },
      },
      {
        id: "child-sub",
        task_id: "task-1",
        title: "Child subtask",
        status: "in_progress",
        started_at: "2026-11-13T00:00:00Z",
        lead_id: "lead",
        parent_subtask_id: "parent-sub",
        sibling_order: 0,
        position: 0,
        is_standalone: true,
        dependency_ids: [],
        assigned_to_ids: [],
        capabilities: {},
      },
    ],
    people: [{ id: "lead", name: "Andres Manili" }],
  } as unknown as WorkTreeSnapshot;

  rememberWorkCapabilityContext(treeWithIncompleteChild, "lead");

  const view = await render(
    <WorkTreePanel
      data={treeWithIncompleteChild}
      focusNodeId="parent-sub"
      projectOnHold={false}
      projectStatus="active"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );

  expect(view.getByText("Update work")).toBeOnTheScreen();
  expect(view.queryByText("Mark as complete")).toBeNull();
  expect(
    view.getByText(
      "Complete all child subtasks before marking or submitting this subtask as complete.",
    ),
  ).toBeOnTheScreen();
});

test("WorkTreePanel renders Stuck status for active subtasks with an active blocker and returns to In progress when cleared", async () => {
  const treeWithBlocker = {
    revision: 1,
    root: {
      id: "task-1",
      kind: "office",
      lead: "lead",
      status: "in_progress",
      open: true,
      project: "proj-1",
      office: "office-1",
      project_status: "active",
      capabilities: {},
    },
    nodes: [
      {
        id: "sub-blocked",
        task_id: "task-1",
        title: "Foundation pouring",
        status: "in_progress",
        blocker: "Waiting on cement delivery",
        started_at: "2026-11-13T00:00:00Z",
        lead_id: "lead",
        parent_subtask_id: null,
        sibling_order: 0,
        position: 0,
        is_standalone: true,
        dependency_ids: [],
        assigned_to_ids: [],
        capabilities: {},
      },
    ],
    people: [{ id: "lead", name: "Andres Manili" }],
  } as unknown as WorkTreeSnapshot;

  rememberWorkCapabilityContext(treeWithBlocker, "lead");

  const view = await render(
    <WorkTreePanel
      data={treeWithBlocker}
      focusNodeId="sub-blocked"
      projectOnHold={false}
      projectStatus="active"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );

  expect(view.getAllByText("Stuck").length).toBeGreaterThan(0);
  expect(view.queryByText("In progress")).toBeNull();

  const clearedTree = {
    ...treeWithBlocker,
    revision: 2,
    nodes: [{ ...treeWithBlocker.nodes[0], blocker: null }],
  } as unknown as WorkTreeSnapshot;

  const clearedView = await render(
    <WorkTreePanel
      data={clearedTree}
      focusNodeId="sub-blocked"
      projectOnHold={false}
      projectStatus="active"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );

  expect(clearedView.queryByText("Stuck")).toBeNull();
  expect(clearedView.getAllByText("In progress").length).toBeGreaterThan(0);
});

test("Project Lead cannot assign subtask people or update/complete subtasks on an active project when not Lead or Contributor, but retains staffing in planning", async () => {
  const activeTree = {
    revision: 1,
    root: {
      id: "task-1",
      kind: "office",
      lead: "other-task-lead",
      status: "in_progress",
      open: true,
      project: "proj-1",
      office: "office-1",
      capabilities: {
        create_child: { allowed: true, reason_code: null },
      },
    },
    nodes: [
      {
        id: "sub-1",
        task_id: "task-1",
        title: "Prepare briefing",
        status: "in_progress",
        started_at: "2026-11-13T00:00:00Z",
        lead_id: "other-sub-lead",
        parent_subtask_id: null,
        sibling_order: 0,
        position: 0,
        is_standalone: true,
        dependency_ids: [],
        assigned_to_ids: ["other-sub-lead", "worker-1"],
        capabilities: {
          appoint_lead: { allowed: true, reason_code: null },
          manage_contributors: { allowed: true, reason_code: null },
          edit_details: { allowed: true, reason_code: null },
          create_child: { allowed: true, reason_code: null },
          execute: { allowed: true, reason_code: null },
          submit: { allowed: true, reason_code: null },
        },
      },
    ],
    people: [
      { id: "lead", name: "Project Lead" },
      { id: "other-sub-lead", name: "Sub Lead" },
      { id: "worker-1", name: "Worker" },
    ],
  } as unknown as WorkTreeSnapshot;

  rememberWorkCapabilityContext(activeTree, "lead");

  // Active project: non-Lead / non-Contributor Project Lead is blocked from staffing AND execution
  const activeView = await render(
    <WorkTreePanel
      data={activeTree}
      focusNodeId="sub-1"
      projectStatus="active"
      projectLeadId="lead"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );
  expect(activeView.queryByText("Choose people")).toBeNull();
  expect(activeView.queryByRole("button", { name: "Edit subtask" })).toBeNull();
  expect(activeView.queryByText("Add subtask")).toBeNull();
  expect(activeView.queryByText("Update work")).toBeNull();
  expect(activeView.queryByText("Mark as complete")).toBeNull();
  expect(activeView.queryByText("Submit for review")).toBeNull();
  activeView.unmount();

  // Root list on active project also hides Add subtask for non-Task-Lead Project Lead
  const activeRootView = await render(
    <WorkTreePanel
      data={activeTree}
      projectStatus="active"
      projectLeadId="lead"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );
  expect(activeRootView.queryByText("Add subtask")).toBeNull();
  activeRootView.unmount();

  // Planning project: Project Lead still can choose people / edit / add child subtasks,
  // while execution/completion still remains restricted to Leads and Contributors
  const planningView = await render(
    <WorkTreePanel
      data={activeTree}
      focusNodeId="sub-1"
      projectStatus="planning"
      projectLeadId="lead"
      onSaved={async () => {}}
      navigate={jest.fn()}
    />,
  );
  expect(await planningView.findByText("Choose people")).toBeOnTheScreen();
  expect(planningView.getByRole("button", { name: "Edit subtask" })).toBeOnTheScreen();
  expect(planningView.queryByText("Update work")).toBeNull();
  expect(planningView.queryByText("Mark as complete")).toBeNull();
  expect(planningView.queryByText("Submit for review")).toBeNull();
});
