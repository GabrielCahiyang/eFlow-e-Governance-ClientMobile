import { useRef, useState } from "react";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Row,
  Sheet,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
export function CashRequestSheet({
  context,
  orgId,
  correction,
  readOnly,
  onClose,
  onSaved,
}: {
  context: TaskFundingContext;
  orgId: string;
  correction?: PettyCashRequest;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    action = useAction();
  const [lines, setLines] = useState<CashFundingLine[]>(
      correction?.fundingLines?.length
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
    [purpose, setPurpose] = useState(correction?.purpose || ""),
    [date, setDate] = useState(correction?.neededBy || ""),
    [attachment, setAttachment] = useState<PickedFile>();
  const intent = useRef<Intent | undefined>(undefined);
  const scope =
    "cash-request." + context.taskId + "." + (context.subtaskId || "root");
  const total = lines.reduce(
    (s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0),
    0,
  );
  const save = () =>
    action.run(async () => {
      if (!profile) throw new Error("Sign in again.");
      if (readOnly) throw new Error("Refresh to verify current funding access.");
      if (!intent.current)
        intent.current =
          (await draftStore.get<Intent>(profile.id, scope)) || undefined;
      if (!intent.current) {
        if (!purpose.trim())
          throw new Error("Explain what needs to be purchased.");
        if (!date) throw new Error("Needed-by date is required.");
        if (
          lines.some(
            (l) =>
              !l.allocationLineId ||
              !Number.isFinite(l.amount) ||
              l.amount <= 0,
          )
        )
          throw new Error("Choose funding sources and positive amounts.");
        if (new Set(lines.map((l) => l.allocationLineId)).size !== lines.length)
          throw new Error("Choose each funding source once.");
        if (
          lines.some(
            (l) =>
              l.amount >
              (context.lines.find((s) => s.id === l.allocationLineId)
                ?.available || 0),
          )
        )
          throw new Error(
            "The request exceeds currently available task funding.",
          );
        intent.current = {
          key: crypto.randomUUID(),
          lines: lines.map((l) => ({ ...l })),
          purpose,
          neededBy: date,
          existing: correction?.id,
        };
        await draftStore.set(profile.id, scope, intent.current);
      }
      const current = intent.current;
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
        await draftStore.set(profile.id, scope, current);
      }
      if (attachment)
        await uploadCashRequestAttachment({
          orgId,
          requestId: current.requestId,
          file: await asServiceFile(attachment),
        });
      await draftStore.remove(profile.id, scope);
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      open
      title={correction ? "Correct cash request" : "Request task cash"}
      onClose={onClose}
      busy={action.busy}
      footer={
        <Button busy={action.busy} disabled={readOnly} onPress={() => void save()}>
          {intent.current ? "Retry same request" : "Submit cash request"}
        </Button>
      }
    >
      {!!intent.current && (
        <Notice>
          The submitted terms are retained. A retry uses the same request and
          does not reserve funding twice.
        </Notice>
      )}
      {lines.map((line, i) => (
        <Card key={i}>
          <Choice
            label="Funding source"
            value={line.allocationLineId}
            disabled={!!intent.current}
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
            keyboardType="decimal-pad"
            value={String(line.amount || "")}
            editable={!intent.current}
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
              disabled={!!intent.current}
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
          disabled={!!intent.current}
          onPress={() =>
            setLines((old) => [...old, { allocationLineId: "", amount: 0 }])
          }
        >
          Add funding source
        </Button>
      )}
      <Field
        label="Purpose / what needs to be purchased"
        value={purpose}
        onChangeText={setPurpose}
        multiline
        editable={!intent.current}
      />
      <DateField
        label="Needed by"
        value={date}
        onChange={setDate}
        disabled={!!intent.current}
      />
      <Button
        variant="outline"
        disabled={!!intent.current}
        onPress={() =>
          void action.run(async () => setAttachment((await chooseFiles())[0]))
        }
      >
        Attach supporting document
      </Button>
      {!!attachment && (
        <LabelValue label="Attachment" value={attachment.name} />
      )}
      <LabelValue label="Total cash requested" value={peso(total)} />
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
