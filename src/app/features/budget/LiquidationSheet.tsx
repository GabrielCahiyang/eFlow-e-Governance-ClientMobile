import { Text } from "../../components/ui/Typography";
import { useRef, useState } from "react";
import { File as NativeFile } from "expo-file-system";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Sheet,
  colors,
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
import { submitPettyCashLiquidation } from "../../../core/web/app/features/budget/services/budgetService";
import { getPhilippineCalendarDate } from "../../../core/web/app/features/budget/selectors/cashWorkflowRules";
import type {
  DepartmentBudgetBundle,
  PettyCashRequest,
  ReceiptDraft,
  ReceiptItem,
} from "../../../core/web/app/features/budget/types";
type NativeReceipt = Omit<ReceiptDraft, "file"> & { file?: PickedFile };
type SavedIntent = {
  key: string;
  note: string;
  refundNumber: string;
  refundDate: string;
  receipts: NativeReceipt[];
};
export function LiquidationSheet({
  request,
  bundle,
  onClose,
  onSaved,
}: {
  request: PettyCashRequest;
  bundle: DepartmentBudgetBundle;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    action = useAction();
  const itemized = !!bundle.itemizedCashAvailable;
  const sources = bundle.allocationLines.filter((l) =>
    (
      request.fundingLines || [{ allocationLineId: request.allocationLineId }]
    ).some((s) => s.allocationLineId === l.id),
  );
  const blank = (): NativeReceipt => ({
    id: crypto.randomUUID(),
    vendor: "",
    receiptNumber: "",
    receiptDate: getPhilippineCalendarDate(),
    description: "",
    amount: 0,
    ...(itemized
      ? {
          items: [
            {
              id: crypto.randomUUID(),
              allocationLineId: sources[0]?.id || "",
              quantity: 1,
              unit: "piece",
              particular: "",
              amount: 0,
              purpose: "",
            },
          ],
        }
      : {}),
  });
  const [receipts, setReceipts] = useState<NativeReceipt[]>([blank()]),
    [note, setNote] = useState(""),
    [refundNumber, setRefundNumber] = useState(""),
    [refundDate, setRefundDate] = useState(getPhilippineCalendarDate());
  const intent = useRef<SavedIntent | undefined>(undefined);
  const spent =
      receipts.reduce(
        (s, r) =>
          s + (Number.isFinite(r.amount) ? Math.round(r.amount * 100) : 0),
        0,
      ) / 100,
    returned = Math.max(0, (request.releasedAmount || 0) - spent),
    scope = "liquidation." + request.id;
  const change = (id: string, changes: Partial<NativeReceipt>) => {
    if (intent.current || action.busy) return;
    setReceipts((old) =>
      old.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    );
  };
  const itemChange = (
    receipt: NativeReceipt,
    id: string,
    changes: Partial<ReceiptItem>,
  ) => {
    const items = receipt.items!.map((i) =>
      i.id === id ? { ...i, ...changes } : i,
    );
    change(receipt.id, {
      items,
      amount:
        items.reduce(
          (s, i) =>
            s + (Number.isFinite(i.amount) ? Math.round(i.amount * 100) : 0),
          0,
        ) / 100,
    });
  };
  const submit = () =>
    action.run(async () => {
      if (!profile) throw new Error("Sign in again.");
      if (!intent.current)
        intent.current =
          (await draftStore.get<SavedIntent>(profile.id, scope)) || undefined;
      if (!intent.current) {
        if (spent > (request.releasedAmount || 0))
          throw new Error("Actual spending cannot exceed released cash.");
        if (returned > 0 && (!refundNumber.trim() || !refundDate))
          throw new Error("Record the cash-return receipt number and date.");
        intent.current = {
          key: crypto.randomUUID(),
          note,
          refundNumber,
          refundDate,
          receipts: receipts.map((r) => ({
            ...r,
            file: r.file
              ? { ...r.file, arrayBuffer: undefined as any }
              : undefined,
          })),
        };
        await draftStore.set(profile.id, scope, intent.current);
      }
      const current = intent.current;
      const drafts: ReceiptDraft[] = await Promise.all(
        current.receipts.map(async (r) => {
          if (!r.file)
            throw new Error("Attach a receipt image or PDF for every row.");
          const meta = r.file;
          const file = {
            ...meta,
            arrayBuffer: () => new NativeFile(meta.uri).arrayBuffer(),
          };
          return { ...r, file: await asServiceFile(file) };
        }),
      );
      await submitPettyCashLiquidation({
        orgId: request.fundingOrgId || request.orgId,
        requestId: request.id,
        spent: drafts.reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100,
        note: current.note,
        receipts: drafts,
        refundReceiptNumber: current.refundNumber,
        refundDate: current.refundDate,
        idempotencyKey: current.key,
      });
      await draftStore.remove(profile.id, scope);
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      open
      title="Receipts and cash return"
      description={`FR-${String(request.requestNumber).padStart(5, "0")}`}
      onClose={onClose}
      busy={action.busy}
      footer={
        <>
          <LabelValue label="Verified receipt total" value={peso(spent)} />
          <LabelValue label="Unused cash to return" value={peso(returned)} />
          <Button busy={action.busy} onPress={() => void submit()}>
            {intent.current
              ? "Retry same receipt package"
              : "Submit receipts for review"}
          </Button>
        </>
      }
    >
      {!!intent.current && (
        <Notice>
          The package and upload paths are retained. Retry uses the same
          submission key.
        </Notice>
      )}
      <LabelValue
        label="Cash released"
        value={peso(request.releasedAmount || 0)}
      />
      {receipts.map((receipt, index) => (
        <Card key={receipt.id} title={`Receipt ${index + 1}`}>
          <Field
            label="Vendor"
            value={receipt.vendor}
            onChangeText={(v) => change(receipt.id, { vendor: v })}
            editable={!intent.current}
          />
          <Field
            label="Receipt number"
            value={receipt.receiptNumber}
            onChangeText={(v) => change(receipt.id, { receiptNumber: v })}
            editable={!intent.current}
          />
          <DateField
            label="Receipt date"
            value={receipt.receiptDate}
            onChange={(v) => change(receipt.id, { receiptDate: v })}
            disabled={!!intent.current}
          />
          {receipt.items ? (
            receipt.items.map((item) => (
              <Card key={item.id} title="Purchased item">
                <Choice
                  label="Funding source"
                  value={item.allocationLineId}
                  disabled={!!intent.current}
                  onChange={(v) =>
                    itemChange(receipt, item.id, { allocationLineId: v })
                  }
                  options={sources.map((s) => ({
                    value: s.id,
                    label: s.particular || s.category,
                  }))}
                />
                <Field
                  label="Particular / item purchased"
                  value={item.particular}
                  onChangeText={(v) =>
                    itemChange(receipt, item.id, { particular: v })
                  }
                  editable={!intent.current}
                />
                <Field
                  label="Quantity"
                  keyboardType="decimal-pad"
                  value={String(item.quantity)}
                  onChangeText={(v) =>
                    itemChange(receipt, item.id, { quantity: Number(v) })
                  }
                  editable={!intent.current}
                />
                <Field
                  label="Unit"
                  value={item.unit}
                  onChangeText={(v) =>
                    itemChange(receipt, item.id, { unit: v })
                  }
                  editable={!intent.current}
                />
                <Field
                  label="Item total amount"
                  keyboardType="decimal-pad"
                  value={String(item.amount || "")}
                  onChangeText={(v) =>
                    itemChange(receipt, item.id, { amount: Number(v) })
                  }
                  editable={!intent.current}
                />
                <Field
                  label="Purpose"
                  value={item.purpose}
                  onChangeText={(v) =>
                    itemChange(receipt, item.id, { purpose: v })
                  }
                  editable={!intent.current}
                />
                <Button
                  variant="ghost"
                  disabled={!!intent.current}
                  onPress={() => {
                    const items = receipt.items!.filter(
                      (i) => i.id !== item.id,
                    );
                    change(receipt.id, {
                      items,
                      amount: items.reduce((s, i) => s + i.amount, 0),
                    });
                  }}
                >
                  Remove purchased item
                </Button>
              </Card>
            ))
          ) : (
            <>
              <Field
                label="Expense description"
                value={receipt.description}
                onChangeText={(v) => change(receipt.id, { description: v })}
                multiline
                editable={!intent.current}
              />
              <Field
                label="Receipt amount"
                value={String(receipt.amount || "")}
                keyboardType="decimal-pad"
                onChangeText={(v) => change(receipt.id, { amount: Number(v) })}
                editable={!intent.current}
              />
            </>
          )}
          {!!receipt.items && (
            <Button
              variant="outline"
              disabled={!!intent.current}
              onPress={() =>
                change(receipt.id, {
                  items: [
                    ...receipt.items!,
                    {
                      id: crypto.randomUUID(),
                      allocationLineId: sources[0]?.id || "",
                      quantity: 1,
                      unit: "piece",
                      particular: "",
                      amount: 0,
                      purpose: "",
                    },
                  ],
                })
              }
            >
              Add purchased item
            </Button>
          )}
          <LabelValue label="Receipt total" value={peso(receipt.amount)} />
          {!!(receipt.amount > (bundle.summary?.perReceiptLimit || 0)) && (
            <>
              <Notice>
                This receipt exceeds the configured per-receipt threshold. The
                Office's override policy still applies.
              </Notice>
              <Field
                label="Threshold override reason"
                value={receipt.overrideReason || ""}
                onChangeText={(v) => change(receipt.id, { overrideReason: v })}
                editable={!intent.current}
              />
            </>
          )}
          <Button
            variant="outline"
            disabled={!!intent.current}
            onPress={() =>
              void action.run(async () => {
                const [file] = await chooseFiles([
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "application/pdf",
                ]);
                if (file) change(receipt.id, { file });
              })
            }
          >
            {receipt.file ? receipt.file.name : "Attach receipt image or PDF"}
          </Button>
          <Button
            variant="ghost"
            disabled={!!intent.current || receipts.length === 1}
            onPress={() =>
              setReceipts((old) => old.filter((r) => r.id !== receipt.id))
            }
          >
            Remove receipt
          </Button>
        </Card>
      ))}
      <Button
        variant="outline"
        disabled={!!intent.current}
        onPress={() => setReceipts((old) => [...old, blank()])}
      >
        Add another receipt
      </Button>
      <Field
        label="Liquidation note"
        value={note}
        onChangeText={setNote}
        multiline
        editable={!intent.current}
      />
      {!!(returned > 0) && (
        <>
          <Field
            label="Cash-return receipt number"
            value={refundNumber}
            onChangeText={setRefundNumber}
            editable={!intent.current}
          />
          <DateField
            label="Cash-return date"
            value={refundDate}
            onChange={setRefundDate}
            disabled={!!intent.current}
          />
        </>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
