import { expect, test } from "@jest/globals";
import { subtasksVisibleForActor } from "../subtaskVisibility";
test.each(["todo", "pending_assignment", undefined])(
  "unstarted/unknown parent %s hides Subtasks from everyone except its Task Lead",
  (status) => {
    const root = { kind: "office" as const, lead: "task-lead", status };
    expect(subtasksVisibleForActor(root, "task-lead")).toBe(true);
    for (const actor of [
      "subtask-lead",
      "contributor",
      "project-lead",
      "head",
      undefined,
    ])
      expect(subtasksVisibleForActor(root, actor)).toBe(false);
  },
);
test.each(["in_progress", "for_review", "changes_requested", "completed"])(
  "parent %s reveals Subtasks to otherwise authorized project readers without granting write permission",
  (status) => {
    expect(
      subtasksVisibleForActor(
        { kind: "office", lead: "task-lead", status },
        "reader",
      ),
    ).toBe(true);
  },
);
test("Personal work presentation is retained", () => {
  expect(
    subtasksVisibleForActor(
      { kind: "personal", lead: "owner", status: "todo" },
      "actor",
    ),
  ).toBe(true);
});
