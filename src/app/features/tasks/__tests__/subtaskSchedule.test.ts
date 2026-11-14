import { expect, test } from "@jest/globals";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import { captureWorkEditorBaseline, freezeWorkEditorRequest, workEditorDateError } from "../../../../core/web/app/features/nested-work/selectors/editorDraft";
import {
  earliestSubtaskStart,
  plannedSubtaskStartIssue,
  subtaskScheduleError,
} from "../subtaskSchedule";

test("M7 start validation respects the latest Task or ancestor start", () => {
  const tree = {
    nodes: [
      { id: "parent", start_date: "2026-11-18", parent_subtask_id: "grandparent" },
      { id: "grandparent", start_date: "2026-11-20", parent_subtask_id: null },
    ],
  } as WorkTreeSnapshot;
  const earliest = earliestSubtaskStart(tree, "parent", "2026-11-19");
  expect(earliest).toBe("2026-11-20");
  expect(plannedSubtaskStartIssue("2026-11-13", "2026-11-30", true, earliest))
    .toBe("Choose a start date on or after the parent start date.");
  expect(plannedSubtaskStartIssue("2026-11-20", "2026-11-30", true, earliest))
    .toBe("");
});

test("overdue parents permit their existing date without permitting a later subtask deadline", () => {
  const tree = {
    root: { id: "root", due: "2026-11-09" },
    nodes: [{ id: "parent", due_date: "2026-11-07", parent_subtask_id: null }],
    revision: 1,
  } as WorkTreeSnapshot;
  const baseline = captureWorkEditorBaseline(
    tree,
    { command: "create", parent: "parent" },
    "lead",
    "new",
  );
  const validate = (due: string) =>
    subtaskScheduleError(
      tree,
      baseline,
      { ...baseline.fields, due },
      "2026-11-11",
    );
  expect(validate("2026-11-07")).toBe("");
  expect(validate("2026-11-08")).toBe(
    "Subtask due date cannot be after 2026-11-07.",
  );
  expect(validate("2026-11-06")).toBe(
    "Subtask due date cannot be before 2026-11-07.",
  );
});

test("shares Web project and ancestor date validation and sends both selected dates", () => {
  const tree = {
    root: { id: "root", due: "2026-11-06", scheduleBounds: {
      projectStart: "2026-10-30",
      projectDue: "2026-11-05",
      taskStart: "2026-11-01",
    } },
    nodes: [{ id: "parent", start_date: "2026-11-02", due_date: "2026-11-04", parent_subtask_id: null }],
    revision: 1,
  } as WorkTreeSnapshot;
  const baseline = captureWorkEditorBaseline(
    tree, { command: "create", parent: "parent" }, "lead", "new",
  );
  const fields = { ...baseline.fields, start: "2026-11-03", due: "2026-11-03" };
  expect(workEditorDateError(tree, baseline, { ...fields, start: "2026-11-01" }))
    .toBe("Subtask start date cannot be before 2026-11-02.");
  expect(workEditorDateError(tree, baseline, { ...fields, due: "2026-11-05" }))
    .toBe("Subtask due date cannot be after 2026-11-04.");
  expect(workEditorDateError(tree, baseline, fields)).toBe("");
  expect(freezeWorkEditorRequest(baseline, fields, "request").payload)
    .toMatchObject({ start: "2026-11-03", due: "2026-11-03" });
});
