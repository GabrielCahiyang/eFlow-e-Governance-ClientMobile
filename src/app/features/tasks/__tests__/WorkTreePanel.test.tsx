import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import { rememberWorkCapabilityContext } from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import { WorkTreePanel } from "../WorkTreePanel";

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

test("a linked Subtask renders keyed funding alongside Activity without a duplicate key", async () => {
  const nodeId = "linked-subtask";
  const tree = {
    revision: 1,
    root: { id: "task", kind: "office", lead: "lead", status: "in_progress" },
    nodes: [
      {
        id: nodeId,
        task_id: "task",
        title: "Linked Subtask",
        status: "todo",
        lead_id: "lead",
        parent_subtask_id: null,
        assigned_to_ids: [],
      },
    ],
    people: [],
  } as unknown as WorkTreeSnapshot;
  const errors = jest.spyOn(console, "error");
  try {
    await render(
      <WorkTreePanel
        data={tree}
        focusNodeId={nodeId}
        funding={<Text key={nodeId}>Subtask funding</Text>}
        onSaved={async () => {}}
        navigate={jest.fn()}
      />,
    );
    expect(screen.getByText("Subtask funding")).toBeOnTheScreen();
    expect(screen.getByText(`Activity for ${nodeId}`)).toBeOnTheScreen();
    expect(errors).not.toHaveBeenCalledWith(
      expect.stringContaining("Encountered two children with the same key"),
      nodeId,
    );
  } finally {
    errors.mockRestore();
  }
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

  if (status === "todo") {
    if (appointed) expect(view.getByText("Waiting for the parent task")).toBeOnTheScreen();
    else expect(view.queryByText("Waiting for the parent task")).toBeNull();
    expect(view.queryByText("Update work")).toBeNull();
    expect(view.queryByText("Mark as complete")).toBeNull();
  } else {
    expect(view.queryByText("Waiting for the parent task")).toBeNull();
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
