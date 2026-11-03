import { useState } from "react";
import { Linking } from "react-native";
import {
  Button,
  Card,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  peso,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { supabase } from "../../../platform/supabase";
import { chooseFiles } from "../../../platform/files";
import { draftStore } from "../../../platform/draftStore";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";

const labels = {
  request: "Request petty cash",
  replenish: "Replenish fund",
  approve: "Approve request",
  reject: "Reject request",
  cancel: "Cancel request",
  release: "Record cash release",
  receipts: "Submit receipts",
  endorse: "Endorse receipts",
  return_receipts: "Return receipts",
  settle: "Settle petty cash",
};
type Kind = keyof typeof labels;
type Receipt = {
  vendor: string;
  number: string;
  date: string;
  amount: string;
  path: string;
};
type Request = {
  id: string;
  requester: string;
  requesterName: string;
  purpose: string;
  amount: number;
  spent: number;
  status: string;
  receipts: Omit<Receipt, "amount">[];
};
type Snapshot = {
  available: number;
  reserved: number;
  outstanding: number;
  replenishable: number;
  requests: Request[];
};
type Command = { key: string; action: Kind; data: Record<string, unknown> };
const money = (s: string) => (/^\d+(?:\.\d{1,2})?$/.test(s) ? Number(s) : 0);
const formats = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function OfficePettyCash({ office }: { office: string }) {
  const { profile, organization } = useAuth();
  const actor = profile?.id || "";
  const ownOffice = profile?.org_id === office;
  const head =
    ownOffice &&
    isAppointedOfficeHead(profile, organization ? [organization] : []);
  const accounting =
    ownOffice &&
    profile?.role === "accounting_staff" &&
    profile.is_active !== false;
  const scope = "office-petty-cash:" + office;
  const facts = useFacts(
    scope + ":" + actor,
    async () => {
      const { data, error } = await supabase.rpc("office_petty_cash_snapshot", {
        p_office: office,
      });
      if (error) throw new Error(error.message);
      return data as Snapshot;
    },
    !!office && !!actor,
  );
  const recovery = useFacts(
    scope + ":recovery:" + actor,
    () => draftStore.get<Command>(actor, scope),
    !!office && !!actor,
  );
  const action = useAction();
  const [edit, setEdit] = useState<{ kind: Kind; request?: Request }>();
  const [amount, setAmount] = useState(""),
    [reference, setReference] = useState(""),
    [date, setDate] = useState(getPhilippineCalendarDate),
    [receipts, setReceipts] = useState<Receipt[]>([]);
  const start = (kind: Kind, request?: Request) => {
    action.clear();
    setAmount("");
    setReference("");
    setDate(getPhilippineCalendarDate());
    setReceipts([]);
    setEdit({ kind, request });
  };
  const data = facts.data;
  const pending = recovery.data;
  const update = (i: number, fields: Partial<Receipt>) =>
    setReceipts((old) =>
      old.map((r, j) => (i === j ? { ...r, ...fields } : r)),
    );
  async function execute(cmd: Command) {
    await draftStore.set(actor, scope, cmd);
    const { error } = await supabase.rpc("office_petty_cash_command", {
      p_office: office,
      p_key: cmd.key,
      p_action: cmd.action,
      p_data: cmd.data,
    });
    if (error) {
      if (
        !pending &&
        /^[0-9A-Z]{5}$/.test(error.code || "") &&
        !error.code.startsWith("08") &&
        error.code !== "57014"
      )
        await draftStore.remove(actor, scope);
      await recovery.refresh();
      throw new Error(error.message);
    }
    await draftStore.remove(actor, scope);
    setEdit(undefined);
    await recovery.refresh();
    await facts.refresh();
  }
  function save() {
    void action.run(async () => {
      if (pending) return execute(pending);
      if (!edit || !data) return;
      const { kind, request } = edit;
      if (!reference.trim() || !date || date > getPhilippineCalendarDate())
        throw new Error("Enter a purpose or reference and a valid date.");
      const value = money(amount);
      if (
        (kind === "request" || kind === "replenish") &&
        (!Number.isFinite(value) ||
          value <= 0 ||
          value > (kind === "request" ? data.available : data.replenishable))
      )
        throw new Error("Enter an amount within the available office balance.");
      const items = receipts.map((r) => ({ ...r, amount: money(r.amount) }));
      if (
        kind === "receipts" &&
        (items.some(
          (r) =>
            !r.vendor.trim() ||
            !r.number.trim() ||
            !r.path ||
            !r.date ||
            r.date > date ||
            r.amount <= 0 ||
            r.amount > 5000,
        ) ||
          items.reduce((n, r) => n + Math.round(r.amount * 100), 0) >
            Math.round((request?.amount || 0) * 100))
      )
        throw new Error(
          "Check the receipt details, attachments and the ₱5,000 per-receipt limit.",
        );
      await execute({
        key: crypto.randomUUID(),
        action: kind,
        data: {
          request: request?.id,
          amount: value,
          reference: reference.trim(),
          date,
          receipts: items,
        },
      });
    }, "Office petty cash updated.");
  }
  const commandButton = (kind: Kind, r: Request) => (
    <Button key={kind} variant="outline" onPress={() => start(kind, r)}>
      {labels[kind]}
    </Button>
  );
  return (
    <Card title="Office petty cash">
      <Notice>
        One shared ₱30,000 starting fund. Up to ₱5,000 per receipt. Separate
        from project and task budgets.
      </Notice>
      {facts.loading && !data && <Loading />}
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {!!action.notice && <Notice>{action.notice}</Notice>}
      {!!data && (
        <>
          <LabelValue
            label="Available to request"
            value={peso(data.available)}
          />
          <LabelValue label="Reserved requests" value={peso(data.reserved)} />
          <LabelValue
            label="Outstanding advances"
            value={peso(data.outstanding)}
          />
          {accounting && (
            <LabelValue
              label="Can replenish"
              value={peso(data.replenishable)}
            />
          )}
          {!pending && !recovery.loading && !recovery.error && ownOffice && (
            <Row>
              <Button onPress={() => start("request")}>{labels.request}</Button>
              {accounting && data.replenishable > 0 && (
                <Button variant="outline" onPress={() => start("replenish")}>
                  {labels.replenish}
                </Button>
              )}
            </Row>
          )}
          {data.requests.map((r) => (
            <Card key={r.id} title={r.purpose}>
              <LabelValue label={r.requesterName} value={peso(r.amount)} />
              <Notice>{r.status.replace(/_/g, " ")}</Notice>
              {r.receipts.map((receipt, i) => (
                <Button
                  key={receipt.path}
                  variant="outline"
                  onPress={() =>
                    void action.run(async () => {
                      const { data, error } = await supabase.storage
                        .from("office-petty-receipts")
                        .createSignedUrl(receipt.path, 60);
                      if (error) throw new Error(error.message);
                      await Linking.openURL(data.signedUrl);
                    })
                  }
                >
                  View receipt {i + 1}
                </Button>
              ))}
              {!pending && !recovery.loading && !recovery.error && (
                <Row>
                  {actor === r.requester &&
                    ["pending", "approved"].includes(r.status) &&
                    commandButton("cancel", r)}
                  {head &&
                    actor !== r.requester &&
                    r.status === "pending" && [
                      commandButton("approve", r),
                      commandButton("reject", r),
                    ]}
                  {accounting &&
                    r.status === "approved" &&
                    commandButton("release", r)}
                  {actor === r.requester &&
                    r.status === "released" &&
                    commandButton("receipts", r)}
                  {head &&
                    actor !== r.requester &&
                    r.status === "receipt_review" && [
                      commandButton("endorse", r),
                      commandButton("return_receipts", r),
                    ]}
                  {accounting &&
                    r.status === "receipt_approved" &&
                    commandButton("settle", r)}
                </Row>
              )}
            </Card>
          ))}
        </>
      )}
      {!!(edit || pending) && (
        <Sheet
          open
          title={pending ? "Verify saved transaction" : labels[edit!.kind]}
          busy={action.busy}
          onClose={() => {
            if (!pending && !action.busy) setEdit(undefined);
          }}
          footer={
            <Button busy={action.busy} onPress={save}>
              {pending ? "Retry saved transaction" : "Confirm"}
            </Button>
          }
        >
          {pending ? (
            <Notice>
              The saved request will be checked using the same transaction ID.
            </Notice>
          ) : (
            <>
              {!!edit?.request && (
                <Notice>
                  {edit.request.purpose} · {peso(edit.request.amount)}
                </Notice>
              )}
              {edit?.kind === "settle" && (
                <Notice>
                  Confirm receipts and actual cash returned:{" "}
                  {peso(
                    (edit.request?.amount || 0) - (edit.request?.spent || 0),
                  )}
                  .
                </Notice>
              )}
              {(edit?.kind === "request" || edit?.kind === "replenish") && (
                <Field
                  label="Amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              )}
              <Field
                label={
                  edit?.kind === "request"
                    ? "Purpose"
                    : "Reason or transaction reference"
                }
                value={reference}
                onChangeText={setReference}
                multiline
              />
              <DateField
                label="Transaction date"
                value={date}
                onChange={setDate}
              />
              {edit?.kind === "receipts" && (
                <>
                  <Notice>
                    Submit without receipts only if the full advance is being
                    returned.
                  </Notice>
                  {receipts.map((r, i) => (
                    <Card key={i} title={"Receipt " + (i + 1)}>
                      <Field
                        label="Vendor"
                        value={r.vendor}
                        onChangeText={(v) => update(i, { vendor: v })}
                      />
                      <Field
                        label="Receipt number"
                        value={r.number}
                        onChangeText={(v) => update(i, { number: v })}
                      />
                      <DateField
                        label="Receipt date"
                        value={r.date}
                        onChange={(v) => update(i, { date: v })}
                      />
                      <Field
                        label="Actual cost"
                        value={r.amount}
                        onChangeText={(v) => update(i, { amount: v })}
                        keyboardType="decimal-pad"
                      />
                      <Button
                        variant="outline"
                        busy={action.busy}
                        onPress={() =>
                          void action.run(async () => {
                            const [file] = await chooseFiles(formats);
                            if (!file) return;
                            const bytes = await file.arrayBuffer();
                            if (
                              !formats.includes(file.type) ||
                              bytes.byteLength > 10 * 1024 * 1024
                            )
                              throw new Error(
                                "Choose a PDF, JPG, PNG or WebP up to 10 MB.",
                              );
                            const path =
                              edit.request!.id + "/" + crypto.randomUUID();
                            const { error } = await supabase.storage
                              .from("office-petty-receipts")
                              .upload(path, bytes, {
                                contentType: file.type,
                                upsert: false,
                              });
                            if (error) throw new Error(error.message);
                            update(i, { path });
                          })
                        }
                      >
                        {r.path ? "Replace receipt" : "Attach receipt"}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={action.busy}
                        onPress={() =>
                          setReceipts((old) => old.filter((_, j) => i !== j))
                        }
                      >
                        Remove receipt
                      </Button>
                    </Card>
                  ))}
                  {receipts.length < 30 && (
                    <Button
                      variant="outline"
                      disabled={action.busy}
                      onPress={() =>
                        setReceipts((old) => [
                          ...old,
                          {
                            vendor: "",
                            number: "",
                            date,
                            amount: "",
                            path: "",
                          },
                        ])
                      }
                    >
                      Add receipt
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          {!!action.error && <ErrorState error={action.error} />}
        </Sheet>
      )}
      {!edit && !pending && !!action.error && (
        <ErrorState error={action.error} />
      )}
    </Card>
  );
}
