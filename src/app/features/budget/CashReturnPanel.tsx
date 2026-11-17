import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  peso,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { saveSharedWork } from "../../shared/sharedWorkRequest";
import { draftStore } from "../../../platform/draftStore";
import { PublicMessageError } from "../../shared/userMessages";
import { confirmAction } from "../../shared/confirm";
import { useCashRequestUpdates } from "./useCashRequestUpdates";
import {
  fetchCashReturnClearance,
  verifySavedReturn,
  type CashReturnClearance,
} from "./workFinancialClearance";

export function CashReturnPanel({
  liquidationId,
  rootId,
  version,
  amount,
  readOnly,
  onSaved,
}: {
  liquidationId: string;
  rootId: string;
  version: number;
  amount: number;
  readOnly?: boolean;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const actor = profile?.id;
  const action = useAction();
  const { toast } = useToast();
  const scope = `cash-return:${liquidationId}:${version}`;
  const facts = useFacts(
    `cash-return:${actor}:${liquidationId}:${version}`,
    () => fetchCashReturnClearance(liquidationId),
    !!actor && amount > 0,
  );
  const recovery = useFacts(
    `cash-return-recovery:${actor}:${scope}`,
    async () =>
      verifySavedReturn(
        await draftStore.get(actor!, scope),
        liquidationId,
        version,
        amount,
      ),
    !!actor && amount > 0,
  );
  useCashRequestUpdates(rootId, !!actor && amount > 0, facts.refresh);
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(actor, scope),
    true,
    () => ({ reference: "" }),
  );
  if (!(amount > 0)) return null;
  const current = facts.loading || facts.error ? undefined : facts.data;
  const permitted =
    !!current &&
    current.packageVersion === version &&
    current.amount === amount;
  const send = (kind: "acknowledge" | "approve") =>
    void action
      .run(async () => {
        if (!actor) throw new PublicMessageError("Sign in again.");
        const pending = recovery.data;
        const fresh = await fetchCashReturnClearance(liquidationId);
        if (
          !pending &&
          (fresh.packageVersion !== version ||
            fresh.amount !== amount ||
            !(kind === "acknowledge" ? fresh.canAcknowledge : fresh.canApprove))
        )
          throw new PublicMessageError(
            "The return or your authority changed. Refresh the receipt package.",
          );
        if (!pending && !draft.reference.trim())
          throw new PublicMessageError(
            "Enter the receiving reference or approval note.",
          );
        if (
          !pending &&
          !(await confirmAction(
            kind === "acknowledge"
              ? "Acknowledge cash received?"
              : "Approve this cash return?",
            kind === "acknowledge"
              ? `Confirm you physically received ${peso(amount)}. This does not approve the return.`
              : `Verify the ${peso(amount)} return and Accounting acknowledgment. Settlement is a separate action.`,
            kind === "acknowledge" ? "Acknowledge receipt" : "Approve return",
          ))
        )
          return;
        const key = pending?.id ?? crypto.randomUUID();
        const expected = pending?.args.p_action ?? kind;
        await saveSharedWork<CashReturnClearance>(
          actor,
          scope,
          "record_cash_return",
          pending ?? {
            id: key,
            args: {
              p_liquidation: liquidationId,
              p_version: version,
              p_action: kind,
              p_amount: amount,
              p_reference: draft.reference.trim(),
              p_key: key,
            },
          },
          (value): value is CashReturnClearance =>
            !!value &&
            typeof value === "object" &&
            "liquidationId" in value &&
            value.liquidationId === liquidationId &&
            "packageVersion" in value &&
            value.packageVersion === version &&
            (expected === "acknowledge"
              ? "received" in value && value.received === true
              : "approved" in value && value.approved === true),
          !!pending,
        );
        clearDraft();
        toast(
          expected === "acknowledge"
            ? "Cash receipt acknowledged. Head approval is still required."
            : "Cash return approved. Settlement is still required.",
          "success",
        );
        await Promise.all([facts.refresh(), recovery.refresh(), onSaved()]);
      })
      .then((success) => {
        if (!success) void recovery.refresh();
      });
  return (
    <Card title="Unused cash return">
      {!!action.error && <ErrorState context="action" error={action.error} />}
      <LabelValue label="Amount to return" value={peso(amount)} />
      {facts.loading && !facts.data ? (
        <Loading label="Checking cash return" layout="verification" />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        <Notice tone={current?.approved ? "success" : "info"}>
          {current?.approved
            ? "Return approved by the Office Head. Financial settlement remains separate."
            : current?.received
              ? "Cash received by Accounting — awaiting Office Head approval."
              : "Accounting must acknowledge the actual cash received before the Office Head can approve the return."}
        </Notice>
      )}
      {!!current?.reference && (
        <LabelValue label="Receiving reference" value={current.reference} />
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {!readOnly &&
        permitted &&
        (current.canAcknowledge || current.canApprove) &&
        !recovery.data &&
        !recovery.loading &&
        !recovery.error && (
          <Field
            label={
              current.canAcknowledge
                ? "Receiving reference"
                : "Return approval note"
            }
            required
            value={draft.reference}
            onChangeText={(reference) => updateDraft({ reference })}
            maxLength={2000}
            multiline
          />
        )}
      {!readOnly &&
        permitted &&
        !recovery.data &&
        !recovery.loading &&
        !recovery.error &&
        current.canAcknowledge && (
          <Button busy={action.busy} onPress={() => send("acknowledge")}>
            Acknowledge cash received
          </Button>
        )}
      {!readOnly &&
        permitted &&
        !recovery.data &&
        !recovery.loading &&
        !recovery.error &&
        current.canApprove && (
          <Button busy={action.busy} onPress={() => send("approve")}>
            Approve cash return
          </Button>
        )}
      {!readOnly && !!recovery.data && (
        <Button
          busy={action.busy}
          disabled={
            facts.loading ||
            !!facts.error ||
            recovery.loading ||
            !!recovery.error
          }
          onPress={() =>
            send(
              recovery.data?.args.p_action === "approve"
                ? "approve"
                : "acknowledge",
            )
          }
        >
          Check saved return action
        </Button>
      )}
    </Card>
  );
}
