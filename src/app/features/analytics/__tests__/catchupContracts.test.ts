import { test, expect } from "@jest/globals";
import { deadlinePresentation } from "../../../../core/web/app/shared/deadlinePresentation";
import { selectWorkRows } from "../../../../core/web/app/features/personal-work/workSelectors";
import {
  budgetReleaseScheduleError,
  lockedReleaseEditError,
} from "../../../../core/web/app/features/budget/selectors/budgetReleaseSchedule";
import type { BudgetSection } from "../../../../core/web/app/features/budget/types";
import type { WorkRow } from "../../../../core/web/app/features/personal-work/types";

test("a deadline at midnight Philippine time rolls into the next day", () => {
  const now = Date.parse("2026-11-03T16:00:00Z");
  expect(deadlinePresentation("2026-11-03", "in_progress", now)).toMatchObject({
    tone: "red",
    label: "1 day overdue",
  });
  expect(deadlinePresentation("2026-11-04", "in_progress", now)).toMatchObject({
    tone: "yellow",
    label: "Due today",
  });
  expect(deadlinePresentation("2026-11-03", "completed", now).tone).toBe(
    "neutral",
  );
});

test("Leading keeps a pending review visible without treating it as actionable", () => {
  const pending: WorkRow = {
    key: "pending",
    id: "t",
    rootId: "t",
    title: "Pending",
    kind: "office-task",
    projectTitle: "Project",
    workspaceName: "Office",
    timezone: "Asia/Manila",
    status: "for_review",
    progress: 0,
    mine: true,
    leading: true,
    actionable: false,
    history: false,
    relation: "Lead",
  };
  expect(selectWorkRows([pending], "Leading", "All my work")).toEqual([
    pending,
  ]);
  expect(selectWorkRows([pending], "History", "All my work")).toEqual([]);
});

test("a Head cannot reduce a locked hold and a pending total must match the release schedule", () => {
  const account: BudgetSection = {
    id: "a",
    name: "Supplies",
    amount: 1000,
    heldAmount: 500,
    position: 0,
    releaseSchedule: [
      { id: "r", date: "2026-11-15", amount: 500, status: "pending" },
    ],
  };
  expect(budgetReleaseScheduleError(account)).toBe("");
  expect(budgetReleaseScheduleError({ ...account, heldAmount: 400 })).toMatch(
    /match the held amount/,
  );
  expect(
    lockedReleaseEditError([account], [{ ...account, heldAmount: 400 }]),
  ).toMatch(/Accounting must confirm/);
});
