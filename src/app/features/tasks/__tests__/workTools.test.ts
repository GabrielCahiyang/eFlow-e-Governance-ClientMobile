import { test, expect } from "@jest/globals";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";
import {
  myNativeTasks,
  nativeDeadlineGroups,
  nativeHistoryGroups,
} from "../workTools";
const task = (id: string, patch: Partial<Task> = {}): Task =>
  ({
    id,
    title: id,
    status: "todo",
    createdAt: 1,
    updatedAt: 1,
    ...patch,
  }) as Task;
test("personal work includes leads and contributors but excludes unrelated work and anonymous scope", () => {
  const rows = [
    task("lead", { assigneeId: "me" }),
    task("recommended", { recommendationLeadId: "me" }),
    task("contributor", { teamMemberIds: ["me"] }),
    task("other", { assigneeId: "other" }),
  ];
  expect(myNativeTasks(rows, "me").map((t) => t.id)).toEqual([
    "lead",
    "recommended",
    "contributor",
  ]);
  expect(myNativeTasks(rows, "")).toEqual([]);
});
test("deadline buckets keep pending review separate and omit completed, cancelled and archived work", () => {
  const rows = [
    task("yesterday", { dueDate: "2026-10-27T12:00:00" }),
    task("today", { dueDate: "2026-10-28T18:00:00" }),
    task("tomorrow", { dueDate: "2026-10-29T12:00:00" }),
    task("relative", { dueDate: "Month 1" }),
    task("review", { status: "for_review", dueDate: "2026-10-01" }),
    task("done", { status: "completed" }),
    task("cancelled", { status: "cancelled" }),
    task("archived", { archivedAt: 5 }),
  ];
  const buckets = nativeDeadlineGroups(rows, new Date(2026, 9, 28, 9));
  expect(buckets.overdue.map((t) => t.id)).toEqual(["yesterday"]);
  expect(buckets.today.map((t) => t.id)).toEqual(["today"]);
  expect(buckets.upcoming.map((t) => t.id).sort()).toEqual([
    "relative",
    "tomorrow",
  ]);
  expect(buckets.awaiting.map((t) => t.id)).toEqual(["review"]);
});
test("archiving moves completed and reopened work out of their live history buckets", () => {
  const buckets = nativeHistoryGroups([
    task("done", { status: "completed" }),
    task("past", {
      status: "completed",
      archivedAt: 5,
      reopenReason: "Earlier review",
    }),
    task("changes", { status: "changes_requested" }),
    task("reopened", { reopenReason: "Additional delivery" }),
  ]);
  expect(buckets.completed.map((t) => t.id)).toEqual(["done"]);
  expect(buckets.rejected.map((t) => t.id)).toEqual(["changes"]);
  expect(buckets.reopened.map((t) => t.id)).toEqual(["reopened"]);
  expect(buckets.archived.map((t) => t.id)).toEqual(["past"]);
});
