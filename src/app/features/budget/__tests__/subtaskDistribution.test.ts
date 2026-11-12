import { expect, test } from "@jest/globals";
import type {
  SubtaskBudgetRow,
  TaskFundingContext,
} from "../../../../core/web/app/features/budget/types";
import {
  buildDistributionRequest,
  distributionLimits,
} from "../subtaskDistribution";

const row: SubtaskBudgetRow = {
  id: "subtask",
  title: "Print handouts",
  capId: "cap",
  sourceId: "supplies",
  amount: 15000,
  returnable: 12000,
  finished: false,
  hasHistory: true,
  blocked: false,
};
const context = {
  taskId: "task",
  taskBudget: 50000,
  canManageDistribution: true,
  subtaskBudgets: [row],
  parentSources: [
    { id: "supplies", name: "Supplies", available: 5000 },
    { id: "travel", name: "Travel", available: 12000 },
  ],
} as TaskFundingContext;
const input = {
  source: "supplies",
  amount: "17500",
  reason: " More handouts ",
  expectedCapId: "cap",
};

test("editing an allocation credits its existing amount and keeps settled spending covered", () => {
  expect(distributionLimits(context, row, "supplies")).toMatchObject({
    minimum: 300000,
    maximum: 2000000,
  });
  expect(
    buildDistributionRequest(context, row.id, "save", input, "command"),
  ).toEqual({
    id: "command",
    args: {
      p_task_id: "task",
      p_subtask_id: "subtask",
      p_parent_allocation_line_id: "supplies",
      p_amount: 17500,
      p_reason: "More handouts",
      p_idempotency_key: "command",
    },
  });
  expect(() =>
    buildDistributionRequest(
      context,
      row.id,
      "save",
      { ...input, amount: "20000.01" },
      "cmd",
    ),
  ).toThrow(/Only/);
  expect(() =>
    buildDistributionRequest(
      context,
      row.id,
      "save",
      { ...input, amount: "2999.99" },
      "cmd",
    ),
  ).toThrow(/recorded spending/);
  expect(() =>
    buildDistributionRequest(
      context,
      row.id,
      "save",
      { ...input, source: "travel" },
      "cmd",
    ),
  ).toThrow(/eligible account/);
});

test("return sends only the existing cap and prevents changes to stale or blocked allocations", () => {
  expect(
    buildDistributionRequest(context, row.id, "return", input, "return"),
  ).toEqual({
    id: "return",
    args: {
      p_cap_allocation_id: "cap",
      p_reason: "More handouts",
      p_idempotency_key: "return",
    },
  });
  expect(() =>
    buildDistributionRequest(
      context,
      row.id,
      "return",
      { ...input, expectedCapId: "old" },
      "cmd",
    ),
  ).toThrow(/changed/);
  expect(() =>
    buildDistributionRequest(
      { ...context, canManageDistribution: false },
      row.id,
      "save",
      input,
      "cmd",
    ),
  ).toThrow(/current task lead/);
  expect(() =>
    buildDistributionRequest(
      { ...context, subtaskBudgets: [{ ...row, blocked: true }] },
      row.id,
      "return",
      input,
      "cmd",
    ),
  ).toThrow(/open cash request/);
  expect(() =>
    buildDistributionRequest(
      { ...context, subtaskBudgets: [{ ...row, finished: true }] },
      row.id,
      "save",
      input,
      "cmd",
    ),
  ).toThrow(/Only/);
});
