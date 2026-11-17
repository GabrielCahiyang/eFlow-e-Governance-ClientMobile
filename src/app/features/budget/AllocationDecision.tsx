import { useState } from "react";
import Check from "lucide-react-native/icons/check";
import X from "lucide-react-native/icons/x";
import {
  Button,
  ErrorState,
  Field,
  Notice,
  Row,
  Sheet,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { PublicMessageError } from "../../shared/userMessages";
import { useFinancialAction } from "./useFinancialCommand";
import { decideWorkBudgetAllocation } from "../../../core/web/app/features/budget/services/budgetService";
import type { WorkBudgetAllocation } from "../../../core/web/app/features/budget/types";
export function AllocationDecision({
  allocation,
  onSaved,
}: {
  allocation: WorkBudgetAllocation;
  onSaved: () => Promise<void>;
}) {
  const palette = useTheme(),
    { profile } = useAuth(),
    [decision, setDecision] = useState<"approve" | "reject">(),
    action = useFinancialAction(
      profile!.id,
      "allocation:" + allocation.id,
      JSON.stringify([allocation.id, allocation.status, allocation.decidedAt]),
    );
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(
      profile?.id,
      "allocation-decision:" + allocation.id + ":" + (decision ?? "none"),
    ),
    !!decision,
    () => ({ reason: "" }),
  );
  const reason = draft.reason;
  return (
    <>
      <Row>
        <Button
          icon={<Check size={15} color={palette.onPrimary} />}
          onPress={() => {
            action.clear();
            setDecision("approve");
          }}
        >
          Approve funding allocation
        </Button>
        <Button
          variant="danger"
          icon={<X size={15} color={palette.onDanger} />}
          onPress={() => {
            action.clear();
            setDecision("reject");
          }}
        >
          Reject funding allocation
        </Button>
      </Row>
      <Sheet
        actionError={action.error}
        open={!!decision}
        title={
          decision === "approve" ? "Approve allocation" : "Reject allocation"
        }
        busy={action.busy}
        onClose={() => {
          if (!action.busy) {
            action.clear();
            setDecision(undefined);
          }
        }}
      >
        <Notice>
          Funding authorization and cash release are separate. Only an authorized independent reviewer can approve this request.
        </Notice>
        <Field
          label="Decision reason"
          multiline
          value={reason}
          onChangeText={(next) => updateDraft({ reason: next })}
        />
        <Button
          variant={decision === "reject" ? "danger" : "primary"}
          busy={action.busy}
          icon={
            decision === "reject" ? (
              <X size={15} color={palette.onDanger} />
            ) : (
              <Check size={15} color={palette.onPrimary} />
            )
          }
          onPress={() =>
            void action.run(async () => {
              if (!reason.trim()) throw new PublicMessageError("Record a decision reason.");
              await decideWorkBudgetAllocation(
                allocation.id,
                decision === "approve",
                reason,
              );
              clearDraft();
              setDecision(undefined);
              await onSaved();
            }, decision === "approve" ? "Allocation approved." : "Allocation rejected.")
          }
        >
          {decision === "approve" ? "Confirm approval" : "Confirm rejection"}
        </Button>
      </Sheet>
      {!decision && !!action.error && <ErrorState context="action" error={action.error} />}
    </>
  );
}
