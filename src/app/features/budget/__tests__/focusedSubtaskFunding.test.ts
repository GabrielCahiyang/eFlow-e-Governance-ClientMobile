import { expect, jest, test } from "@jest/globals";
import {
  readFocusedSubtaskFunding,
  readOfficeCashRequest,
} from "../focusedSubtaskFunding";
import type { TaskFundingContext } from "../../../../core/web/app/features/budget/types";

const mockFilters: unknown[][] = [];
let mockRead = 0;
const mockTables: string[] = [];
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: async () => {
      mockRead++;
      return {
        data: { id: "budget", orgId: "office", fiscalYear: 2026 },
        error: null,
      };
    },
    from: (table: string) => {
      mockTables.push(table);
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          mockFilters.push(args);
          return query;
        },
        order: () => query,
        in: () => query,
        maybeSingle: async () => ({
          data:
            table === "department_fiscal_budgets"
              ? { id: "budget", per_receipt_limit: 5000 }
              : {
                  id: "request",
                  fiscal_budget_id: "budget",
                  org_id: "office",
                  status: "settled",
                  actual_spent: 4000,
                },
          error: null,
        }),
        range: async () => ({ data: [], count: 0, error: null }),
      };
      return query;
    },
  },
}));

test("the focused branch refuses mismatches before reads and scopes request lookup to all record IDs", async () => {
  const context: TaskFundingContext = {
    taskId: "root",
    subtaskId: "child",
    fundingOrgId: "office",
    fiscalYear: 2026,
    funded: true,
    taskBudget: 120,
    available: 80,
    lines: [],
  };
  await expect(readFocusedSubtaskFunding(context, "sibling")).rejects.toThrow(
    /scope/,
  );
  expect(mockRead).toBe(0);
  expect((await readFocusedSubtaskFunding(context, "child")).requests).toEqual(
    [],
  );
  expect(mockFilters).toEqual([
    ["fiscal_budget_id", "budget"],
    ["task_id", "root"],
    ["subtask_id", "child"],
  ]);
});

test("opening a settled request reads only the fiscal record, the exact request, and its relations", async () => {
  mockFilters.length = 0;
  mockTables.length = 0;
  const result = await readOfficeCashRequest("office", 2026, "request");
  expect(result?.requests[0]).toMatchObject({
    id: "request",
    actualSpent: 4000,
  });
  expect(mockFilters).toEqual(
    expect.arrayContaining([
      ["org_id", "office"],
      ["fiscal_year", 2026],
      ["id", "request"],
      ["fiscal_budget_id", "budget"],
    ]),
  );
  expect(mockTables).toEqual([
    "department_fiscal_budgets",
    "petty_cash_requests",
    "petty_cash_releases",
    "petty_cash_liquidations",
  ]);
});
