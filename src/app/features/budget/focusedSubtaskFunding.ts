import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { budgetReportRead } from "../../../core/web/app/features/budget/services/budgetReportReads";
import {
  mapLiquidation,
  mapReceipt,
  mapRelease,
  mapRequest,
  mapAllocationLine,
} from "../../../core/web/app/features/budget/services/budgetMappers";
import { fetchBudgetSections } from "../../../core/web/app/features/budget/services/budgetSectionService";
import type {
  DepartmentBudgetBundle,
  TaskFundingContext,
} from "../../../core/web/app/features/budget/types";

export type CashRequestBundle = Pick<
  DepartmentBudgetBundle,
  "releases" | "liquidations" | "itemizedCashAvailable"
> & {
  summary: { perReceiptLimit: number } | null;
  allocationLines: { id: string; particular: string; category: string }[];
};
type FocusedBundle = CashRequestBundle &
  Pick<DepartmentBudgetBundle, "requests">;

/** Same financial records as the Office bundle, narrowed to the inspected branch. */
export async function readFocusedSubtaskFunding(
  context: TaskFundingContext,
  nodeId: string,
): Promise<FocusedBundle> {
  if (context.subtaskId !== nodeId)
    throw new Error("The funding scope could not be verified.");
  const { fundingOrgId, fiscalYear } = context;
  const base: FocusedBundle = {
    summary: null,
    allocationLines: context.lines.map(({ id, particular, category }) => ({
      id,
      particular,
      category,
    })),
    itemizedCashAvailable: context.supportsItemizedCash,
    requests: [],
    releases: [],
    liquidations: [],
  };
  if (!fundingOrgId || !fiscalYear) {
    if (context.funded)
      throw new Error("The funding Office or fiscal year is unavailable.");
    return base;
  }
  const summary = await supabase.rpc("department_budget_summary", {
    p_org_id: fundingOrgId,
    p_fiscal_year: fiscalYear,
  });
  if (summary.error) throw summary.error;
  const info = summary.data;
  if (
    !info?.id ||
    info.orgId !== fundingOrgId ||
    Number(info.fiscalYear) !== fiscalYear
  )
    throw new Error("The funding Office or fiscal year could not be verified.");
  const limit = info.perReceiptLimit ?? info.pettyCashRequestLimit;
  const requests = await readAllRows<Record<string, unknown>>((from, to) =>
    supabase
      .from("petty_cash_requests")
      .select("*", { count: "exact" })
      .eq("fiscal_budget_id", info.id)
      .eq("task_id", context.taskId)
      .eq("subtask_id", nodeId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  base.summary =
    limit != null && Number.isFinite(Number(limit))
      ? { perReceiptLimit: Number(limit) }
      : null;
  return readCashRequestRelations({
    ...base,
    requests: requests.map(mapRequest),
  });
}

export async function readOfficeCashRequest(
  office: string,
  year: number,
  id: string,
): Promise<FocusedBundle | null> {
  const fiscal = await supabase
    .from("department_fiscal_budgets")
    .select("id,per_receipt_limit,petty_cash_request_limit")
    .eq("org_id", office)
    .eq("fiscal_year", year)
    .maybeSingle();
  if (fiscal.error) throw fiscal.error;
  if (!fiscal.data?.id) return null;
  const record = await supabase
    .from("petty_cash_requests")
    .select("*")
    .eq("id", id)
    .eq("fiscal_budget_id", fiscal.data.id)
    .maybeSingle();
  if (record.error) throw record.error;
  if (!record.data) return null;
  const request = mapRequest(record.data);
  const canHaveNewReceipts = [
    "released",
    "changes_requested",
    "overdue_liquidation",
  ].includes(request.status);
  const [sections, lines] = await Promise.all([
    canHaveNewReceipts ? fetchBudgetSections(office, year) : undefined,
    canHaveNewReceipts
      ? budgetReportRead(() =>
          supabase
            .from("work_budget_allocation_lines")
            .select("*", { count: "exact" })
            .eq("allocation_id", request.allocationId)
            .order("position")
            .order("id"),
        )
      : undefined,
  ]);
  if (lines?.error) throw lines.error;
  const limit =
    fiscal.data.per_receipt_limit ?? fiscal.data.petty_cash_request_limit;
  return readCashRequestRelations({
    requests: [request],
    releases: [],
    liquidations: [],
    summary: limit == null ? null : { perReceiptLimit: Number(limit) },
    itemizedCashAvailable: sections?.itemizedCashAvailable,
    allocationLines: (lines?.data ?? []).map(mapAllocationLine),
  });
}

async function readCashRequestRelations(base: FocusedBundle) {
  const ids = base.requests.map((request) => request.id);
  if (!ids.length) return base;
  const [releases, liquidations, fundingLines] = await Promise.all([
    budgetReportRead(
      (keys) =>
        supabase
          .from("petty_cash_releases")
          .select("*", { count: "exact" })
          .in("request_id", keys)
          .order("scheduled_date", { ascending: false })
          .order("id"),
      ids,
      "scheduled_date",
    ),
    budgetReportRead(
      (keys) =>
        supabase
          .from("petty_cash_liquidations")
          .select("*", { count: "exact" })
          .in("request_id", keys)
          .order("submitted_at", { ascending: false })
          .order("id"),
      ids,
      "submitted_at",
    ),
    base.itemizedCashAvailable
      ? budgetReportRead(
          (keys) =>
            supabase
              .from("petty_cash_request_lines")
              .select("*", { count: "exact" })
              .in("request_id", keys)
              .order("request_id")
              .order("allocation_line_id"),
          ids,
        )
      : undefined,
  ]);
  const error = releases.error ?? liquidations.error ?? fundingLines?.error;
  if (error) throw error;
  const receiptRows = await budgetReportRead(
    (keys) =>
      supabase
        .from("petty_cash_receipts")
        .select("*", { count: "exact" })
        .in("liquidation_id", keys)
        .order("id"),
    (liquidations.data ?? []).map((row) => String(row.id)),
  );
  if (receiptRows.error) throw receiptRows.error;
  const receipts = (receiptRows.data ?? []).map(mapReceipt);
  for (const request of base.requests) {
    const lines = (fundingLines?.data ?? []).filter(
      (row) => row.request_id === request.id,
    );
    if (lines.length)
      request.fundingLines = lines.map((row) => ({
        allocationLineId: String(row.allocation_line_id),
        amount: Number(row.amount),
        sourceName:
          base.allocationLines.find(
            (line) => line.id === row.allocation_line_id,
          )?.category ?? "Approved source",
      }));
  }
  return {
    ...base,
    releases: (releases.data ?? []).map(mapRelease),
    liquidations: (liquidations.data ?? []).map((row) =>
      mapLiquidation(row, receipts),
    ),
  };
}
