import { expect, test } from "@jest/globals";
import type {
  WorkNode,
  WorkTreeSnapshot,
} from "../../../../core/web/app/features/nested-work/types";
import { subtaskDependencies } from "../subtaskDependencies";
import { plannedStartReached } from "../subtaskSchedule";

const first = {
  id: "a",
  task_id: "root",
  parent_subtask_id: null,
  sibling_order: 0,
  status: "todo",
} as WorkNode;
const second = { ...first, id: "b", sibling_order: 1 };
const current = { ...first, id: "c", sibling_order: 2 };
const tree = {
  root: { id: "root", kind: "office" },
  nodes: [first, second, current],
} as WorkTreeSnapshot;

test("explicit dependencies replace sibling order and report restricted counts without record details", () => {
  expect(
    subtaskDependencies(tree, {
      ...current,
      dependency_ids: ["a"],
      pending_dependency_count: 2,
      restricted_dependency_count: 1,
    }),
  ).toEqual({ items: [first], pendingCount: 2, missingCount: 1, known: true });
  expect(
    subtaskDependencies(tree, { ...current, dependency_ids: [] }).items,
  ).toEqual([]);
  expect(
    subtaskDependencies(tree, { ...current, dependency_ids: null }).items,
  ).toEqual([first, second]);
  expect(subtaskDependencies(tree, current).known).toBe(false);
});

test("scheduled starts accept overdue work and reject future and missing dates", () => {
  expect(plannedStartReached("2026-11-13", "2026-11-14")).toBe(true);
  expect(plannedStartReached("2026-11-14", "2026-11-14")).toBe(true);
  expect(plannedStartReached("2026-11-15", "2026-11-14")).toBe(false);
  expect(plannedStartReached("2026-11-14")).toBe(false);
  expect(plannedStartReached(null, "2026-11-14")).toBe(false);
});
