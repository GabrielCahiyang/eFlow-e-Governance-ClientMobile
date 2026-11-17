import { supabase } from "../../../platform/supabase";

async function fetchDepartmentSummary(office: string, year: number) {
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
  return { data, amount };
}

export async function officeFinancialSummary(office: string, year: number) {
  const result = await fetchDepartmentSummary(office, year);
  if (!result) return null;
  const { data, amount } = result;
  return {
    approved: amount(data.approvedAmount),
    released: amount(data.budgetReleasedAmount),
    pending: amount(data.heldAmount),
    settled: amount(data.spentAmount),
    available: amount(data.availableAmount),
  };
}

export type OfficeBudgetPosition = {
  approved?: number;
  released?: number;
  pending?: number;
  settled?: number;
  available?: number;
  committed?: number;
  dailyLimit?: number;
  releasedToday?: number;
  scheduledToday?: number;
  dailyRemaining?: number;
};

/** Full Office budget and daily cash-control position from department_budget_summary. */
export async function officeBudgetPosition(
  office: string,
  year: number,
): Promise<OfficeBudgetPosition | null> {
  const result = await fetchDepartmentSummary(office, year);
  if (!result) return null;
  const { data, amount } = result;
  return {
    approved: amount(data.approvedAmount),
    released: amount(data.budgetReleasedAmount),
    pending: amount(data.heldAmount),
    settled: amount(data.spentAmount),
    available: amount(data.availableAmount),
    committed: amount(data.committedAmount),
    dailyLimit: amount(data.dailyPettyCashReleaseLimit ?? data.pettyCashLimit),
    releasedToday: amount(data.releasedToday),
    scheduledToday: amount(data.scheduledToday),
    dailyRemaining: amount(
      data.dailyReleaseRemaining ?? data.pettyCashAvailable,
    ),
  };
}
