import { expect, jest, test } from "@jest/globals";
import { accountingHomeQueue } from "../homeFinance";
import { officeFinancialSummary } from "../../budget/officeFinancialSummary";

const mockQueries: { table: string; calls: unknown[][] }[] = [];
let mockSummary: unknown;
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    rpc: async () => ({ data: mockSummary, error: null }),
    from: (table: string) => {
      const calls: unknown[][] = [];
      mockQueries.push({ table, calls });
      const response = () =>
        table === "department_fiscal_budgets"
          ? { data: { id: "budget", status: "locked" }, error: null }
          : table === "petty_cash_releases"
            ? {
                data: [
                  {
                    id: "release",
                    scheduled_date: "2026-11-11",
                    petty_cash_requests: {
                      id: "request",
                      funding_org_id: "office",
                      request_number: 1,
                      purpose: "Supplies",
                    },
                  },
                ],
                error: null,
              }
            : { data: [], error: null, count: 0 };
      const query = {
        maybeSingle: async () => response(),
        then: (done: (value: unknown) => unknown) =>
          Promise.resolve(response()).then(done),
      } as Record<string, unknown>;
      for (const name of ["select", "eq", "in", "not", "lte", "order", "limit"])
        query[name] = (...args: unknown[]) => {
          calls.push([name, ...args]);
          return query;
        };
      return query;
    },
  },
}));

test("Accounting permissions govern the release preview and preserve the exact fiscal route", async () => {
  mockQueries.length = 0;
  const limited = await accountingHomeQueue(
    "office",
    2026,
    "actor",
    false,
    false,
  );
  expect(limited?.actions).toEqual([]);
  expect(
    mockQueries.some((query) => query.table === "petty_cash_releases"),
  ).toBe(false);
  const authorized = await accountingHomeQueue(
    "office",
    2026,
    "actor",
    true,
    false,
  );
  expect(authorized?.actions[0]?.route).toMatchObject({
    name: "accounting_releases",
    id: "release",
    recordId: "request",
    financialOfficeId: "office",
    fiscalYear: 2026,
  });
  expect(
    mockQueries.find((query) => query.table === "petty_cash_releases")?.calls,
  ).toEqual(
    expect.arrayContaining([
      ["eq", "org_id", "office"],
      ["eq", "petty_cash_requests.fiscal_budget_id", "budget"],
      ["limit", 10],
    ]),
  );
});

test("Office totals preserve explicit zero and reject missing amounts and wrong Office responses", async () => {
  mockSummary = {
    id: "budget",
    orgId: "office",
    fiscalYear: 2026,
    approvedAmount: null,
    spentAmount: 0,
  };
  expect(await officeFinancialSummary("office", 2026)).toEqual({
    approved: undefined,
    settled: 0,
    available: undefined,
  });
  await expect(officeFinancialSummary("other", 2026)).rejects.toThrow(
    /Office and fiscal year/,
  );
});
