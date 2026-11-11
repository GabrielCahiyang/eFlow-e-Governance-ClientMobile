import { expect, jest, test } from "@jest/globals";
import { readFocusedSubtaskFunding } from "../focusedSubtaskFunding";
import type { TaskFundingContext } from "../../../../core/web/app/features/budget/types";

const mockFilters: unknown[][] = [];
let mockRead = 0;
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: async () => {
      mockRead++;
      return {
        data: { id: "budget", orgId: "office", fiscalYear: 2026 },
        error: null,
      };
    },
    from: () => {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          mockFilters.push(args);
          return query;
        },
        order: () => query,
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
