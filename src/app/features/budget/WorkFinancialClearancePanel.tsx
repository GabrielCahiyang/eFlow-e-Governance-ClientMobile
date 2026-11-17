import { Button, Card, ErrorState, Notice } from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { saveSharedWork } from "../../shared/sharedWorkRequest";
import { draftStore } from "../../../platform/draftStore";
import { confirmAction } from "../../shared/confirm";
import { nativeWindow } from "../../../platform/webRuntime";
import { PublicMessageError } from "../../shared/userMessages";
import {
  fetchWorkFinancialClearance,
  verifySavedCompletion,
  type WorkFinancialClearance,
} from "./workFinancialClearance";
import { useCashRequestUpdates } from "./useCashRequestUpdates";

export function WorkFinancialClearancePanel({
  root,
  node,
  readOnly,
  onSaved,
}: {
  root: string;
  node?: string;
  readOnly: boolean;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const actor = profile?.id;
  const action = useAction();
  const { toast } = useToast();
  const scope = `finalize-clearance:${root}:${node ?? "task"}`;
  const facts = useFacts(
    `work-financial-clearance:${actor}:${root}:${node ?? ""}`,
    () => fetchWorkFinancialClearance(root, node),
    !!actor,
  );
  const recovery = useFacts(
    `clearance-recovery:${actor}:${scope}`,
    async () =>
      verifySavedCompletion(await draftStore.get(actor!, scope), root, node),
    !!actor,
  );
  useCashRequestUpdates(root, !!actor, facts.refresh, node, false, true);
  const current = facts.error || facts.loading ? undefined : facts.data;
  if (!facts.error && !current?.workAccepted && !recovery.data) return null;
  return (
    <Card title="Financial clearance">
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        <Notice tone={current?.cashOutstanding ? "warning" : "info"}>
          {current?.completed
            ? "Completion confirmed."
            : current?.cashOutstanding
              ? "Work accepted. Required receipts, cash returns and settlement must be cleared before completion."
              : "Work accepted and financial clearance confirmed. The authorized lead can mark this work complete."}
        </Notice>
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {!readOnly && (current?.canFinalize || recovery.data) && (
        <Button
          busy={action.busy}
          disabled={
            facts.loading ||
            !!facts.error ||
            recovery.loading ||
            !!recovery.error
          }
          onPress={() =>
            void action
              .run(async () => {
                if (!actor) throw new PublicMessageError("Sign in again.");
                const fresh = await fetchWorkFinancialClearance(root, node);
                if (!recovery.data && !fresh.canFinalize)
                  throw new PublicMessageError(
                    "Financial clearance or your authority changed. Refresh this work.",
                  );
                if (
                  !recovery.data &&
                  !(await confirmAction(
                    "Mark this work complete?",
                    "Work acceptance and financial clearance will be checked again. Unused funding stays with this project.",
                    "Mark as complete",
                  ))
                )
                  return;
                await saveSharedWork<WorkFinancialClearance>(
                  actor,
                  scope,
                  "finalize_cleared_work",
                  recovery.data ?? {
                    id: crypto.randomUUID(),
                    args: { p_root: root, p_node: node ?? null },
                  },
                  (value): value is WorkFinancialClearance =>
                    !!value &&
                    typeof value === "object" &&
                    "rootId" in value &&
                    value.rootId === root &&
                    "nodeId" in value &&
                    value.nodeId === (node ?? null) &&
                    "completed" in value &&
                    value.completed === true,
                  !!recovery.data,
                );
                toast("Work completed.", "success");
                nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
                nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
                await Promise.all([
                  facts.refresh(),
                  recovery.refresh(),
                  onSaved(),
                ]);
              })
              .then((success) => {
                if (!success) void recovery.refresh();
              })
          }
        >
          {recovery.data ? "Check saved completion" : "Mark as complete"}
        </Button>
      )}
    </Card>
  );
}
