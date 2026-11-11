import { useRef, useState } from "react";
import { recordedPeso } from "../../components/ui/theme";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { File as NativeFile } from "expo-file-system";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Sheet,
  peso,
} from "../../components/ui";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";
import { useFacts } from "../../shared/useFacts";
import { liquidationInputError } from "../../../core/web/app/features/budget/validation/financialValidation";
import { cashReturnAmounts, cashRequestReference } from "./mobileFinanceScope";
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
  readOnly,
  onSaved,
}: {
  request: PettyCashRequest;
  bundle: DepartmentBudgetBundle;
  onClose: () => void;
  readOnly: boolean;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    action = useAction();
  const assertAccess = useAccountActionAccess();
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
  const [receipts, setReceipts] = useState<NativeReceipt[]>(() => [blank()]),
    [note, setNote] = useState(""),
    [refundNumber, setRefundNumber] = useState(""),
    [refundDate, setRefundDate] = useState(getPhilippineCalendarDate());
  const [opened, setOpened] = useState<string | null | undefined>();
  const scope = "liquidation." + request.id;
  const recovery = useFacts(
    `liquidation-recovery:${profile?.id}:${request.id}`,
    async () => {
      const draft = await draftStore.get<SavedIntent>(profile!.id, scope);
      if (
        draft &&
        (typeof draft.key !== "string" ||
          typeof draft.note !== "string" ||
          typeof draft.refundNumber !== "string" ||
          typeof draft.refundDate !== "string" ||
          !Array.isArray(draft.receipts) ||
          !draft.receipts.length ||
          draft.receipts.some(
            (receipt) => !receipt || typeof receipt.id !== "string",
          ))
      )
        throw new Error(
          "The saved receipt package could not be read. Verify the original submission before continuing.",
        );
      return draft;
    },
    !!profile,
  );
  const [saved, setSaved] = useState<SavedIntent>();
  const intent = saved ?? recovery.data;
  const [confirmed, setConfirmed] = useState(false);
  const editable =
    !intent &&
    !action.busy &&
    !recovery.loading &&
    !recovery.error &&
    !readOnly;
  const currentReadOnly = useRef(readOnly);
  currentReadOnly.current = readOnly;
  const { spent, returned, exceedsRelease } = cashReturnAmounts(
    intent?.receipts ?? receipts,
    request.releasedAmount,
  );
  const receipt = receipts.find(
    (item) => item.id === (opened === undefined ? receipts[0]?.id : opened),
  );
  const activeIndex = receipt ? receipts.indexOf(receipt) : -1;
  const change = (id: string, changes: Partial<NativeReceipt>) => {
    if (!editable) return;
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
      amount: cashReturnAmounts(items).spent,
    });
  };
  const submit = () =>
    action.run(async () => {
      if (
        !profile ||
        currentReadOnly.current ||
        recovery.loading ||
        recovery.error
      )
        throw new Error("Refresh to verify your access to this cash request.");
      assertAccess(profile.id);
      if (!intent && returned === undefined)
        throw new Error(
          "The released amount is unavailable. Refresh the cash request.",
        );
      if (!intent && exceedsRelease)
        throw new Error("Declared spending cannot exceed released cash.");
      if (
        !intent &&
        returned &&
        returned > 0 &&
        (!refundNumber.trim() || !refundDate)
      )
        throw new Error("Enter the cash-return receipt number and date.");
      const current = intent ?? {
        key: crypto.randomUUID(),
        note,
        refundNumber,
        refundDate,
        receipts,
      };
      const drafts: ReceiptDraft[] = await Promise.all(
        current.receipts.map(async (receipt, index) => {
          const file = receipt.file;
          if (!file) return { ...receipt, file: undefined };
          try {
            return {
              ...receipt,
              file: await asServiceFile({
                ...file,
                arrayBuffer:
                  file.arrayBuffer ??
                  (() => new NativeFile(file.uri).arrayBuffer()),
              }),
            };
          } catch {
            if (!intent) setOpened(receipt.id);
            throw new Error(
              `Receipt ${index + 1}: Could not open the attachment. Select the file again or check the original package.`,
            );
          }
        }),
      );
      const issue = liquidationInputError({
        spent,
        note: current.note,
        receipts: drafts,
        refundDate: current.refundDate,
        refundReceiptNumber: current.refundNumber,
      });
      if (issue) {
        const receiptIndex = /^Receipt (\d+):/.exec(issue);
        if (!intent && receiptIndex)
          setOpened(current.receipts[Number(receiptIndex[1]) - 1]?.id);
        throw new Error(issue);
      }
      if (currentReadOnly.current)
        throw new Error("Refresh to verify cash request access.");
      assertAccess(profile.id);
      if (!intent) {
        await draftStore.set(profile.id, scope, current);
        setSaved(current);
      }
      assertAccess(profile.id);
      if (currentReadOnly.current)
        throw new Error("Refresh to verify cash request access.");
      const packageId = await submitPettyCashLiquidation({
        orgId: request.fundingOrgId || request.orgId,
        requestId: request.id,
        spent,
        note: current.note,
        receipts: drafts,
        refundReceiptNumber: current.refundNumber,
        refundDate: current.refundDate,
        idempotencyKey: current.key,
      });
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(packageId))
        throw new Error(
          "The submission could not be confirmed. Check the saved receipt package before trying again.",
        );
      setConfirmed(true);
      await draftStore.remove(profile.id, scope);
      await onSaved();
    });
  return (
    <Sheet
      open
      title="Receipts and cash return"
      description={cashRequestReference(request.requestNumber)}
      onClose={onClose}
      busy={action.busy}
      footer={
        <>
          <LabelValue label="Declared spending" value={peso(spent)} />
          <LabelValue
            label="Unused cash to return"
            value={recordedPeso(returned)}
          />
          <Button
            busy={action.busy}
            disabled={
              !confirmed &&
              (readOnly ||
                recovery.loading ||
                !!recovery.error ||
                (!intent && returned === undefined))
            }
            onPress={confirmed ? onClose : () => void submit()}
          >
            {confirmed
              ? "Done"
              : intent
                ? "Retry saved receipt package"
                : "Submit receipts for review"}
          </Button>
        </>
      }
    >
      {recovery.loading && (
        <Loading label="Checking for a saved receipt package" layout="form" />
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {confirmed ? (
        <Notice>Receipt package submitted.</Notice>
      ) : intent ? (
        <Notice>
          A saved receipt package is ready to check. Retrying uses the original
          submission ID and files.
        </Notice>
      ) : null}
      <LabelValue
        label="Cash released"
        value={recordedPeso(request.releasedAmount)}
      />
      {!recovery.loading && !intent && !confirmed && !recovery.error ? (
        <>
          {receipts.map((receipt, index) => (
            <NavigationRow
              key={receipt.id}
              title={`Receipt ${index + 1}${receipt.vendor.trim() ? " · " + receipt.vendor.trim() : ""}`}
              description={`${peso(receipt.amount)} · ${receipt.file ? "Attached" : "Attachment needed"}`}
              accessibilityHint={
                index === activeIndex
                  ? "Closes receipt editor"
                  : "Opens receipt editor"
              }
              onPress={() =>
                setOpened(index === activeIndex ? null : receipt.id)
              }
            />
          ))}
          {receipt && (
            <Card key={receipt.id} title={`Edit receipt ${activeIndex + 1}`}>
              <Field
                label="Vendor"
                value={receipt.vendor}
                onChangeText={(v) => change(receipt.id, { vendor: v })}
                editable={editable}
              />
              <Field
                label="Receipt number"
                value={receipt.receiptNumber}
                onChangeText={(v) => change(receipt.id, { receiptNumber: v })}
                editable={editable}
              />
              <DateField
                label="Receipt date"
                value={receipt.receiptDate}
                onChange={(v) => change(receipt.id, { receiptDate: v })}
                disabled={!editable}
              />
              {receipt.items ? (
                receipt.items.map((item) => (
                  <Card key={item.id} title="Purchased item">
                    <Choice
                      label="Funding source"
                      value={item.allocationLineId}
                      disabled={!editable}
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
                      editable={editable}
                    />
                    <Field
                      label="Quantity"
                      keyboardType="decimal-pad"
                      value={String(item.quantity)}
                      onChangeText={(v) =>
                        itemChange(receipt, item.id, { quantity: Number(v) })
                      }
                      editable={editable}
                    />
                    <Field
                      label="Unit"
                      value={item.unit}
                      onChangeText={(v) =>
                        itemChange(receipt, item.id, { unit: v })
                      }
                      editable={editable}
                    />
                    <Field
                      label="Item total amount"
                      keyboardType="decimal-pad"
                      value={String(item.amount || "")}
                      onChangeText={(v) =>
                        itemChange(receipt, item.id, { amount: Number(v) })
                      }
                      editable={editable}
                    />
                    <Field
                      label="Purpose"
                      value={item.purpose}
                      onChangeText={(v) =>
                        itemChange(receipt, item.id, { purpose: v })
                      }
                      editable={editable}
                    />
                    <Button
                      variant="ghost"
                      disabled={!editable}
                      onPress={() => {
                        const items = receipt.items!.filter(
                          (i) => i.id !== item.id,
                        );
                        change(receipt.id, {
                          items,
                          amount: cashReturnAmounts(items).spent,
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
                    editable={editable}
                  />
                  <Field
                    label="Receipt amount"
                    value={String(receipt.amount || "")}
                    keyboardType="decimal-pad"
                    onChangeText={(v) =>
                      change(receipt.id, { amount: Number(v) })
                    }
                    editable={editable}
                  />
                </>
              )}
              {!!receipt.items && (
                <Button
                  variant="outline"
                  disabled={!editable}
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
              {!!(
                receipt.amount > (bundle.summary?.perReceiptLimit ?? Infinity)
              ) && (
                <>
                  <Notice>
                    This receipt exceeds the configured per-receipt threshold.
                    The Office's override policy still applies.
                  </Notice>
                  <Field
                    label="Threshold override reason"
                    value={receipt.overrideReason || ""}
                    onChangeText={(v) =>
                      change(receipt.id, { overrideReason: v })
                    }
                    editable={editable}
                  />
                </>
              )}
              <Button
                variant="outline"
                disabled={!editable}
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
                {receipt.file
                  ? receipt.file.name
                  : "Attach receipt image or PDF"}
              </Button>
              <Button
                variant="ghost"
                disabled={!editable || receipts.length === 1}
                onPress={() => {
                  setReceipts((old) => old.filter((r) => r.id !== receipt.id));
                  setOpened(undefined);
                }}
              >
                Remove receipt
              </Button>
            </Card>
          )}
          <Button
            variant="outline"
            disabled={!editable}
            onPress={() => {
              const receipt = blank();
              setReceipts((old) => [...old, receipt]);
              setOpened(receipt.id);
            }}
          >
            Add another receipt
          </Button>
          <Field
            label="Liquidation note"
            value={note}
            onChangeText={setNote}
            multiline
            editable={editable}
          />
          {!!(returned && returned > 0) && (
            <>
              <Field
                label="Cash-return receipt number"
                value={refundNumber}
                onChangeText={setRefundNumber}
                editable={editable}
              />
              <DateField
                label="Cash-return date"
                value={refundDate}
                onChange={setRefundDate}
                disabled={!editable}
              />
            </>
          )}
        </>
      ) : null}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
