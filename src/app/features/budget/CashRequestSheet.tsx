import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Check from "lucide-react-native/icons/check";
import FileText from "lucide-react-native/icons/file-text";
import Paperclip from "lucide-react-native/icons/paperclip";
import Plus from "lucide-react-native/icons/plus";
import Upload from "lucide-react-native/icons/upload";
import X from "lucide-react-native/icons/x";
import {
  Button,
  Card,
  Choice,
  DateField,
  Field,
  LabelValue,
  Notice,
  Row,
  Sheet,
  peso,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { useToast } from "../../components/ui/Toast";
import { Text } from "../../components/ui/Typography";
import { useAction } from "../../shared/useAction";
import {
  cashNeededByBounds,
  cashNeededByError,
  formatTaskDateRangeHint,
  type TaskDateRange,
} from "./cashNeededByRange";
import {
  clearFormDraft,
  formDraftKey,
  readFormDraft,
  writeFormDraft,
} from "../../shared/formDraftMemory";
import {
  isDeterministicRejection,
  PublicMessageError,
} from "../../shared/userMessages";
import { useAuth } from "../authentication";
import { draftStore } from "../../../platform/draftStore";
import {
  chooseFiles,
  asServiceFile,
  type PickedFile,
} from "../../../platform/files";
import { createVoucherCashRequest } from "../../../core/web/app/features/budget/services/pettyCashVoucherService";
import {
  createContextualCashRequest,
  resubmitContextualCashRequest,
  uploadCashRequestAttachment,
} from "../../../core/web/app/features/budget/services/budgetService";
import type {
  CashFundingLine,
  PettyCashRequest,
  TaskFundingContext,
} from "../../../core/web/app/features/budget/types";
type Intent = {
  key: string;
  lines: CashFundingLine[];
  purpose: string;
  neededBy: string;
  existing?: string;
  requestId?: string;
};
type CashRequestDraft = {
  lines: CashFundingLine[];
  purpose: string;
  date: string;
  attachment?: PickedFile;
};

export function CashRequestSheet({
  context,
  orgId,
  correction,
  taskSchedule,
  readOnly,
  onClose,
  onSaved,
}: {
  context: TaskFundingContext;
  orgId: string;
  correction?: PettyCashRequest;
  taskSchedule?: TaskDateRange;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    palette = useTheme(),
    { toast } = useToast(),
    action = useAction();
  const bounds = cashNeededByBounds(taskSchedule);
  const dateRangeHint = formatTaskDateRangeHint(taskSchedule);
  const scope =
    "cash-request." +
    context.taskId +
    "." +
    (context.subtaskId || "root") +
    "." +
    (correction?.id || "new");
  const draftKey = formDraftKey(profile?.id, scope);
  const initialDraft = readFormDraft<CashRequestDraft>(draftKey);
  const [lines, setLines] = useState<CashFundingLine[]>(() =>
      initialDraft?.lines.length
        ? initialDraft.lines
        : correction?.fundingLines?.length
          ? correction.fundingLines
          : [
              {
                allocationLineId:
                  correction?.allocationLineId ||
                  context.cap?.allocationLineId ||
                  context.lines[0]?.id ||
                  "",
                amount: correction?.requestedAmount || 0,
              },
            ],
    ),
    [purpose, setPurpose] = useState(
      () => initialDraft?.purpose ?? (correction?.purpose || ""),
    ),
    [date, setDate] = useState(
      () => initialDraft?.date ?? (correction?.neededBy || ""),
    ),
    [attachment, setAttachment] = useState<PickedFile | undefined>(
      () => initialDraft?.attachment,
    );
  const intent = useRef<Intent | undefined>(undefined);
  const [pendingIntent, setPendingIntent] = useState<Intent | undefined>(
    undefined,
  );
  const committed = useRef(false);

  useEffect(() => {
    let active = true;
    if (!profile) return;
    void draftStore.get<Intent>(profile.id, scope).then((saved) => {
      if (!active || !saved) return;
      intent.current = saved;
      setPendingIntent(saved);
      setLines(saved.lines);
      setPurpose(saved.purpose);
      setDate(saved.neededBy);
    });
    return () => {
      active = false;
    };
  }, [profile, scope]);

  useEffect(() => {
    if (committed.current) return;
    writeFormDraft<CashRequestDraft>(draftKey, {
      lines,
      purpose,
      date,
      attachment,
    });
  }, [draftKey, lines, purpose, date, attachment]);

  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  const total = lines.reduce(
    (s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0),
    0,
  );
  const save = () =>
    action.run(async () => {
      if (!profile) throw new PublicMessageError("Sign in again.");
      if (readOnly) throw new PublicMessageError("Refresh to verify current funding access.");
      if (!intent.current) {
        const stored =
          (await draftStore.get<Intent>(profile.id, scope)) || undefined;
        if (stored) {
          intent.current = stored;
          setPendingIntent(stored);
        }
      }
      if (!intent.current) {
        if (!purpose.trim())
          throw new PublicMessageError("Explain what needs to be purchased.");
        const dateIssue = cashNeededByError(date, taskSchedule);
        if (dateIssue) throw new PublicMessageError(dateIssue);
        if (
          lines.some(
            (l) =>
              !l.allocationLineId ||
              !Number.isFinite(l.amount) ||
              l.amount <= 0,
          )
        )
          throw new PublicMessageError("Choose funding sources and positive amounts.");
        if (new Set(lines.map((l) => l.allocationLineId)).size !== lines.length)
          throw new PublicMessageError("Choose each funding source once.");
        if (
          lines.some(
            (l) =>
              l.amount >
              (context.lines.find((s) => s.id === l.allocationLineId)
                ?.available || 0),
          )
        )
          throw new PublicMessageError(
            "The request exceeds currently available task funding.",
          );
        intent.current = {
          key: crypto.randomUUID(),
          lines: lines.map((l) => ({ ...l })),
          purpose,
          neededBy: date,
          existing: correction?.id,
        };
        setPendingIntent(intent.current);
        await draftStore.set(profile.id, scope, intent.current);
      }
      const current = intent.current;
      try {
        if (!current.requestId) {
          if (context.supportsItemizedCash)
            current.requestId = await createVoucherCashRequest({
              taskId: context.taskId,
              subtaskId: context.subtaskId,
              lines: current.lines,
              purpose: current.purpose,
              neededBy: current.neededBy,
              key: current.key,
              existingId: current.existing,
            });
          else if (current.existing) {
            await resubmitContextualCashRequest({
              requestId: current.existing,
              allocationLineId: current.lines[0].allocationLineId,
              amount: current.lines[0].amount,
              purpose: current.purpose,
              neededBy: current.neededBy,
            });
            current.requestId = current.existing;
          } else
            current.requestId = await createContextualCashRequest({
              taskId: context.taskId,
              subtaskId: context.subtaskId,
              allocationLineId: current.lines[0].allocationLineId,
              amount: current.lines[0].amount,
              purpose: current.purpose,
              neededBy: current.neededBy,
              idempotencyKey: current.key,
            });
          setPendingIntent({ ...current });
          await draftStore.set(profile.id, scope, current);
        }
        if (attachment)
          await uploadCashRequestAttachment({
            orgId,
            requestId: current.requestId,
            file: await asServiceFile(attachment),
          });
      } catch (error) {
        if (!current.requestId && isDeterministicRejection(error)) {
          intent.current = undefined;
          setPendingIntent(undefined);
          await draftStore.remove(profile.id, scope);
        }
        throw error;
      }
      await draftStore.remove(profile.id, scope);
      committed.current = true;
      clearFormDraft(draftKey);
      action.clear();
      toast(
        correction ? "Cash request updated." : "Cash request submitted.",
        "success",
      );
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title={correction ? "Correct cash request" : "Request task cash"}
      onClose={close}
      busy={action.busy}
      footer={
        <Button
          busy={action.busy}
          disabled={readOnly || (!pendingIntent && bounds.expired)}
          icon={<Check size={15} color={palette.onPrimary} />}
          onPress={() => void save()}
        >
          Submit cash request
        </Button>
      }
    >
      {lines.map((line, i) => (
        <Card key={i}>
          <Choice
            label="Funding source"
            required
            value={line.allocationLineId}
            disabled={!!pendingIntent}
            options={context.lines.map((s) => ({
              value: s.id,
              label: s.particular || s.category || "Funding source",
              description: `${peso(s.available)} available`,
            }))}
            onChange={(v) =>
              setLines((old) =>
                old.map((l, index) =>
                  index === i ? { ...l, allocationLineId: v } : l,
                ),
              )
            }
          />
          <Field
            label="Amount to request"
            required
            keyboardType="decimal-pad"
            value={String(line.amount || "")}
            editable={!pendingIntent}
            onChangeText={(v) =>
              setLines((old) =>
                old.map((l, index) =>
                  index === i ? { ...l, amount: Number(v) } : l,
                ),
              )
            }
          />
          {!!(lines.length > 1) && (
            <Button
              variant="ghost"
              disabled={!!pendingIntent}
              icon={<X size={15} color={palette.primary} />}
              onPress={() =>
                setLines((old) => old.filter((_, index) => index !== i))
              }
            >
              Remove source
            </Button>
          )}
        </Card>
      ))}
      {!!context.supportsItemizedCash && (
        <Button
          variant="outline"
          disabled={!!pendingIntent}
          icon={<Plus size={15} color={palette.primary} />}
          onPress={() =>
            setLines((old) => [...old, { allocationLineId: "", amount: 0 }])
          }
        >
          Add funding source
        </Button>
      )}
      <Field
        label="Purpose / what needs to be purchased"
        required
        value={purpose}
        onChangeText={setPurpose}
        multiline
        editable={!pendingIntent}
      />
      <DateField
        label="Needed by"
        required
        value={date}
        min={bounds.min}
        max={bounds.max}
        onChange={setDate}
        disabled={!!pendingIntent || bounds.expired}
      />
      {bounds.expired ? (
        <Notice>
          The task's scheduled dates have already passed. Update the task dates
          before requesting cash.
        </Notice>
      ) : (
        !!dateRangeHint && (
          <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
            {dateRangeHint}
          </Text>
        )
      )}
      {attachment ? (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: palette.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={20} color={palette.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: palette.mutedLabel }}
              >
                Supporting document
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="middle"
                style={{ fontSize: 14, fontWeight: "600", color: palette.text }}
              >
                {attachment.name}
              </Text>
              {attachment.size > 0 && (
                <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
                  {attachment.size >= 1024 * 1024
                    ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.max(1, Math.ceil(attachment.size / 1024))} KB`}
                </Text>
              )}
            </View>
          </View>
          <Row>
            <Button
              variant="outline"
              style={{ flex: 1 }}
              icon={<Upload size={15} color={palette.primary} />}
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  const picked = (await chooseFiles())[0];
                  if (picked) setAttachment(picked);
                })
              }
            >
              Change file
            </Button>
            <Button
              variant="ghost"
              icon={<X size={15} color={palette.primary} />}
              disabled={action.busy}
              onPress={() => setAttachment(undefined)}
            >
              Remove
            </Button>
          </Row>
        </Card>
      ) : (
        <Button
          variant="outline"
          icon={<Paperclip size={16} color={palette.text} />}
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              const picked = (await chooseFiles())[0];
              if (picked) setAttachment(picked);
            })
          }
        >
          Attach supporting document
        </Button>
      )}
      <LabelValue label="Total cash requested" value={peso(total)} />
    </Sheet>
  );
}
