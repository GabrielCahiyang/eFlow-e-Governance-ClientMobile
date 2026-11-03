import { expect, test } from "@jest/globals";
import { budgetVersionChanges } from "../../../../core/web/app/features/budget/selectors/budgetVersions";
import type { OfficeBudgetVersion } from "../../../../core/web/app/features/budget/types";

test("budget version comparisons show account additions, removals, release dates and Q4 target changes", () => {
  const v1: OfficeBudgetVersion = {
    version: 1,
    total: 300,
    actorName: "Head",
    createdAt: "2026-11-01",
    reason: "Initial",
    q4Target: 80,
    accounts: [
      {
        id: "a",
        name: "Supplies",
        amount: 200,
        heldAmount: 50,
        position: 0,
        releaseSchedule: [
          { id: "r", date: "2026-11-03", amount: 50, status: "pending" },
        ],
      },
      { id: "b", name: "Travel", amount: 100, heldAmount: 0, position: 1 },
    ],
  };
  const v2: OfficeBudgetVersion = {
    ...v1,
    version: 2,
    q4Target: 90,
    accounts: [
      {
        ...v1.accounts[0],
        releaseSchedule: [
          { id: "r", date: "2026-11-10", amount: 50, status: "pending" },
        ],
      },
      { id: "c", name: "Logistics", amount: 100, heldAmount: 0, position: 1 },
    ],
  };
  expect(budgetVersionChanges(v1, v2)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        account: "Supplies",
        field: "Release schedule",
        before: expect.stringContaining("2026-11-03"),
        after: expect.stringContaining("2026-11-10"),
      }),
      expect.objectContaining({ account: "Logistics", field: "Added" }),
      expect.objectContaining({ account: "Travel", field: "Removed" }),
      expect.objectContaining({
        field: "Q4 utilization target",
        before: "80%",
        after: "90%",
      }),
    ]),
  );
});
