import { useState } from "react";
import Check from "lucide-react-native/icons/check";
import Coins from "lucide-react-native/icons/coins";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Wallet from "lucide-react-native/icons/wallet";
import X from "lucide-react-native/icons/x";
import {
  AllocationBar,
  Button,
  Card,
  Choice,
  DetailGroup,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  MetricPair,
  Notice,
  Sheet,
} from "../../components/ui";
import { View } from "../../components/ui/Primitives";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { recordedPeso } from "../../components/ui/theme";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";
import {
  saveSharedWork,
  type SharedWorkRequest,
} from "../../shared/sharedWorkRequest";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
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
  const { toast } = useToast();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const totals = context.distribution;
  if (!totals) return null;
  const rows = context.subtaskBudgets ?? [];
  const canManage =
    !!actor &&
    actor === context.taskLeaderId &&
    Boolean(context.canManageDistribution);
  const row = rows.find(({ id }) => id === selected);
  const allocPct =
    context.taskBudget > 0
      ? Math.min(100, Math.round((totals.allocated / context.taskBudget) * 100))
      : 0;
  const insetSurface = isDark ? "#0f1733" : palette.background;

  return (
    <>
      {context.subtaskId ? (
        <>
          <MetricPair
            items={[
              {
                label: "Approved task budget",
                value: recordedPeso(context.taskBudget),
                icon: <Wallet size={18} color={palette.primary} />,
              },
              {
                label: context.cap
                  ? "Available to request"
                  : "Available from task budget",
                value: recordedPeso(context.available),
                tone: "success",
                icon: <Coins size={18} color={palette.success} />,
              },
            ]}
          />
          <DetailGroup>
            <LabelValue
              label="Subtask budget"
              value={recordedPeso(context.cap?.amount ?? 0)}
            />
            <LabelValue
              label="Cash released"
              value={recordedPeso(totals.released)}
            />
            <LabelValue
              label="Actual spent"
              value={recordedPeso(totals.spent)}
            />
          </DetailGroup>
        </>
      ) : (
        <>
          <MetricPair
            items={[
              {
                label: "Approved task budget",
                value: recordedPeso(context.taskBudget),
                icon: <Wallet size={18} color={palette.primary} />,
              },
              {
                label: "Available to allocate",
                value: recordedPeso(totals.available),
                tone: "success",
                icon: <Coins size={18} color={palette.success} />,
              },
            ]}
          />
          {context.taskBudget > 0 && (
            <AllocationBar
              label="Subtask allocation progress"
              summary={`${allocPct}% · ${recordedPeso(totals.allocated)}`}
              percent={
                context.taskBudget > 0
                  ? (totals.allocated / context.taskBudget) * 100
                  : 0
              }
            />
          )}
          <DetailGroup>
            <LabelValue
              label="Allocated to subtasks"
              value={recordedPeso(totals.allocated)}
            />
            <LabelValue
              label="Unallocated"
              value={recordedPeso(totals.unallocated)}
            />
            <LabelValue
              label="Cash released"
              value={recordedPeso(totals.released)}
            />
            <LabelValue
              label="Actual spent"
              value={recordedPeso(totals.spent)}
            />
          </DetailGroup>
        </>
      )}
      {rows.length > 0 && (
        <Card
          flat
          title={
            context.subtaskId ? "Allocation details" : "Subtask allocations"
          }
          badge={String(rows.length)}
        >
          {!context.subtaskId && (
            <Notice tone="neutral">
              Allocations divide the approved task budget.
            </Notice>
          )}
          {rows.map((item) => {
            const sourceName = context.parentSources?.find(
              (source) => source.id === item.sourceId,
            )?.name;
            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: insetSurface,
                  borderColor: palette.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  gap: 10,
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: palette.text,
                  }}
                >
                  {item.title}
                </Text>
                <DetailGroup inset={false}>
                  {!!sourceName && (
                    <LabelValue label="Account" value={sourceName} />
                  )}
                  <LabelValue
                    label="Allocated"
                    value={recordedPeso(item.amount)}
                  />
                  {!!item.capId && (
                    <LabelValue
                      label="Unused"
                      value={recordedPeso(item.returnable)}
                    />
                  )}
                </DetailGroup>
                {item.blocked && (
                  <Notice tone="warning">
                    Resolve the open cash request before changing this budget.
                  </Notice>
                )}
                {canManage && (
                  <Button
                    variant="outline"
                    icon={<Wallet size={15} color={palette.primary} />}
                    disabled={readOnly}
                    onPress={() => setSelected(item.id)}
                  >
                    Manage budget
                  </Button>
                )}
              </View>
            );
          })}
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
  const palette = useTheme();
  const assertAccess = useAccountActionAccess();
  const scope = `work-allocation:${context.taskId}:${row.id}`;
  const recovery = useFacts(`distribution-recovery:${actor}:${scope}`, () =>
    draftStore.get<SharedWorkRequest>(actor, scope),
  );
  const { toast } = useToast();
  const action = useAction();
  const [expectedCapId] = useState(row.capId);
  const [expectedAmount] = useState(row.amount);
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(actor, "subtask-budget:" + context.taskId + ":" + row.id),
    true,
    () => ({
      preferredMode: "save" as DistributionMode,
      source:
        row.sourceId ??
        context.parentSources?.find(({ available }) => available > 0)?.id ??
        "",
      amount: row.amount > 0 ? String(row.amount) : "",
      reason: "",
    }), { restoreOnOpen: false },
  );
  const { preferredMode, source, amount, reason } = draft;
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
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
      clearDraft();
      toast(
        returning ? "Subtask funding returned." : "Subtask budget saved.",
        "success",
      );
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
      actionError={action.error}
      open
      title="Subtask budget"
      description={row.title}
      busy={action.busy}
      onClose={close}
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
          <Button
            busy={action.busy}
            icon={
              "p_cap_allocation_id" in recovery.data.args ? (
                <RotateCcw size={15} color={palette.onPrimary} />
              ) : (
                <Check size={15} color={palette.onPrimary} />
              )
            }
            disabled={readOnly || recovery.loading || !!recovery.error}
            onPress={submit}
          >
            {"p_cap_allocation_id" in recovery.data.args ? "Confirm return" : "Save budget"}
          </Button>
      ) : ready && (canSave || canReturn) ? (
        <>
          {canSave && canReturn && (
            <Choice
              label="Budget action"
              value={mode}
              searchable={false}
              disabled={action.busy}
              onChange={(value) => {
                action.clear();
                updateDraft({
                  preferredMode: value === "return" ? "return" : "save",
                });
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
                required
                value={source}
                onChange={(next) => updateDraft({ source: next })}
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
                required
                value={amount}
                onChangeText={(next) => updateDraft({ amount: next })}
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
            required
            value={reason}
            onChangeText={(next) => updateDraft({ reason: next })}
            maxLength={3000}
            multiline
            editable={!action.busy}
          />
          <Button
            busy={action.busy}
            icon={
              mode === "return" ? (
                <RotateCcw size={15} color={palette.onPrimary} />
              ) : (
                <Check size={15} color={palette.onPrimary} />
              )
            }
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
      <Button
        variant="outline"
        icon={<X size={15} color={palette.primary} />}
        disabled={action.busy}
        onPress={close}
      >
        Cancel budget edit
      </Button>
    </Sheet>
  );
}
