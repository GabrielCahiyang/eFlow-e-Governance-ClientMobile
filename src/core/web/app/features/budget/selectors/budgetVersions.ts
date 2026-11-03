import type { BudgetAccountSnapshot, OfficeBudgetVersion } from "../types";
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
export function budgetVersionChanges(
  before: OfficeBudgetVersion,
  after: OfficeBudgetVersion,
) {
  const old = new Map(before.accounts.map((row) => [row.id, row])),
    next = new Map(after.accounts.map((row) => [row.id, row]));
  const changes: {
    account: string;
    field: string;
    before: string;
    after: string;
  }[] = [];
  const values = (row: BudgetAccountSnapshot, accounts: typeof old) => ({
    Name: row.name,
    Budget: peso.format(row.amount),
    "For later release": peso.format(row.heldAmount),
    "Account code": row.accountCode || "None",
    "Parent account": row.parentId
      ? accounts.get(row.parentId)?.name || "Parent account"
      : "None",
    "Release schedule":
      (row.releaseSchedule || [])
        .map((r) => `${r.date}: ${peso.format(r.amount)} (${r.status})`)
        .join("; ") || "None",
    Order: String(row.position + 1),
  });
  for (const [id, row] of next) {
    const prior = old.get(id);
    if (!prior) {
      changes.push({
        account: row.name,
        field: "Added",
        before: "—",
        after: peso.format(row.amount),
      });
      continue;
    }
    const a = values(prior, old),
      b = values(row, next);
    for (const field of Object.keys(a) as (keyof typeof a)[])
      if (a[field] !== b[field])
        changes.push({
          account: row.name,
          field,
          before: a[field],
          after: b[field],
        });
  }
  for (const [id, row] of old)
    if (!next.has(id))
      changes.push({
        account: row.name,
        field: "Removed",
        before: peso.format(row.amount),
        after: "—",
      });
  if (before.q4Target !== after.q4Target && after.q4Target !== undefined)
    changes.push({
      account: "Office budget",
      field: "Q4 utilization target",
      before:
        before.q4Target === undefined ? "Not recorded" : `${before.q4Target}%`,
      after: `${after.q4Target}%`,
    });
  return changes;
}
