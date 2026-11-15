import { supabase } from "../../../platform/supabase";
import { budgetReportRead } from "../../../core/web/app/features/budget/services/budgetReportReads";

type Row = Record<string, unknown>;
type Expenses = { settled?: number; pending?: number; complete: boolean };
const pendingRequests = [
  "liquidation_submitted",
  "pending_leader_liquidation_review",
  "pending_department_settlement",
];
const pendingReports = new Set([
  "pending",
  "pending_leader_review",
  "pending_department_settlement",
]);

function cents(value: unknown) {
  if (value == null || value === "") return undefined;
  const amount = Number(value);
  const rounded = Math.round(amount * 100);
  return amount >= 0 && Number.isSafeInteger(rounded) ? rounded : undefined;
}

function expenseKey(taskId: string, nodeId?: string) {
  return JSON.stringify([taskId, nodeId ?? null]);
}

export function combineWorkExpenseTotals(
  lead: Row[],
  requests: Row[],
  reports: Row[],
) {
  const totals = new Map<string, Expenses>();
  const completeTasks = new Set<string>();
  for (const row of lead) {
    if (typeof row.task_id !== "string") continue;
    const settled = cents(row.settled);
    const pending = cents(row.pending);
    if (settled === undefined || pending === undefined)
      throw new Error("Could not verify the work expense amounts.");
    const node =
      typeof row.subtask_id === "string" ? row.subtask_id : undefined;
    totals.set(expenseKey(row.task_id, node), {
      settled,
      pending,
      complete: true,
    });
    if (!node) completeTasks.add(row.task_id);
  }

  const latest = new Map<string, Row>();
  for (const report of reports) {
    const request = String(report.request_id);
    const previous = latest.get(request);
    if (!previous || Number(report.version) > Number(previous.version))
      latest.set(request, report);
  }
  const counted = new Set<string>();
  function add(id: string, field: "settled" | "pending", amount: number) {
    const current = totals.get(id) ?? { complete: false };
    current[field] = (current[field] ?? 0) + amount;
    totals.set(id, current);
  }
  for (const request of requests) {
    const id = String(request.id);
    if (
      typeof request.task_id !== "string" ||
      completeTasks.has(request.task_id) ||
      counted.has(id)
    )
      continue;
    counted.add(id);
    const field = request.status === "settled" ? "settled" : "pending";
    const report = latest.get(id);
    const amount =
      field === "settled"
        ? cents(request.actual_spent)
        : pendingReports.has(String(report?.status))
          ? cents(report?.declared_spent)
          : undefined;
    if (amount === undefined) continue;
    add(expenseKey(request.task_id), field, amount);
    if (typeof request.subtask_id === "string")
      add(expenseKey(request.task_id, request.subtask_id), field, amount);
  }
  return {
    get(taskId: string, nodeId?: string) {
      return (
        totals.get(expenseKey(taskId, nodeId)) ??
        (nodeId && completeTasks.has(taskId)
          ? { settled: 0, pending: 0, complete: true }
          : undefined)
      );
    },
  };
}

/** Match Web's complete Task Lead totals and its RLS-visible record fallback. */
export async function fetchWorkExpenseTotals(taskIds: string[]) {
  const lead = await budgetReportRead(
    (ids) =>
      supabase
        .rpc(
          "task_lead_expense_totals",
          { p_task_ids: ids },
          { count: "exact" },
        )
        .order("task_id")
        .order("subtask_id"),
    taskIds,
  );
  if (lead.error) throw new Error(lead.error.message);
  const complete = new Set(
    (lead.data ?? [])
      .filter((row) => !row.subtask_id)
      .map((row) => row.task_id),
  );
  const requests = await budgetReportRead(
    (ids) =>
      supabase
        .from("petty_cash_requests")
        .select("id,task_id,subtask_id,status,actual_spent", { count: "exact" })
        .in("task_id", ids)
        .in("status", ["settled", ...pendingRequests])
        .order("id"),
    taskIds.filter((id) => !complete.has(id)),
  );
  if (requests.error) throw new Error(requests.error.message);
  const reports = await budgetReportRead(
    (ids) =>
      supabase
        .from("petty_cash_liquidations")
        .select("id,request_id,version,status,declared_spent", {
          count: "exact",
        })
        .in("request_id", ids)
        .order("id"),
    (requests.data ?? [])
      .filter((row) => row.status !== "settled")
      .map((row) => String(row.id)),
  );
  if (reports.error) throw new Error(reports.error.message);
  return combineWorkExpenseTotals(
    lead.data ?? [],
    requests.data ?? [],
    reports.data ?? [],
  );
}
