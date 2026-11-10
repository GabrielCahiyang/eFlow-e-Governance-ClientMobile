import { expect, jest, test } from "@jest/globals";
import { taskFinanceTotals } from "../projectTaskFinance";

jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
test("sums approved allocations and visible settled expenses independently by task", () => {
  const totals = taskFinanceTotals(
    ["a", "b", "c"],
    [
      { task_id: "a", amount: 100.1 },
      { task_id: "a", amount: 20.25 },
      { task_id: "other", amount: 1000 },
    ],
    [
      { task_id: "a", actual_spent: 5.1 },
      { task_id: "a", actual_spent: 5.2 },
      { task_id: "b", actual_spent: 0 },
      { task_id: "c", actual_spent: null },
    ],
  );
  expect([...totals]).toEqual([
    ["a", { budget: 120.35, expense: 10.3 }],
    ["b", { budget: 0, expense: 0 }],
    ["c", { budget: 0 }],
  ]);
});
