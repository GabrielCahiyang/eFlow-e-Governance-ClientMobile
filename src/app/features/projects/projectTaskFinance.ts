import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { supabase } from "../../../platform/supabase";
import { fetchWorkExpenseTotals } from "../budget/workExpenseTotals";

type AmountRow = {
  task_id: string;
  amount?: number;
  actual_spent?: number | null;
};
export type TaskFinance = { budget?: number; expense?: number };

export function taskFinanceTotals(
  taskIds: string[],
  allocations: AmountRow[],
  settlements: AmountRow[],
) {
  const totals = new Map<string, TaskFinance>(taskIds.map((id) => [id, {}]));
  for (const row of allocations) {
    const total = totals.get(row.task_id);
    if (total && row.amount != null)
      total.budget = (total.budget || 0) + Math.round(row.amount * 100);
  }
  for (const row of settlements) {
    const total = totals.get(row.task_id);
    if (total && row.actual_spent != null)
      total.expense = (total.expense || 0) + Math.round(row.actual_spent * 100);
  }
  for (const total of totals.values()) {
    if (total.budget != null) total.budget /= 100;
    if (total.expense != null) total.expense /= 100;
  }
  return totals;
}

export async function fetchProjectTaskFinance(taskIds: string[]) {
  const totals = new Map<string, TaskFinance>();
  for (let index = 0; index < taskIds.length; index += 75) {
    const ids = taskIds.slice(index, index + 75);
    const [allocations, expenses] = await Promise.all([
      readAllRows<AmountRow>((from, to) =>
        supabase
          .from("work_budget_allocations")
          .select("task_id,amount", { count: "exact" })
          .in("task_id", ids)
          .is("subtask_id", null)
          .eq("status", "approved")
          .order("id")
          .range(from, to),
      ),
      fetchWorkExpenseTotals(ids),
    ]);
    const settlements = ids.flatMap((id) => {
      const settled = expenses.get(id)?.settled;
      return settled == null ? [] : [{ task_id: id, actual_spent: settled / 100 }];
    });
    for (const [id, total] of taskFinanceTotals(ids, allocations, settlements))
      totals.set(id, total);
  }
  return totals;
}
