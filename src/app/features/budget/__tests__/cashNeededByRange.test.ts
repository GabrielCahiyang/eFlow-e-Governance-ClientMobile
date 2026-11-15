import { expect, test } from "@jest/globals";
import {
  cashNeededByBounds,
  cashNeededByError,
  formatTaskDateRangeHint,
} from "../cashNeededByRange";

const today = "2026-11-15";

test("cashNeededByBounds computes task-constrained bounds and expiration state", () => {
  expect(
    cashNeededByBounds({ start: "2026-11-18", end: "2026-11-25" }, today),
  ).toEqual({
    min: "2026-11-18",
    max: "2026-11-25",
    taskStart: "2026-11-18",
    taskEnd: "2026-11-25",
    expired: false,
  });

  expect(
    cashNeededByBounds({ start: "2026-11-10", end: "2026-11-25" }, today),
  ).toEqual({
    min: "2026-11-15",
    max: "2026-11-25",
    taskStart: "2026-11-10",
    taskEnd: "2026-11-25",
    expired: false,
  });

  expect(
    cashNeededByBounds({ start: "2026-11-01", end: "2026-11-10" }, today).expired,
  ).toBe(true);

  expect(
    cashNeededByBounds({ start: "2026-11-25", end: "2026-11-20" }, today).expired,
  ).toBe(true);

  expect(cashNeededByBounds({ start: "2026-11-20" }, today)).toEqual({
    min: "2026-11-20",
    max: undefined,
    taskStart: "2026-11-20",
    taskEnd: undefined,
    expired: false,
  });

  expect(cashNeededByBounds({ end: "2026-11-25" }, today)).toEqual({
    min: "2026-11-15",
    max: "2026-11-25",
    taskStart: undefined,
    taskEnd: "2026-11-25",
    expired: false,
  });

  expect(cashNeededByBounds(undefined, today)).toEqual({
    min: "2026-11-15",
    max: undefined,
    taskStart: undefined,
    taskEnd: undefined,
    expired: false,
  });
});

test("cashNeededByError enforces required date, valid format, today floor, and task schedule", () => {
  const schedule = { start: "2026-11-18", end: "2026-11-25" };

  expect(cashNeededByError("", schedule, today)).toBe("Needed-by date is required.");
  expect(cashNeededByError("invalid", schedule, today)).toBe(
    "Needed-by date must be a valid date.",
  );
  expect(cashNeededByError("2026-11-17", schedule, today)).toContain(
    "Needed-by date must be on or after the task start date",
  );
  expect(cashNeededByError("2026-11-26", schedule, today)).toContain(
    "Needed-by date must be on or before the task due date",
  );
  expect(cashNeededByError("2026-11-14", undefined, today)).toBe(
    "Needed-by date cannot be earlier than today.",
  );
  expect(
    cashNeededByError("2026-11-15", { start: "2026-11-01", end: "2026-11-10" }, today),
  ).toBeTruthy();
  expect(cashNeededByError("2026-11-20", schedule, today)).toBe("");
});

test("formatTaskDateRangeHint formats two-sided, one-sided, and missing task schedules", () => {
  expect(
    formatTaskDateRangeHint({ start: "2026-11-18", end: "2026-11-25" }),
  ).toContain("Choose a date within the task schedule");
  expect(formatTaskDateRangeHint({ start: "2026-11-18" })).toContain(
    "Choose a date on or after the task start date",
  );
  expect(formatTaskDateRangeHint({ end: "2026-11-25" })).toContain(
    "Choose a date on or before the task due date",
  );
  expect(formatTaskDateRangeHint(undefined)).toBeUndefined();
});
