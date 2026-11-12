import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Sheet,
  peso,
} from "../../components/ui";
import { draftStore } from "../../../platform/draftStore";
import { useAuth } from "../authentication";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import {
  saveSharedWork,
  sharedWorkRpc,
  type SharedWorkRequest,
} from "../../shared/sharedWorkRequest";
import { PublicMessageError } from "../../shared/userMessages";
import { nativeWindow } from "../../../platform/webRuntime";
import { isAllocationReceipt } from "./subtaskDistribution";

type Source = {
  id: string;
  name: string;
  available: number;
  fiscal_year?: number;
};
type AllocationContext = {
  canAllocate: boolean;
  ready?: boolean;
  funds?: Source[];
  lines?: (Source & { sourceId?: string; fiscalYear?: number })[];
};

export function WorkAllocationCard({
  task,
  readOnly,
  showWebSetup,
  onSaved,
}: {
  task: string;
  readOnly: boolean;
  showWebSetup: boolean;
  onSaved: () => Promise<void>;
}) {
  const actor = useAuth().profile?.id || "";
  const key = JSON.stringify([actor, task]);
  const scope = "work-allocation:" + task + ":";
  const facts = useFacts(
    "work-allocation:" + key,
    () =>
      sharedWorkRpc<AllocationContext>("m7_work_allocation_context", {
        p_task: task,
        p_node: null,
      }),
    !!actor && !readOnly,
  );
  const recovery = useFacts(
    "work-allocation-recovery:" + key,
    () => draftStore.get<SharedWorkRequest>(actor, scope),
    !!actor,
  );
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const action = useAction();
  const context = facts.data;
  const lines = context?.lines ?? [];
  const allocated = new Set(lines.map((line) => line.sourceId));
  const year = lines[0]?.fiscalYear;
  const sources = (context?.funds ?? []).filter(
    (source) =>
      source.available > 0 &&
      !allocated.has(source.id) &&
      (!year || year === source.fiscal_year),
  );
  const chosen = sources.find((source) => source.id === sourceId);
  const ready =
    context?.canAllocate &&
    context.ready &&
    !readOnly &&
    !facts.error &&
    !facts.loading &&
    !recovery.loading &&
    !recovery.error;
  const retry = !!recovery.data;

  const submit = () =>
    void action.run(async () => {
      let request = recovery.data;
      if (!request) {
        if (
          !ready ||
          !chosen ||
          !/^\d+(?:\.\d{1,2})?$/.test(amount.trim()) ||
          !Number.isFinite(Number(amount)) ||
          Number(amount) <= 0 ||
          Number(amount) > chosen.available ||
          !reason.trim()
        )
          throw new PublicMessageError(
            "Choose a funding account, a positive amount within its balance, and a reason.",
          );
        const id = crypto.randomUUID();
        request = {
          id,
          args: {
            p_task: task,
            p_lines: [{ sourceId: chosen.id, amount: Number(amount) }],
            p_reason: reason.trim(),
            p_key: id,
          },
        };
      }
      const matchesScope =
        request.args.p_task === task && request.args.p_key === request.id;
      if (!matchesScope)
        throw new PublicMessageError(
          "The saved allocation belongs to different work.",
        );
      try {
        await saveSharedWork(
          actor,
          scope,
          "allocate_project_task_funding",
          request,
          isAllocationReceipt,
          retry,
        );
      } finally {
        await recovery.refresh();
      }
      setOpen(false);
      setAmount("");
      setReason("");
      setSourceId("");
      nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
      await Promise.allSettled([facts.refresh(), onSaved()]);
    }, "Allocation saved.");

  if (!retry && !context?.canAllocate)
    return showWebSetup && !facts.loading && (!context || !!facts.error) ? (
      <Notice>Set up funding in eFlow Web.</Notice>
    ) : null;
  return (
    <Card title="Allocate from the project">
      {retry ? (
        <Button variant="outline" busy={action.busy} onPress={submit}>
          Verify saved allocation
        </Button>
      ) : ready && sources.length ? (
        <Button
          variant="outline"
          onPress={() => {
            action.clear();
            setOpen(true);
          }}
        >
          Allocate Task funding
        </Button>
      ) : (
        <Notice>
          {readOnly
            ? "Funding allocation is read-only."
            : "No eligible funding account is available."}
        </Notice>
      )}
      {!!action.notice && <Notice>{action.notice}</Notice>}
      {!open && !!action.error && (
        <ErrorState error={action.error} context="action" />
      )}
      {open && (
        <Sheet
          open
          title="Allocate Task funding"
          busy={action.busy}
          onClose={() => {
            if (!action.busy) setOpen(false);
          }}
        >
          <Choice
            label="Funding account"
            value={sourceId}
            onChange={setSourceId}
            disabled={action.busy || retry}
            options={sources.map((source) => ({
              value: source.id,
              label: source.name,
            }))}
          />
          {!!chosen && (
            <LabelValue
              label="Available balance"
              value={peso(chosen.available)}
            />
          )}
          <Field
            label="Amount to allocate"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!action.busy && !retry}
          />
          <Field
            label="Reason"
            value={reason}
            onChangeText={setReason}
            editable={!action.busy && !retry}
            maxLength={3000}
            multiline
          />
          {!!action.error && (
            <ErrorState error={action.error} context="action" />
          )}
          <Button
            busy={action.busy}
            disabled={
              !retry && (!ready || !chosen || !amount.trim() || !reason.trim())
            }
            onPress={submit}
          >
            {retry ? "Verify saved allocation" : "Save allocation"}
          </Button>
        </Sheet>
      )}
    </Card>
  );
}
