import { supabase } from "../../../platform/supabase";
import {
  mapLiquidation,
  mapReceipt,
  mapRequest,
} from "../../../core/web/app/features/budget/services/budgetMappers";
import { fetchTaskCashBlockers } from "../../../core/web/app/features/budget/services/taskCashClearanceService";
import { isTaskCashApprovalBlocked } from "../../../core/web/app/features/budget/selectors/taskCashClearance";
import {
  getIndependentReview,
  independentReviewAllowsPosting,
  type IndependentReviewContext,
} from "../../../core/web/app/features/budget/services/independentReviewService";

export type SettlementReview = IndependentReviewContext;

export async function getSettlementReview(
  id: string,
): Promise<SettlementReview> {
  return getIndependentReview(id);
}

export async function getActionableSettlementEscalations(ids: string[]) {
  const checks = await Promise.allSettled(ids.map(getSettlementReview));
  return checks.flatMap((result) =>
    result.status === "fulfilled" &&
    headSettlementAction(result.value, result.value.version)
      ? [result.value.liquidationId]
      : [],
  );
}

export function headSettlementAction(
  context: SettlementReview | undefined,
  version: number,
) {
  if (
    context?.version !== version ||
    context.headSettlementPosted ||
    typeof context.headEscalationFingerprint !== "string" ||
    !context.headEscalationFingerprint
  )
    return;
  return context.headCanPostSettlement === true ? "post" : "approve";
}

export function settlementAllowsAccountingPosting(
  context: SettlementReview,
  actorId: string,
) {
  return (
    context.canSettle &&
    (context.headEscalationApproved === true ||
      independentReviewAllowsPosting(context, actorId))
  );
}

export async function fetchTaskApprovalCashBlockers(taskId: string) {
  const blockers = await fetchTaskCashBlockers(taskId);
  return blockers.filter(isTaskCashApprovalBlocked);
}

export async function approveStaffingEscalation(
  context: SettlementReview,
  reason: string,
  commandId: string,
) {
  const { error } = await supabase.rpc(
    "approve_liquidation_staffing_escalation",
    {
      p_liquidation_id: context.liquidationId,
      p_version: context.version,
      p_fingerprint: context.headEscalationFingerprint,
      p_reason: reason,
      p_idempotency_key: commandId,
    },
  );
  if (error) throw new Error(error.message);
}

export async function getStaffingReviewPackage(
  liquidationId: string,
  officeId: string,
) {
  const liquidationLink = await supabase
    .from("petty_cash_liquidations")
    .select("*")
    .eq("id", liquidationId)
    .maybeSingle();
  if (liquidationLink.error) throw new Error(liquidationLink.error.message);
  const liquidationRow = liquidationLink.data;
  if (!liquidationRow?.request_id) return null;
  const requestId = liquidationRow.request_id;
  const requestLink = await supabase
    .from("petty_cash_requests")
    .select("*")
    .eq("id", requestId)
    .eq("org_id", officeId)
    .maybeSingle();
  if (requestLink.error) throw new Error(requestLink.error.message);
  if (!requestLink.data) return null;
  const [fiscalBudget, receipts] = await Promise.all([
    supabase
      .from("department_fiscal_budgets")
      .select("fiscal_year")
      .eq("id", requestLink.data.fiscal_budget_id)
      .eq("org_id", officeId)
      .maybeSingle(),
    supabase
      .from("petty_cash_receipts")
      .select("*")
      .eq("liquidation_id", liquidationId)
      .order("id"),
  ]);
  if (fiscalBudget.error) throw new Error(fiscalBudget.error.message);
  if (receipts.error) throw new Error(receipts.error.message);
  const year = fiscalBudget.data?.fiscal_year;
  if (typeof year !== "number" || !Number.isInteger(year)) return null;
  const rows = receipts.data || [];
  const items = rows.length
    ? await supabase
        .from("petty_cash_receipt_items")
        .select("*")
        .in(
          "receipt_id",
          rows.map((row) => row.id),
        )
        .order("position")
    : { data: [], error: null };
  if (items.error) throw new Error(items.error.message);
  const receiptDetails = rows.map((row) => ({
    ...mapReceipt(row),
    items: (items.data || [])
      .filter((item) => item.receipt_id === row.id)
      .map((item) => ({
        id: String(item.id),
        allocationLineId: String(item.allocation_line_id),
        quantity: Number(item.quantity),
        unit: String(item.unit),
        particular: String(item.particular),
        purpose: String(item.purpose),
        amount: Number(item.amount),
        accountName: String(item.account_name),
        accountLabel: item.account_label
          ? String(item.account_label)
          : undefined,
      })),
  }));
  return {
    request: mapRequest(requestLink.data),
    liquidation: mapLiquidation(liquidationRow, receiptDetails),
    year,
  };
}
