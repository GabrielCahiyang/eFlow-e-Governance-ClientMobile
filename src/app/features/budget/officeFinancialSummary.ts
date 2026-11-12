import { supabase } from "../../../platform/supabase";

export async function officeFinancialSummary(office: string, year: number) {
  const { data, error } = await supabase.rpc("department_budget_summary", {
    p_org_id: office,
    p_fiscal_year: year,
  });
  if (error) throw error;
  if (!data) return null;
  if (
    Array.isArray(data) ||
    !data.id ||
    data.orgId !== office ||
    Number(data.fiscalYear) !== year
  )
    throw new Error("Could not verify this Office and fiscal year.");
  const amount = (value: unknown) =>
    (typeof value === "number" ||
      (typeof value === "string" && !!value.trim())) &&
    Number.isFinite(Number(value))
      ? Number(value)
      : undefined;
  return {
    approved: amount(data.approvedAmount),
    released: amount(data.budgetReleasedAmount),
    pending: amount(data.heldAmount),
    settled: amount(data.spentAmount),
    available: amount(data.availableAmount),
  };
}
