import type {
  DepartmentBudgetBundle,
  PettyCashRequest,
} from "../../../core/web/app/features/budget/types";
import type { RouteName } from "../../shared/routes";

export const officeFinanceRoutes: readonly RouteName[] = [
  "budget",
  "accounting_overview",
  "accounting_budgets",
  "accounting_releases",
];

export function accountingView(view?: string) {
  switch (view) {
    case undefined:
    case "overview":
      return "overview";
    case "requests":
    case "releases":
    case "settlements":
      return "requests";
    case "reviews":
      return "reviews";
    default:
      return undefined;
  }
}

const accountingStatuses = new Set([
  "approved",
  "scheduled_for_release",
  "partially_released",
  "released",
  "liquidation_submitted",
  "pending_leader_liquidation_review",
  "pending_department_settlement",
  "changes_requested",
  "overdue_liquidation",
  "settled",
]);

const cashReleasedStatuses = new Set([
  "partially_released",
  "released",
  "liquidation_draft",
  "liquidation_submitted",
  "pending_leader_liquidation_review",
  "pending_department_settlement",
  "changes_requested",
  "overdue_liquidation",
]);

export function cashRequestReference(requestNumber: number) {
  return `FR-${String(requestNumber).padStart(5, "0")}`;
}

export function cashRequestAmount(
  request: Pick<
    PettyCashRequest,
    "requestedAmount" | "approvedAmount" | "releasedAmount" | "actualSpent"
  > & { status: string },
) {
  if (request.status === "settled")
    return { label: "Settled expense", value: request.actualSpent };
  if (
    cashReleasedStatuses.has(request.status) ||
    (request.releasedAmount ?? 0) > 0
  )
    return { label: "Cash released", value: request.releasedAmount };
  if (["approved", "scheduled_for_release"].includes(request.status))
    return { label: "Authorized", value: request.approvedAmount };
  return { label: "Requested", value: request.requestedAmount };
}

export function cashReturnAmounts(
  receipts: { amount: number }[],
  releasedAmount?: number,
) {
  const cents = receipts.reduce(
    (total, receipt) =>
      total +
      (Number.isFinite(receipt.amount) ? Math.round(receipt.amount * 100) : 0),
    0,
  );
  const released =
    releasedAmount == null || !Number.isFinite(releasedAmount)
      ? undefined
      : Math.round(releasedAmount * 100);
  return {
    spent: cents / 100,
    returned:
      released === undefined ? undefined : Math.max(0, released - cents) / 100,
    exceedsRelease: released !== undefined && cents > released,
  };
}

export function accountingRequestVisible(
  request: { status: string; releasedAmount?: number },
  accounting: boolean,
) {
  return (
    !accounting ||
    accountingStatuses.has(request.status) ||
    (request.releasedAmount ?? 0) > 0
  );
}

export function taskCashRequests(
  bundle: DepartmentBudgetBundle,
  taskId: string,
  nodeId?: string,
  recordId?: string,
) {
  return bundle.requests.filter(
    (request) =>
      request.taskId === taskId &&
      (nodeId ? request.subtaskId === nodeId : !request.subtaskId) &&
      (!recordId ||
        request.id === recordId ||
        bundle.releases.some(
          (release) =>
            release.requestId === request.id && release.id === recordId,
        ) ||
        bundle.liquidations.some(
          (item) => item.requestId === request.id && item.id === recordId,
        )),
  );
}

/** Older notices can identify a record without its subitem. Recover only a unique exact match. */
export function linkedFundingSubitem(
  bundle: DepartmentBudgetBundle,
  taskId: string,
  recordId: string,
) {
  const ids = new Set([
    recordId,
    ...bundle.releases
      .filter((item) => item.id === recordId)
      .map((item) => item.requestId),
    ...bundle.liquidations
      .filter((item) => item.id === recordId)
      .map((item) => item.requestId),
  ]);
  const matches = bundle.requests.filter(
    (item) => item.taskId === taskId && ids.has(item.id),
  );
  return matches.length === 1 ? matches[0].subtaskId : undefined;
}
