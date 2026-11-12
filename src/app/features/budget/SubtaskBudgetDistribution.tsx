import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Sheet,
} from "../../components/ui";
import { recordedPeso } from "../../components/ui/theme";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";
import {
  saveSharedWork,
  type SharedWorkRequest,
} from "../../shared/sharedWorkRequest";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
import { draftStore } from "../../../platform/draftStore";
import { nativeWindow } from "../../../platform/webRuntime";
import { fetchTaskFundingContext } from "../../../core/web/app/features/budget/services/budgetService";
import type {
  SubtaskBudgetRow,
  TaskFundingContext,
} from "../../../core/web/app/features/budget/types";
import {
  buildDistributionRequest,
  distributionLimits,
  isAllocationReceipt,
  type DistributionMode,
} from "./subtaskDistribution";

export function SubtaskBudgetDistribution({
  context,
  actor,
  readOnly,
  taskFinished,
  onSaved,
}: {
  context: TaskFundingContext;
  actor: string;
  readOnly: boolean;
  taskFinished: boolean;
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string>();
  const totals = context.distribution;
  if (!totals) return null;
  const rows = context.subtaskBudgets ?? [];
  const canManage =
    !!actor && actor === context.taskLeaderId && context.canManageDistribution;
  const row = rows.find(({ id }) => id === selected);
  const metrics: [string, number][] = context.subtaskId
    ? [
        ["Approved task budget", context.taskBudget],
        ["Subtask budget", context.cap?.amount ?? 0],
        [
          context.cap ? "Available to request" : "Available from task budget",
          context.available,
        ],
      ]
    : [
        ["Approved task budget", context.taskBudget],
        ["Allocated to subtasks", totals.allocated],
        ["Unallocated", totals.unallocated],
        ["Available to allocate", totals.available],
      ];
  return (
    <>
      {metrics.map(([label, amount]) => (
        <LabelValue key={label} label={label} value={recordedPeso(amount)} />
      ))}
      <LabelValue label="Cash released" value={recordedPeso(totals.released)} />
      <LabelValue label="Actual spent" value={recordedPeso(totals.spent)} />
      {rows.length > 0 && (
        <Card
          title={
            context.subtaskId ? "Allocation details" : "Subtask allocations"
          }
        >
          {!context.subtaskId && (
            <Notice>Allocations divide the approved task budget.</Notice>
          )}
          {rows.map((item) => (
            <Card key={item.id} title={item.title}>
              <LabelValue label="Allocated" value={recordedPeso(item.amount)} />
              {!!item.capId && (
                <LabelValue
                  label="Unused"
                  value={recordedPeso(item.returnable)}
                />
              )}
              {item.blocked && (
                <Notice>
                  Resolve the open cash request before changing this budget.
                </Notice>
              )}
              {canManage && (
                <Button
                  variant="outline"
                  disabled={readOnly}
                  onPress={() => setSelected(item.id)}
                >
                  Manage budget
                </Button>
              )}
            </Card>
          ))}
        </Card>
      )}
      {row && canManage && (
        <DistributionSheet
          key={row.id}
          row={taskFinished ? { ...row, finished: true } : row}
          context={context}
          actor={actor}
          readOnly={readOnly}
          onClose={() => setSelected(undefined)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

function DistributionSheet({
  row,
  context,
  actor,
  readOnly,
  onClose,
  onSaved,
}: {
  row: SubtaskBudgetRow;
  context: TaskFundingContext;
  actor: string;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const assertAccess = useAccountActionAccess();
  const scope = `work-allocation:${context.taskId}:${row.id}`;
  const recovery = useFacts(`distribution-recovery:${actor}:${scope}`, () =>
    draftStore.get<SharedWorkRequest>(actor, scope),
  );
  const action = useAction();
  const [preferredMode, setMode] = useState<DistributionMode>("save");
  const [expectedCapId] = useState(row.capId);
  const [expectedAmount] = useState(row.amount);
  const [source, setSource] = useState(
    row.sourceId ??
      context.parentSources?.find(({ available }) => available > 0)?.id ??
      "",
  );
  const [amount, setAmount] = useState(
    row.amount > 0 ? String(row.amount) : "",
  );
  const [reason, setReason] = useState("");
  const sources = (context.parentSources ?? []).filter(
    (option) =>
      option.id === row.sourceId ||
      (!row.hasHistory && !row.finished && option.available > 0),
  );
  const { maximum, minimum } = distributionLimits(context, row, source);
  const canReturn = !!row.capId && row.returnable > 0;
  const canSave = !row.finished && sources.length > 0;
  const mode =
    canSave && (preferredMode === "save" || !canReturn) ? "save" : "return";
  const ready = !recovery.loading && !recovery.error && !row.blocked;

  const submit = () =>
    void action.run(async () => {
      assertAccess(actor);
      if (readOnly)
        throw new PublicMessageError(
          "Wait while we verify access to this work.",
        );
      const saved = recovery.data;
      const fresh = await fetchTaskFundingContext(context.taskId, row.id);
      if (
        fresh.taskId !== context.taskId ||
        fresh.subtaskId !== row.id ||
        fresh.taskLeaderId !== actor ||
        !fresh.canManageDistribution
      )
        throw new PublicMessageError(
          "Only the current task lead can change this budget.",
        );
      if (
        !saved &&
        fresh.subtaskBudgets?.find((item) => item.id === row.id)?.amount !==
          expectedAmount
      )
        throw new PublicMessageError(
          "The subtask budget changed. Close this form and open it again.",
        );
      const request =
        saved ??
        buildDistributionRequest(
          fresh,
          row.id,
          mode,
          { source, amount, reason, expectedCapId },
          crypto.randomUUID(),
        );
      const returning = isAllocationReceipt(request.args.p_cap_allocation_id);
      if (
        request.args.p_idempotency_key !== request.id ||
        (!returning &&
          (request.args.p_task_id !== context.taskId ||
            request.args.p_subtask_id !== row.id))
      )
        throw new PublicMessageError(
          "The saved allocation belongs to different work.",
        );
      assertAccess(actor);
      try {
        await saveSharedWork(
          actor,
          scope,
          returning ? "remove_subtask_budget_cap" : "set_subtask_budget_cap",
          request,
          (value): value is string | null =>
            returning ? value === null : isAllocationReceipt(value),
          !!saved,
        );
      } finally {
        await recovery.refresh();
      }
      onClose();
      nativeWindow.dispatchEvent({
        type: "eflow:finance-updated",
        detail: {
          taskId: context.taskId,
          subtaskId: row.id,
          orgId: context.fundingOrgId,
        },
      });
      await onSaved();
    });

  return (
    <Sheet
      open
      title="Subtask budget"
      description={row.title}
      busy={action.busy}
      onClose={onClose}
    >
      {recovery.loading && !recovery.data && (
        <Loading
          label="Checking for a saved budget change"
          layout="verification"
        />
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {recovery.data ? (
        <>
          <Notice>A budget change is awaiting confirmation.</Notice>
          <Button
            busy={action.busy}
            disabled={readOnly || recovery.loading || !!recovery.error}
            onPress={submit}
          >
            Verify saved change
          </Button>
        </>
      ) : ready && (canSave || canReturn) ? (
        <>
          {canSave && canReturn && (
            <Choice
              label="Budget action"
              value={mode}
              disabled={action.busy}
              onChange={(value) => {
                action.clear();
                setMode(value === "return" ? "return" : "save");
              }}
              options={[
                { value: "save", label: "Edit budget" },
                { value: "return", label: "Return unused funding" },
              ]}
            />
          )}
          {mode === "save" && canSave ? (
            <>
              <Choice
                label="Funding account"
                value={source}
                onChange={setSource}
                disabled={action.busy || row.hasHistory}
                options={sources.map((option) => ({
                  value: option.id,
                  label: option.name,
                }))}
              />
              <LabelValue
                label="Maximum budget"
                value={recordedPeso(maximum / 100)}
              />
              {minimum > 1 && (
                <LabelValue
                  label="Minimum to cover spending"
                  value={recordedPeso(minimum / 100)}
                />
              )}
              <Field
                label="New budget"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                editable={!action.busy}
              />
            </>
          ) : (
            <Notice>
              Return {recordedPeso(row.returnable)} to the parent task.
            </Notice>
          )}
          <Field
            label="Reason"
            value={reason}
            onChangeText={setReason}
            maxLength={3000}
            multiline
            editable={!action.busy}
          />
          <Button
            busy={action.busy}
            onPress={submit}
            disabled={
              readOnly ||
              !reason.trim() ||
              (mode === "save" && (!source || !amount.trim()))
            }
          >
            {mode === "return" ? "Confirm return" : "Save budget"}
          </Button>
        </>
      ) : (
        !recovery.loading &&
        !recovery.error && (
          <Notice>
            {row.blocked
              ? "Resolve the open cash request first."
              : "No budget changes are available for this subtask."}
          </Notice>
        )
      )}
      {!!action.error && <ErrorState error={action.error} context="action" />}
      <Button variant="outline" disabled={action.busy} onPress={onClose}>
        Cancel
      </Button>
    </Sheet>
  );
}
