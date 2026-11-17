import { sharedWorkRpc } from "../../shared/sharedWorkRequest";
import type { SharedWorkRequest } from "../../shared/sharedWorkRequest";
import { PublicMessageError } from "../../shared/userMessages";

export type WorkFinancialClearance = {
  version: 1;
  rootId: string;
  nodeId: string | null;
  workAccepted: boolean;
  cashOutstanding: boolean;
  completed: boolean;
  canFinalize: boolean;
};
export async function fetchWorkFinancialClearance(root: string, node?: string) {
  const data = await sharedWorkRpc<WorkFinancialClearance>(
    "work_financial_clearance",
    {
      p_root: root,
      p_node: node ?? null,
    },
  );
  if (
    data?.version !== 1 ||
    data.rootId !== root ||
    data.nodeId !== (node ?? null) ||
    [
      data.workAccepted,
      data.cashOutstanding,
      data.completed,
      data.canFinalize,
    ].some((value) => typeof value !== "boolean")
  )
    throw new PublicMessageError(
      "Financial clearance could not be verified. Refresh before continuing.",
    );
  return data;
}
export type ReceiptSubmissionClearance = {
  version: 1;
  requestId: string;
  workAccepted: boolean;
  canSubmit: boolean;
};
export async function fetchReceiptSubmissionClearance(request: string) {
  const data = await sharedWorkRpc<ReceiptSubmissionClearance>(
    "receipt_submission_clearance",
    { p_request: request },
  );
  if (
    data?.version !== 1 ||
    data.requestId !== request ||
    typeof data.workAccepted !== "boolean" ||
    typeof data.canSubmit !== "boolean"
  )
    throw new PublicMessageError(
      "Receipt submission access could not be verified.",
    );
  return data;
}
export type CashReturnClearance = {
  version: 1;
  liquidationId: string;
  packageVersion: number;
  amount: number;
  received: boolean;
  approved: boolean;
  receivedBy: string | null;
  approvedBy: string | null;
  reference: string | null;
  canAcknowledge: boolean;
  canApprove: boolean;
};
export async function fetchCashReturnClearance(liquidation: string) {
  const data = await sharedWorkRpc<CashReturnClearance>(
    "cash_return_clearance",
    { p_liquidation: liquidation },
  );
  if (
    data?.version !== 1 ||
    data.liquidationId !== liquidation ||
    !Number.isInteger(data.packageVersion) ||
    !Number.isFinite(data.amount) ||
    data.amount < 0 ||
    [data.received, data.approved, data.canAcknowledge, data.canApprove].some(
      (value) => typeof value !== "boolean",
    )
  )
    throw new PublicMessageError(
      "The cash return could not be verified. Refresh before deciding.",
    );
  return data;
}

/** Old clients remain safe; work acceptance needs the new shared contract. */
export async function assertWorkAcceptanceAvailable(
  root: string,
  node?: string,
) {
  await fetchWorkFinancialClearance(root, node);
}

function savedRequest(value: unknown): value is SharedWorkRequest {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.id) &&
    "args" in value &&
    !!value.args &&
    typeof value.args === "object" &&
    !Array.isArray(value.args)
  );
}
export function verifySavedReturn(
  value: unknown,
  liquidation: string,
  version: number,
  amount: number,
): SharedWorkRequest | undefined {
  if (value == null) return undefined;
  if (
    !savedRequest(value) ||
    value.args.p_liquidation !== liquidation ||
    value.args.p_version !== version ||
    value.args.p_amount !== amount ||
    value.args.p_key !== value.id ||
    !["acknowledge", "approve"].includes(String(value.args.p_action)) ||
    typeof value.args.p_reference !== "string" ||
    !value.args.p_reference.trim() ||
    value.args.p_reference.length > 2000 ||
    Object.keys(value.args).some(
      (key) =>
        ![
          "p_liquidation",
          "p_version",
          "p_action",
          "p_amount",
          "p_reference",
          "p_key",
        ].includes(key),
    )
  )
    throw new PublicMessageError(
      "The saved cash-return action could not be verified. Check the original record before continuing.",
    );
  return value;
}
export function verifySavedCompletion(
  value: unknown,
  root: string,
  node?: string,
): SharedWorkRequest | undefined {
  if (value == null) return undefined;
  if (
    !savedRequest(value) ||
    value.args.p_root !== root ||
    value.args.p_node !== (node ?? null) ||
    Object.keys(value.args).some((key) => !["p_root", "p_node"].includes(key))
  )
    throw new PublicMessageError(
      "The saved completion could not be verified. Check the original work before continuing.",
    );
  return value;
}
