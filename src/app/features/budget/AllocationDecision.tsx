import { useState } from "react";
import {
  Button,
  ErrorState,
  Field,
  Notice,
  Row,
  Sheet,
} from "../../components/ui";
import { useAuth } from "../authentication";
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
  const { profile } = useAuth(),
    [decision, setDecision] = useState<"approve" | "reject">(),
    [reason, setReason] = useState(""),
    action = useFinancialAction(
      profile!.id,
      "allocation:" + allocation.id,
      JSON.stringify([allocation.id, allocation.status, allocation.decidedAt]),
    );
  return (
    <>
      <Row>
        <Button onPress={() => setDecision("approve")}>
          Approve funding allocation
        </Button>
        <Button variant="danger" onPress={() => setDecision("reject")}>
          Reject funding allocation
        </Button>
      </Row>
      <Sheet
        open={!!decision}
        title={
          decision === "approve" ? "Approve allocation" : "Reject allocation"
        }
        busy={action.busy}
        onClose={() => setDecision(undefined)}
      >
        <Notice>
          Funding authorization and cash release are separate. Only an authorized independent reviewer can approve this request.
        </Notice>
        <Field
          label="Decision reason"
          multiline
          value={reason}
          onChangeText={setReason}
        />
        <Button
          variant={decision === "reject" ? "danger" : "primary"}
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (!reason.trim()) throw new Error("Record a decision reason.");
              await decideWorkBudgetAllocation(
                allocation.id,
                decision === "approve",
                reason,
              );
              setDecision(undefined);
              await onSaved();
            })
          }
        >
          Confirm {decision}
        </Button>
        {!!action.error && <ErrorState context="action" error={action.error} />}
      </Sheet>
      {!decision && !!action.error && <ErrorState context="action" error={action.error} />}
    </>
  );
}
