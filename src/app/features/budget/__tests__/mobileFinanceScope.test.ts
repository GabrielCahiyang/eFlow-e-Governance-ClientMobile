import { expect, test } from "@jest/globals";
import type { DepartmentBudgetBundle } from "../../../../core/web/app/features/budget/types";
import {
  cashRequestAmount,
  cashReturnAmounts,
  linkedFundingSubitem,
  taskCashRequests,
} from "../mobileFinanceScope";

test("finance amounts keep stage, missing values, and recorded zero distinct", () => {
  const request = {
    requestedAmount: 2500,
    approvedAmount: 1800,
    releasedAmount: 1700,
  };
  expect(
    cashRequestAmount({ ...request, status: "settled", actualSpent: 0 }),
  ).toEqual({ label: "Settled expenditure", value: 0 });
  expect(
    cashRequestAmount({ ...request, status: "settled" }).value,
  ).toBeUndefined();
  expect(cashRequestAmount({ ...request, status: "released" }).label).toBe(
    "Cash released",
  );
  expect(
    cashRequestAmount({
      ...request,
      status: "released",
      releasedAmount: undefined,
    }),
  ).toEqual({ label: "Cash released", value: undefined });
  expect(
    cashRequestAmount({
      ...request,
      releasedAmount: undefined,
      status: "approved",
    }).value,
  ).toBe(1800);
});

test("cash return compares exact cents and cannot invent a missing released amount", () => {
  const receipts = [{ amount: 0.1 }, { amount: 0.2 }];
  expect(cashReturnAmounts(receipts, 0.3)).toEqual({
    spent: 0.3,
    returned: 0,
    exceedsRelease: false,
  });
  expect(cashReturnAmounts(receipts, 0.29).exceedsRelease).toBe(true);
  expect(cashReturnAmounts(receipts, 0.31).returned).toBe(0.01);
  expect(cashReturnAmounts(receipts).returned).toBeUndefined();
});

test("a cash record deep link cannot fall through to a sibling, root, or different task", () => {
  const bundle = {
    requests: [
      { id: "target", taskId: "task-a", subtaskId: "node-a" },
      { id: "sibling", taskId: "task-a", subtaskId: "node-b" },
      { id: "root-request", taskId: "task-a" },
      { id: "other", taskId: "task-b" },
    ],
    releases: [{ id: "release", requestId: "target" }],
    liquidations: [{ id: "receipts", requestId: "target" }],
  } as DepartmentBudgetBundle;

  for (const id of ["target", "release", "receipts"])
    expect(
      taskCashRequests(bundle, "task-a", "node-a", id).map((row) => row.id),
    ).toEqual(["target"]);
  expect(taskCashRequests(bundle, "task-a", "node-b", "release")).toEqual([]);
  expect(taskCashRequests(bundle, "task-a", undefined, "receipts")).toEqual([]);
  expect(taskCashRequests(bundle, "task-b", undefined, "target")).toEqual([]);
  expect(taskCashRequests(bundle, "task-a", "node-a", "missing")).toEqual([]);
});

test("a historical notification can recover only the subitem for its unique record and root", () => {
  const bundle = {
    requests: [
      { id: "request-a", taskId: "root-a", subtaskId: "subitem-a" },
      { id: "request-b", taskId: "root-a", subtaskId: "subitem-b" },
      { id: "request-c", taskId: "root-b", subtaskId: "subitem-c" },
    ],
    releases: [{ id: "release-a", requestId: "request-a" }],
    liquidations: [
      { id: "liquidation-a", requestId: "request-a" },
      { id: "release-a", requestId: "request-b" },
    ],
  } as DepartmentBudgetBundle;
  expect(linkedFundingSubitem(bundle, "root-a", "liquidation-a")).toBe(
    "subitem-a",
  );
  expect(
    linkedFundingSubitem(bundle, "root-b", "liquidation-a"),
  ).toBeUndefined();
  expect(linkedFundingSubitem(bundle, "root-a", "release-a")).toBeUndefined();
  expect(linkedFundingSubitem(bundle, "root-a", "missing")).toBeUndefined();
});
