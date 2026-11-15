import { expect, jest, test } from "@jest/globals";
import { combineWorkExpenseTotals } from "../workExpenseTotals";

jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));

test("complete Lead totals override overlapping rows and preserve confirmed zero separately from inaccessible work", () => {
  const totals = combineWorkExpenseTotals(
    [
      { task_id: "task", subtask_id: null, settled: 80, pending: 20 },
      { task_id: "task", subtask_id: "a", settled: 50, pending: 0 },
      { task_id: "task", subtask_id: "b", settled: 30, pending: 20 },
    ],
    [
      {
        id: "same",
        task_id: "task",
        subtask_id: "a",
        status: "settled",
        actual_spent: 50,
      },
    ],
    [],
  );
  expect(totals.get("task")).toEqual({
    settled: 8000,
    pending: 2000,
    complete: true,
  });
  expect(totals.get("task", "a")?.settled).toBe(5000);
  expect(totals.get("task", "b")?.settled).toBe(3000);
  expect(totals.get("task", "c")?.settled).toBe(0);
  expect(totals.get("restricted")).toBeUndefined();
});

test("visible request totals use one settled amount and the latest pending liquidation only", () => {
  const settled = {
    id: "s",
    task_id: "task",
    subtask_id: "a",
    status: "settled",
    actual_spent: "5.25",
  };
  const totals = combineWorkExpenseTotals(
    [],
    [
      settled,
      settled,
      {
        id: "p",
        task_id: "task",
        subtask_id: "b",
        status: "liquidation_submitted",
      },
    ],
    [
      {
        request_id: "p",
        status: "pending",
        version: 2,
        declared_spent: "6.42",
      },
      { request_id: "p", status: "pending", version: 1, declared_spent: 99 },
    ],
  );
  expect(totals.get("task")).toEqual({
    settled: 525,
    pending: 642,
    complete: false,
  });
  expect(totals.get("task", "b")?.pending).toBe(642);
  expect(totals.get("task", "c")).toBeUndefined();
});
