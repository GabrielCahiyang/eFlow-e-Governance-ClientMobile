import { expect, test } from "@jest/globals";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import {
  canCreateSubtaskDependencies,
  canEditSubtaskDependencies,
  legacySiblingDependencyIds,
  subtaskDependencyScheduleError,
  subtaskDependencyWouldCycle,
  subtaskPrerequisiteSiblings,
  supportsSubtaskDependencies,
} from "../subtaskDependencies";

function makeTree(overrides: Record<string, unknown> = {}): WorkTreeSnapshot {
  return {
    root: {
      id: "task-1",
      kind: "office",
      office: "office-1",
      project: "project-1",
      open: true,
      people: [],
    },
    revision: 1,
    supportsSubtaskDependencies: true,
    nodes: [],
    people: [],
    ...overrides,
  } as unknown as WorkTreeSnapshot;
}

test("supportsSubtaskDependencies and canCreateSubtaskDependencies respect Office scope", () => {
  const officeTree = makeTree({
    nodes: [
      { id: "s1", task_id: "task-1", parent_subtask_id: null, title: "Step 1", sibling_order: 0, status: "todo", can_edit_dependencies: true },
    ],
  });
  expect(supportsSubtaskDependencies(officeTree)).toBe(true);
  expect(canCreateSubtaskDependencies(officeTree)).toBe(true);

  const personalTree = makeTree({
    root: { id: "task-p", kind: "personal", office: null, project: null, open: true, people: [] },
  });
  expect(supportsSubtaskDependencies(personalTree)).toBe(false);
  expect(canCreateSubtaskDependencies(personalTree)).toBe(false);

  const outOfScopeTree = makeTree({
    nodes: [
      { id: "s1", task_id: "task-1", parent_subtask_id: null, title: "Step 1", sibling_order: 0, status: "todo", can_edit_dependencies: false },
    ],
  });
  expect(canCreateSubtaskDependencies(outOfScopeTree)).toBe(false);
});

test("canEditSubtaskDependencies checks status, start state, progress, and hidden dependencies", () => {
  const editableNode = {
    id: "s1",
    task_id: "task-1",
    parent_subtask_id: null,
    title: "Editable",
    sibling_order: 0,
    status: "todo",
    can_edit_dependencies: true,
    dependency_ids: [],
  };
  const tree = makeTree({ nodes: [editableNode] });
  expect(canEditSubtaskDependencies(tree, editableNode as never)).toBe(true);
  expect(canEditSubtaskDependencies(tree, { ...editableNode, started_at: "2026-11-10T00:00:00Z" } as never)).toBe(false);
  expect(canEditSubtaskDependencies(tree, { ...editableNode, status: "in_progress" } as never)).toBe(false);
  expect(canEditSubtaskDependencies(tree, { ...editableNode, percent_complete: 25 } as never)).toBe(false);

  const hiddenDepNode = { ...editableNode, dependency_ids: ["hidden-id"] };
  expect(canEditSubtaskDependencies(makeTree({ nodes: [hiddenDepNode] }), hiddenDepNode as never)).toBe(false);
});

test("subtaskPrerequisiteSiblings and legacySiblingDependencyIds scope to siblings cleanly", () => {
  const nodes = [
    { id: "a", task_id: "task-1", parent_subtask_id: null, title: "A", sibling_order: 0, status: "completed", is_standalone: false },
    { id: "b", task_id: "task-1", parent_subtask_id: null, title: "B", sibling_order: 1, status: "todo", is_standalone: false },
    { id: "c", task_id: "task-1", parent_subtask_id: null, title: "C", sibling_order: 2, status: "cancelled", is_standalone: false },
    { id: "d", task_id: "task-1", parent_subtask_id: null, title: "D", sibling_order: 3, status: "todo", is_standalone: false, dependency_ids: null },
    { id: "child", task_id: "task-1", parent_subtask_id: "a", title: "Nested", sibling_order: 0, status: "todo", is_standalone: false },
  ];
  const tree = makeTree({ nodes });
  expect(subtaskPrerequisiteSiblings(tree, null, "d").map((item) => item.id)).toEqual(["a", "b"]);
  expect(legacySiblingDependencyIds(tree, nodes[3] as never)).toEqual(["a", "b"]);
  expect(legacySiblingDependencyIds(tree, { ...nodes[3], is_standalone: true } as never)).toEqual([]);
});

test("subtaskDependencyWouldCycle catches direct, transitive, and legacy sequential loops", () => {
  const explicitNodes = [
    { id: "a", task_id: "task-1", parent_subtask_id: null, sibling_order: 0, status: "todo", dependency_ids: [] },
    { id: "b", task_id: "task-1", parent_subtask_id: null, sibling_order: 1, status: "todo", dependency_ids: ["a"] },
    { id: "c", task_id: "task-1", parent_subtask_id: null, sibling_order: 2, status: "todo", dependency_ids: ["b"] },
    { id: "d", task_id: "task-1", parent_subtask_id: null, sibling_order: 3, status: "todo", dependency_ids: [] },
  ] as never[];

  expect(subtaskDependencyWouldCycle(explicitNodes, "a", ["a"])).toBe(true);
  expect(subtaskDependencyWouldCycle(explicitNodes, "a", ["c"])).toBe(true);
  expect(subtaskDependencyWouldCycle(explicitNodes, "d", ["c"])).toBe(false);

  const mixedLegacyNodes = [
    { id: "x", task_id: "task-1", parent_subtask_id: null, sibling_order: 0, status: "todo", is_standalone: false, dependency_ids: null },
    { id: "y", task_id: "task-1", parent_subtask_id: null, sibling_order: 1, status: "todo", is_standalone: false, dependency_ids: null },
  ] as never[];
  expect(subtaskDependencyWouldCycle(mixedLegacyNodes, "x", ["y"])).toBe(true);
  expect(subtaskDependencyWouldCycle(mixedLegacyNodes, "y", ["x"])).toBe(false);
});

test("subtaskDependencyScheduleError flags start dates earlier than an incomplete prerequisite due date", () => {
  const siblings = [
    { id: "p1", status: "todo", due_date: "2026-11-20" },
    { id: "p2", status: "completed", due_date: "2026-11-25" },
  ] as never[];

  expect(subtaskDependencyScheduleError(siblings, ["p1"], "2026-11-18")).toBe(
    "The subtask starts before a selected prerequisite is due. Adjust the schedule first.",
  );
  expect(subtaskDependencyScheduleError(siblings, ["p1"], "2026-11-20")).toBe("");
  expect(subtaskDependencyScheduleError(siblings, ["p2"], "2026-11-18")).toBe("");
  expect(subtaskDependencyScheduleError(siblings, ["p1"], null)).toBe("");
});
