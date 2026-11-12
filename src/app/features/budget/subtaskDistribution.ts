import type {
  SubtaskBudgetRow,
  TaskFundingContext,
} from "../../../core/web/app/features/budget/types";
import type { SharedWorkRequest } from "../../shared/sharedWorkRequest";
import { PublicMessageError } from "../../shared/userMessages";
import { recordedPeso } from "../../components/ui/theme";

export type DistributionMode = "save" | "return";

export function distributionLimits(
  context: TaskFundingContext,
  row: SubtaskBudgetRow,
  sourceId: string,
) {
  const source = context.parentSources?.find(({ id }) => id === sourceId);
  const sameSource = row.sourceId === sourceId;
  const minimum = Math.max(
    1,
    Math.round(row.amount * 100) - Math.round(row.returnable * 100),
  );
  const maximum = Math.round(
    (row.finished
      ? row.amount
      : (source?.available ?? 0) + (sameSource ? row.amount : 0)) * 100,
  );
  return { source, minimum, maximum };
}

export function buildDistributionRequest(
  context: TaskFundingContext,
  subtaskId: string,
  mode: DistributionMode,
  input: {
    source: string;
    amount: string;
    reason: string;
    expectedCapId?: string;
  },
  id: string,
): SharedWorkRequest {
  const row = context.subtaskBudgets?.find((item) => item.id === subtaskId);
  if (!context.canManageDistribution || !row)
    throw new PublicMessageError(
      "Only the current task lead can change this budget.",
    );
  if (row.capId !== input.expectedCapId)
    throw new PublicMessageError(
      "The subtask budget changed. Close this form and open it again.",
    );
  if (row.blocked)
    throw new PublicMessageError(
      "Resolve the open cash request before changing this budget.",
    );
  const reason = input.reason.trim();
  if (!reason || reason.length > 3000)
    throw new PublicMessageError("Enter a reason for this budget change.");
  if (mode === "return") {
    if (!row.capId || row.returnable <= 0)
      throw new PublicMessageError("There is no unused budget to return.");
    return {
      id,
      args: {
        p_cap_allocation_id: row.capId,
        p_reason: reason,
        p_idempotency_key: id,
      },
    };
  }
  const { source, minimum, maximum } = distributionLimits(
    context,
    row,
    input.source,
  );
  if (
    !source ||
    ((row.hasHistory || row.finished) && row.sourceId !== source.id)
  )
    throw new PublicMessageError(
      "Choose an eligible account from the approved task budget.",
    );
  const amount = input.amount.trim();
  const cents = Math.round(Number(amount) * 100);
  if (
    !/^\d+(?:\.\d{1,2})?$/.test(amount) ||
    !Number.isSafeInteger(cents) ||
    cents <= 0
  )
    throw new PublicMessageError(
      "Enter a positive amount with up to two decimal places.",
    );
  if (cents < minimum)
    throw new PublicMessageError(
      `Keep at least ${recordedPeso(minimum / 100)} for recorded spending.`,
    );
  if (cents > maximum)
    throw new PublicMessageError(
      `Only ${recordedPeso(maximum / 100)} is available from ${source.name}.`,
    );
  return {
    id,
    args: {
      p_task_id: context.taskId,
      p_subtask_id: subtaskId,
      p_parent_allocation_line_id: source.id,
      p_amount: cents / 100,
      p_reason: reason,
      p_idempotency_key: id,
    },
  };
}

export function isAllocationReceipt(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
  );
}
