// Presentation labels are keyed by stable server codes. A future settings
// source can supply labels without changing workflow rules or filter values.
const shared: Readonly<Record<string, string>> = {
  pending_assignment: "Needs assignment",
  todo: "To do",
  in_progress: "In progress",
  for_review: "Awaiting approval",
  pending_review: "Awaiting approval",
  changes_requested: "Changes requested",
  completed: "Completed",
  done: "Completed",
};

const finance: Readonly<Record<string, string>> = {
  pending: "Requested",
  pending_leader_review: "Awaiting lead review",
  leader_changes_requested: "Changes requested by lead",
  pending_department_approval: "Awaiting Office approval",
  department_changes_requested: "Changes requested by Office",
  approved: "Authorized",
  scheduled_for_release: "Scheduled for release",
  partially_released: "Partially released",
  liquidation_draft: "Liquidation draft",
  liquidation_submitted: "Liquidation submitted",
  pending_leader_liquidation_review: "Awaiting lead liquidation review",
  pending_department_settlement: "Awaiting Office settlement",
  overdue_liquidation: "Liquidation overdue",
  receipt_review: "Awaiting receipt review",
  receipt_approved: "Receipts endorsed",
};

export type StatusLabelOverrides = Readonly<
  Partial<Record<"shared" | "finance", Readonly<Record<string, string>>>>
>;

function labelFor(
  labels: Readonly<Record<string, string>> | undefined,
  code: string,
) {
  return labels && Object.prototype.hasOwnProperty.call(labels, code)
    ? labels[code]?.trim()
    : undefined;
}

export function statusLabel(
  code: string,
  domain?: "finance",
  overrides?: StatusLabelOverrides,
): string {
  const label =
    (domain &&
      (labelFor(overrides?.[domain], code) || labelFor(finance, code))) ||
    labelFor(overrides?.shared, code) ||
    labelFor(shared, code);
  if (label) return label;
  const text = code.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
