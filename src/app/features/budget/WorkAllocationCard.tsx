import { useState } from "react";
import Check from "lucide-react-native/icons/check";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Wallet from "lucide-react-native/icons/wallet";
import {
  Button,
  Card,
  Choice,
  DetailGroup,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Sheet,
  peso,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { draftStore } from "../../../platform/draftStore";
import { useAuth } from "../authentication";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
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
type AllocationLine = {
  id: string;
  taskId?: string;
  name?: string;
  source?: string;
  sourceId?: string;
  fiscalYear?: number;
  quarter?: number;
  amount?: number;
  available: number;
};
type AllocationContext = {
  canAllocate: boolean;
  canReturn?: boolean;
  reason?: string;
  ready?: boolean;
  funds?: Source[];
  lines?: AllocationLine[];
};

export function WorkAllocationCard({
  task,
  projectId,
  taskFinished = false,
  taskSchedule,
  readOnly,
  nested = false,
  onSaved,
}: {
  task: string;
  projectId?: string;
  taskFinished?: boolean;
  taskSchedule?: { start?: string; end?: string };
  readOnly: boolean;
  nested?: boolean;
  onSaved: () => Promise<void>;
}) {
  const actor = useAuth().profile?.id || "";
  const { toast } = useToast();
  const palette = useTheme();
  const key = JSON.stringify([actor, task, projectId, taskFinished]);
  const scope = "work-allocation:" + task + ":";
  const returnScope = "work-allocation-return:" + task + ":";
  const facts = useFacts(
    "work-allocation:" + key,
    async () => {
      const current = await sharedWorkRpc<AllocationContext>(
        "m7_work_allocation_context",
        {
          p_task: task,
          p_node: null,
        },
      );
      if (
        !current.canAllocate &&
        current.reason === "task_closed" &&
        projectId
      ) {
        const snapshot = await sharedWorkRpc<{
          canAllocate?: boolean;
          ready?: boolean;
          taskFunding?: AllocationLine[];
        }>("project_flow_snapshot", { p_project: projectId });
        if (snapshot?.canAllocate) {
          return {
            canAllocate: false,
            canReturn: true,
            ready: snapshot.ready,
            lines: (snapshot.taskFunding ?? []).filter(
              (line) => !line.taskId || line.taskId === task,
            ),
          };
        }
      }
      return current;
    },
    !!actor && !readOnly,
  );
  const recovery = useFacts(
    "work-allocation-recovery:" + key,
    () => draftStore.get<SharedWorkRequest>(actor, scope),
    !!actor,
  );
  const returnRecovery = useFacts(
    "work-allocation-return-recovery:" + key,
    () => draftStore.get<SharedWorkRequest>(actor, returnScope),
    !!actor,
  );
  const [open, setOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const action = useAction();
  const context = facts.data;
  const lines = context?.lines ?? [];
  const returnableLines = lines.filter((line) => line.available > 0);
  const [allocDraft, updateAllocDraft, clearAllocDraft] = useRetainedDraft(
    formDraftKey(actor, "work-alloc-add:" + task),
    open,
    () => ({ sourceId: "", amount: "", reason: "" }),
  );
  const [returnDraft, updateReturnDraft, clearReturnDraft] = useRetainedDraft(
    formDraftKey(actor, "work-alloc-ret:" + task),
    returnOpen,
    () => ({
      returnLineId: returnableLines[0]?.id ?? "",
      returnReason: "",
    }),
  );
  const { sourceId, amount, reason } = allocDraft;
  const { returnLineId, returnReason } = returnDraft;
  const allocated = new Set(lines.map((line) => line.sourceId));
  const year = lines[0]?.fiscalYear;
  const sources = (context?.funds ?? []).filter(
    (source) =>
      source.available > 0 &&
      !allocated.has(source.id) &&
      (!year || year === source.fiscal_year),
  );
  const chosen = sources.find((source) => source.id === sourceId);
  const chosenReturn =
    returnableLines.find((line) => line.id === returnLineId) ??
    returnableLines[0];
  const ready =
    context?.canAllocate &&
    !taskFinished &&
    context.ready &&
    !readOnly &&
    !facts.error &&
    !recovery.loading &&
    !recovery.error;
  const canReturn =
    (context?.canAllocate || context?.canReturn) &&
    returnableLines.length > 0 &&
    !readOnly &&
    !facts.error &&
    !returnRecovery.loading &&
    !returnRecovery.error;
  const retry = !!recovery.data;
  const returnRetry = !!returnRecovery.data;

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
        if (taskSchedule && (!taskSchedule.start || !taskSchedule.end)) {
          throw new PublicMessageError(
            "Set the task start and due dates before allocating funding.",
          );
        }
        if (
          taskSchedule?.start &&
          taskSchedule?.end &&
          chosen.fiscal_year != null &&
          (taskSchedule.start > `${chosen.fiscal_year}-12-31` ||
            taskSchedule.end < `${chosen.fiscal_year}-01-01`)
        ) {
          throw new PublicMessageError(
            `Selected FY ${chosen.fiscal_year} funding does not overlap this task timeline.`,
          );
        }
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
      clearAllocDraft();
      setOpen(false);
      toast("Allocation saved.", "success");
      nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
      await Promise.allSettled([facts.refresh(), onSaved()]);
    }, "Allocation saved.");

  const submitReturn = () =>
    void action.run(async () => {
      let request = returnRecovery.data;
      if (!request) {
        if (
          !canReturn ||
          !chosenReturn ||
          chosenReturn.available <= 0 ||
          !returnReason.trim()
        )
          throw new PublicMessageError(
            "Choose an allocated task account with unused funds and enter a reason.",
          );
        const id = crypto.randomUUID();
        request = {
          id,
          args: {
            p_line: chosenReturn.id,
            p_amount: chosenReturn.available,
            p_reason: returnReason.trim(),
            p_key: id,
          },
        };
      }
      if (
        request.args.p_key !== request.id ||
        typeof request.args.p_line !== "string"
      )
        throw new PublicMessageError(
          "The saved funding return belongs to different work.",
        );
      try {
        await saveSharedWork(
          actor,
          returnScope,
          "release_project_task_funding",
          request,
          (value): value is null | { released?: boolean } =>
            value === null ||
            (!!value &&
              typeof value === "object" &&
              (value as { released?: unknown }).released === true),
          returnRetry,
        );
      } finally {
        await returnRecovery.refresh();
      }
      clearReturnDraft();
      setReturnOpen(false);
      toast("Unused task funding returned.", "success");
      nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
      await Promise.allSettled([facts.refresh(), onSaved()]);
    }, "Unused task funding returned to the project.");

  if (
    !retry &&
    !returnRetry &&
    !context?.canAllocate &&
    !context?.canReturn
  )
    return null;
  const lineLabel = (line: AllocationLine) =>
    `${line.source || line.name || "Project account"}${line.fiscalYear ? ` · FY ${line.fiscalYear}` : ""}${line.quarter ? ` Q${line.quarter}` : ""}`;

  return (
    <Card
      flat={nested}
      title="Allocate from the project"
      icon={
        nested ? undefined : <Wallet size={16} color={palette.primary} />
      }
    >
      {lines.length > 0 && (
        <DetailGroup>
          {lines.map((line) => (
            <LabelValue
              key={line.id}
              label={lineLabel(line)}
              value={`${peso(line.amount ?? line.available)}${line.available > 0 ? ` (${peso(line.available)} unused)` : ""}`}
            />
          ))}
        </DetailGroup>
      )}
      {retry ? (
        <Button
          variant="outline"
          busy={action.busy}
          icon={<Check size={15} color={palette.primary} />}
          onPress={submit}
        >
          Save allocation
        </Button>
      ) : !taskFinished && ready && sources.length ? (
        <Button
          variant="outline"
          icon={<Wallet size={15} color={palette.primary} />}
          onPress={() => {
            action.clear();
            setOpen(true);
          }}
        >
          Allocate Task funding
        </Button>
      ) : !canReturn && !returnRetry ? (
        <Notice tone={readOnly || taskFinished ? "neutral" : "warning"}>
          {readOnly || taskFinished
            ? "Funding allocation is read-only."
            : "No eligible funding account is available."}
        </Notice>
      ) : null}
      {returnRetry ? (
        <Button
          variant="outline"
          busy={action.busy}
          icon={<RotateCcw size={15} color={palette.primary} />}
          onPress={submitReturn}
        >
          Confirm return
        </Button>
      ) : canReturn ? (
        <Button
          variant="outline"
          icon={<RotateCcw size={15} color={palette.primary} />}
          onPress={() => {
            action.clear();
            setReturnOpen(true);
          }}
        >
          Return unused funding
        </Button>
      ) : null}
      {!!action.notice && <Notice tone="neutral">{action.notice}</Notice>}
      {!open && !returnOpen && !!action.error && (
        <ErrorState error={action.error} context="action" />
      )}
      {open && (
        <Sheet
          actionError={action.error}
          open
          title="Allocate Task funding"
          busy={action.busy}
          onClose={() => {
            if (!action.busy) {
              action.clear();
              setOpen(false);
            }
          }}
        >
          <Choice
            label="Funding account"
            required
            value={sourceId}
            onChange={(next) => updateAllocDraft({ sourceId: next })}
            disabled={action.busy || retry}
            options={sources.map((source) => ({
              value: source.id,
              label:
                source.fiscal_year != null
                  ? `${source.name} · FY ${source.fiscal_year}`
                  : source.name,
            }))}
          />
          {!!chosen && (
            <>
              <LabelValue
                label="Available balance"
                value={peso(chosen.available)}
              />
              {chosen.fiscal_year != null && (
                <LabelValue
                  label="Fiscal year"
                  value={`FY ${chosen.fiscal_year}`}
                />
              )}
            </>
          )}
          <Field
            label="Amount to allocate"
            required
            value={amount}
            onChangeText={(next) => updateAllocDraft({ amount: next })}
            keyboardType="decimal-pad"
            editable={!action.busy && !retry}
          />
          <Field
            label="Reason"
            required
            value={reason}
            onChangeText={(next) => updateAllocDraft({ reason: next })}
            editable={!action.busy && !retry}
            maxLength={3000}
            multiline
          />
          <Button
            busy={action.busy}
            icon={<Check size={15} color={palette.onPrimary} />}
            disabled={
              !retry && (!ready || !chosen || !amount.trim() || !reason.trim())
            }
            onPress={submit}
          >
            Save allocation
          </Button>
        </Sheet>
      )}
      {returnOpen && (
        <Sheet
          actionError={action.error}
          open
          title="Return unused Task funding"
          busy={action.busy}
          onClose={() => {
            if (!action.busy) {
              action.clear();
              setReturnOpen(false);
            }
          }}
        >
          {returnableLines.length > 1 && (
            <Choice
              label="Allocated account"
              required
              value={chosenReturn?.id ?? ""}
              onChange={(next) => updateReturnDraft({ returnLineId: next })}
              disabled={action.busy || returnRetry}
              options={returnableLines.map((line) => ({
                value: line.id,
                label: `${lineLabel(line)} (${peso(line.available)} unused)`,
              }))}
            />
          )}
          {!!chosenReturn && (
            <LabelValue
              label="Unused amount to return"
              value={peso(chosenReturn.available)}
            />
          )}
          <Notice>
            Return unused funding to the project budget. Existing spending, cash
            advances, and subtask allocations remain protected.
          </Notice>
          <Field
            label="Reason"
            required
            value={returnReason}
            onChangeText={(next) => updateReturnDraft({ returnReason: next })}
            editable={!action.busy && !returnRetry}
            maxLength={3000}
            multiline
          />
          <Button
            busy={action.busy}
            icon={<RotateCcw size={15} color={palette.onPrimary} />}
            disabled={
              !returnRetry &&
              (!canReturn || !chosenReturn || !returnReason.trim())
            }
            onPress={submitReturn}
          >
            Confirm return
          </Button>
        </Sheet>
      )}
    </Card>
  );
}
