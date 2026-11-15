import { expect, test } from "@jest/globals";
import { taskDateLabel, taskDatePatch, taskTimeline } from "../taskDates";

test("legacy deadlines use the same Philippine calendar day as migrated records", () => {
  expect(taskTimeline({ deadline: "2026-11-14T17:30:00Z" }).end).toBe("2026-11-15");
  expect(taskDateLabel("2026-11-14T17:30:00Z")).toBe(taskDateLabel("2026-11-15"));
  expect(taskTimeline({ dueDate: "2026-11-15T23:59:00" }).end).toBe("2026-11-15");
});

test("date changes send only changed calendar fields and use the Philippine workday", () => {
  const now = new Date("2026-11-14T17:30:00Z");
  const original = { start: "2026-11-13", end: "2026-11-18" };
  expect(taskDatePatch(original, { ...original, end: "2026-11-15" }, now))
    .toEqual({ deadline: "2026-11-15" });
  expect(taskDatePatch(original, original, now)).toEqual({});
  expect(() => taskDatePatch(original, { ...original, end: "2026-11-14" }, now))
    .toThrow("Choose today or a future due date.");
  expect(() => taskDatePatch(original, { ...original, end: "2026-11-15T23:59:00" }, now))
    .toThrow("Enter a valid date.");
});
