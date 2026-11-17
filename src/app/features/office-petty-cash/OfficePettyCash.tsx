import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import Banknote from "lucide-react-native/icons/banknote";
import Check from "lucide-react-native/icons/check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Coins from "lucide-react-native/icons/coins";
import FileText from "lucide-react-native/icons/file-text";
import Plus from "lucide-react-native/icons/plus";
import Receipt from "lucide-react-native/icons/receipt";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Upload from "lucide-react-native/icons/upload";
import Wallet from "lucide-react-native/icons/wallet";
import X from "lucide-react-native/icons/x";
import {
  Button,
  Card,
  Empty,
  DateField,
  ErrorState,
  Field,
  Loading,
  Notice,
  Row,
  Sheet,
  Status,
  peso,
  withOpacity,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useToast } from "../../components/ui/Toast";
import { useAction } from "../../shared/useAction";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import {
  PublicMessageError,
  isDeterministicRejection,
} from "../../shared/userMessages";
import { supabase } from "../../../platform/supabase";
import { chooseFiles, openFileUrl } from "../../../platform/files";
import { draftStore } from "../../../platform/draftStore";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";

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
  canSettle?: boolean;
  settlementBlocked?: boolean;
  headNotified?: boolean;
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

export function OfficePettyCash({
  office,
  requestId,
}: {
  office: string;
  requestId?: string;
}) {
  const { profile, organization } = useAuth();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const [filter, setFilter] = useState<"all" | "action" | "mine">("all");
  const assertAccess = useAccountActionAccess();
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
      if (error) throw error;
      return data as Snapshot;
    },
    !!office && !!actor,
  );
  const recovery = useFacts(
    scope + ":recovery:" + actor,
    () => draftStore.get<Command>(actor, scope),
    !!office && !!actor,
  );
  useEffect(() => {
    if (!office || !actor) return;
    const live = createLiveRefreshController({
      onRefresh: () => void facts.refresh(),
    });
    return () => live.dispose();
  }, [office, actor, facts.refresh]);
  const { toast } = useToast();
  const action = useAction();
  const viewReceipt = (path: string) =>
    void action.run(async () => {
      const opened = await openFileUrl(async () => {
        const { data, error } = await supabase.storage
          .from("office-petty-receipts")
          .createSignedUrl(path, 60);
        if (error) throw error;
        if (!data?.signedUrl)
          throw new PublicMessageError("This receipt is unavailable.");
        return data.signedUrl;
      });
      if (!opened)
        throw new PublicMessageError(
          "Allow pop-ups for eFlow in your browser, then tap the receipt again.",
        );
    });
  const [edit, setEdit] = useState<{ kind: Kind; request?: Request }>();
  const data = facts.error ? undefined : facts.data;
  const ready =
    !!data && !facts.loading && !recovery.loading && !recovery.error;
  const pending = recovery.data;
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(
      actor,
      "office-petty:" +
        office +
        ":" +
        (edit ? edit.kind + ":" + (edit.request?.id ?? "office") : "none"),
    ),
    !!edit && !pending,
    () => ({
      amount: "",
      reference: "",
      date: getPhilippineCalendarDate(),
      receipts: [] as Receipt[],
    }),
  );
  const { amount, reference, date, receipts } = draft;
  const start = (kind: Kind, request?: Request) => {
    action.clear();
    setEdit({ kind, request });
  };
  const update = (i: number, fields: Partial<Receipt>) =>
    updateDraft((old) => ({
      ...old,
      receipts: old.receipts.map((r, j) => (i === j ? { ...r, ...fields } : r)),
    }));
  async function execute(cmd: Command) {
    assertAccess(actor);
    await draftStore.set(actor, scope, cmd);
    assertAccess(actor);
    const { error } = await supabase.rpc("office_petty_cash_command", {
      p_office: office,
      p_key: cmd.key,
      p_action: cmd.action,
      p_data: cmd.data,
    });
    if (error) {
      if (
        !pending &&
        (isDeterministicRejection(error) ||
          (/^[0-9A-Z]{5}$/.test(error.code || "") &&
            !error.code.startsWith("08") &&
            error.code !== "57014"))
      )
        await draftStore.remove(actor, scope);
      await recovery.refresh();
      throw Object.assign(new Error(error.message), { code: error.code });
    }
    clearDraft();
    await draftStore.remove(actor, scope);
    const pettyCashSuccessMessages: Record<Kind, string> = {
      request: "Petty cash request submitted.",
      replenish: "Petty cash fund replenished.",
      approve: "Petty cash request approved.",
      reject: "Petty cash request rejected.",
      cancel: "Petty cash request cancelled.",
      release: "Petty cash release recorded.",
      receipts: "Receipts submitted.",
      endorse: "Receipts endorsed.",
      return_receipts: "Receipts returned.",
      settle: "Petty cash settled.",
    };
    toast(pettyCashSuccessMessages[cmd.action], "success");
    setEdit(undefined);
    await recovery.refresh();
    await facts.refresh();
  }
  function save() {
    void action.run(async () => {
      if (pending) return execute(pending);
      if (!edit || !data || !ready)
        throw new PublicMessageError("Refresh to verify Office petty cash access.");
      const { kind, request } = edit;
      if (!reference.trim() || !date || date > getPhilippineCalendarDate())
        throw new PublicMessageError("Enter a purpose or reference and a valid date.");
      const value = money(amount);
      if (
        (kind === "request" || kind === "replenish") &&
        (!Number.isFinite(value) ||
          value <= 0 ||
          value > (kind === "request" ? data.available : data.replenishable))
      )
        throw new PublicMessageError("Enter an amount within the available office balance.");
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
        throw new PublicMessageError(
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
  const primaryKinds = new Set<Kind>(["approve", "release", "endorse", "settle"]);
  const compactLabels: Record<Kind, string> = {
    request: "Request cash",
    replenish: "Replenish",
    approve: "Approve",
    reject: "Reject",
    cancel: "Cancel request",
    release: "Record release",
    receipts: "Submit receipts",
    endorse: "Endorse",
    return_receipts: "Return",
    settle: "Settle",
  };
  const commandIcon = (kind: Kind, color: string) => {
    switch (kind) {
      case "approve":
      case "settle":
        return <Check size={12.5} color={color} />;
      case "release":
      case "replenish":
        return <Banknote size={12.5} color={color} />;
      case "endorse":
        return <ShieldCheck size={12.5} color={color} />;
      case "receipts":
        return <Upload size={12.5} color={color} />;
      case "request":
        return <Plus size={12.5} color={color} />;
      default:
        return <X size={12.5} color={color} />;
    }
  };
  const commandButton = (kind: Kind, r: Request) => {
    const isPrimary = primaryKinds.has(kind);
    const iconColor = isPrimary ? palette.onPrimary : palette.primary;
    return (
      <Button
        key={kind}
        compact
        variant={isPrimary ? "primary" : "outline"}
        icon={commandIcon(kind, iconColor)}
        accessibilityLabel={`${labels[kind]} for ${r.purpose}`}
        onPress={() => start(kind, r)}
      >
        {compactLabels[kind]}
      </Button>
    );
  };
  const needsActorAction = (r: Request) =>
    (head &&
      actor !== r.requester &&
      (r.status === "pending" || r.status === "receipt_review")) ||
    (accounting &&
      (r.status === "approved" ||
        (r.canSettle === true && r.status === "receipt_approved"))) ||
    (actor === r.requester && r.status === "released");

  const scopedRequests = (data?.requests ?? []).filter(
    (r) => !requestId || r.id === requestId,
  );
  const actionNeededCount = scopedRequests.filter(needsActorAction).length;
  const mineCount = scopedRequests.filter((r) => r.requester === actor).length;
  const visibleRequests = requestId
    ? scopedRequests
    : scopedRequests.filter((r) =>
        filter === "action"
          ? needsActorAction(r)
          : filter === "mine"
            ? r.requester === actor
            : true,
      );

  const rowCommands = (r: Request): Kind[] => {
    if (pending || !ready) return [];
    const list: Kind[] = [];
    if (actor === r.requester && ["pending", "approved"].includes(r.status))
      list.push("cancel");
    if (head && actor !== r.requester && r.status === "pending")
      list.push("approve", "reject");
    if (accounting && r.status === "approved") list.push("release");
    if (actor === r.requester && r.status === "released") list.push("receipts");
    if (head && actor !== r.requester && r.status === "receipt_review")
      list.push("endorse", "return_receipts");
    if (accounting && r.canSettle === true && r.status === "receipt_approved")
      list.push("settle");
    return list;
  };

  return (
    <View style={s.root}>
      {facts.loading && !data && (
        <Loading label="Loading Office petty cash" layout="summary" />
      )}
      {!!facts.error && (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {!!action.notice && <Notice tone="neutral">{action.notice}</Notice>}
      {!!data && (
        <>
          <LinearGradient
            colors={[palette.heroStart, palette.heroEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.heroCard,
              {
                borderColor: isDark
                  ? withOpacity(palette.primary, 0.28)
                  : "rgba(148, 186, 255, 0.24)",
              },
            ]}
          >
            <View>
              <Text style={s.heroEyebrow}>Office revolving fund</Text>
              <Text style={s.heroSub}>
                ₱30,000 starting · ₱5,000/receipt · Separate from project budgets
              </Text>
            </View>
            <View style={s.heroPods}>
              <View style={s.heroPod}>
                <View style={s.heroPodBadge}>
                  <Coins size={16} color="#ffffff" />
                </View>
                <View style={s.podCopy}>
                  <Text style={s.podLabel}>Available</Text>
                  <Text style={s.podValue}>{peso(data.available)}</Text>
                </View>
              </View>
              <View style={s.heroPod}>
                <View style={s.heroPodBadge}>
                  <Wallet size={16} color="#ffffff" />
                </View>
                <View style={s.podCopy}>
                  <Text style={s.podLabel}>Reserved</Text>
                  <Text style={s.podValue}>{peso(data.reserved)}</Text>
                </View>
              </View>
            </View>
            <View style={s.heroPills}>
              <View
                style={[
                  s.heroMicroPill,
                  data.outstanding > 0 && s.heroMicroPillWarn,
                ]}
              >
                <Text style={s.heroMicroText}>
                  Outstanding {peso(data.outstanding)}
                </Text>
              </View>
              {accounting && (
                <View style={s.heroMicroPill}>
                  <Text style={s.heroMicroText}>
                    Can replenish {peso(data.replenishable)}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {!requestId && !pending && ready && ownOffice && (
            <View style={s.topActions}>
              <Button
                style={s.topActionBtn}
                icon={<Plus size={15} color={palette.onPrimary} />}
                onPress={() => start("request")}
              >
                Request cash
              </Button>
              {accounting && data.replenishable > 0 && (
                <Button
                  variant="outline"
                  style={s.topActionBtn}
                  icon={<Banknote size={15} color={palette.primary} />}
                  onPress={() => start("replenish")}
                >
                  Replenish
                </Button>
              )}
            </View>
          )}

          {!requestId && scopedRequests.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterRow}
            >
              {(
                [
                  { key: "all", label: `All (${scopedRequests.length})` },
                  {
                    key: "action",
                    label: `Action needed (${actionNeededCount})`,
                  },
                  { key: "mine", label: `Mine (${mineCount})` },
                ] as const
              ).map((item) => {
                const selected = filter === item.key;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(item.key)}
                    style={[
                      s.filterChip,
                      {
                        borderColor: selected ? palette.primary : palette.border,
                        backgroundColor: selected
                          ? palette.primarySoft
                          : palette.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.filterChipText,
                        { color: selected ? palette.primary : palette.muted },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {requestId && scopedRequests.length === 0 ? (
            <Empty
              compact
              kind="finance"
              title="This Office petty cash request is unavailable"
            />
          ) : (
            <Card
              title="Fund requests"
              icon={<Receipt size={16} color={palette.primary} />}
              badge={`${visibleRequests.length} ${visibleRequests.length === 1 ? "item" : "items"}`}
            >
              {visibleRequests.length === 0 ? (
                <Empty
                  compact
                  kind="finance"
                  title={
                    filter === "action"
                      ? "No petty cash actions needed"
                      : filter === "mine"
                        ? "You have no petty cash requests"
                        : "No petty cash requests yet"
                  }
                />
              ) : (
                <View
                  style={[
                    s.insetGroup,
                    {
                      borderColor: palette.border,
                      backgroundColor: isDark
                        ? withOpacity(palette.background, 0.72)
                        : "#f7f9fd",
                    },
                  ]}
                >
                  {visibleRequests.map((r, index) => {
                    const cmds = rowCommands(r);
                    return (
                      <View
                        key={r.id}
                        style={[
                          s.reqRow,
                          index < visibleRequests.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: palette.border,
                          },
                        ]}
                      >
                        <View style={s.reqTop}>
                          <Text
                            style={[s.reqPurpose, { color: palette.text }]}
                          >
                            {r.purpose}
                          </Text>
                          <Text style={[s.reqAmt, { color: palette.text }]}>
                            {peso(r.amount)}
                          </Text>
                        </View>
                        <View style={s.reqSub}>
                          <Text style={[s.reqPerson, { color: palette.muted }]}>
                            {r.requester === actor ? "You" : r.requesterName}
                          </Text>
                          <Status
                            value={r.status}
                            domain="finance"
                            variant="pill"
                          />
                        </View>
                        {r.settlementBlocked && (
                          <View
                            style={[
                              s.blockedBanner,
                              {
                                backgroundColor: palette.dangerSoft,
                                borderColor: withOpacity(palette.danger, 0.28),
                              },
                            ]}
                          >
                            <CircleAlert
                              size={13}
                              color={palette.danger}
                              style={s.blockedIcon}
                            />
                            <Text
                              style={[
                                s.blockedText,
                                { color: palette.danger },
                              ]}
                            >
                              {r.headNotified
                                ? "Escalated to the Head. "
                                : ""}
                              Staff cannot settle their own petty cash.
                            </Text>
                          </View>
                        )}
                        {(r.receipts.length > 0 || cmds.length > 0) && (
                          <View style={s.reqActions}>
                            <View style={s.receiptChips}>
                              {r.receipts.map((receipt, i) => (
                                <Pressable
                                  key={receipt.path}
                                  accessibilityRole="button"
                                  accessibilityLabel={`View receipt ${i + 1} for ${r.purpose}`}
                                  onPress={() => viewReceipt(receipt.path)}
                                  style={({ pressed }) => [
                                    s.receiptChip,
                                    {
                                      borderColor: palette.border,
                                      backgroundColor: pressed
                                        ? palette.primarySoft
                                        : palette.surface,
                                    },
                                  ]}
                                >
                                  <FileText
                                    size={12.5}
                                    color={palette.primary}
                                  />
                                  <Text
                                    style={[
                                      s.receiptChipText,
                                      { color: palette.primary },
                                    ]}
                                  >
                                    Receipt {i + 1}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                            {cmds.length > 0 && (
                              <Row>{cmds.map((k) => commandButton(k, r))}</Row>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          )}
        </>
      )}
      {!!(edit || pending) && (
        <Sheet
          actionError={action.error}
          open
          title={labels[pending?.action ?? edit!.kind]}
          busy={action.busy}
          onClose={() => {
            if (!pending && !action.busy) {
              action.clear();
              setEdit(undefined);
            }
          }}
          footer={
            <Button
              busy={action.busy}
              disabled={!pending && !ready}
              icon={commandIcon(pending?.action ?? edit!.kind, palette.onPrimary)}
              onPress={save}
            >
              {labels[pending?.action ?? edit!.kind]}
            </Button>
          }
        >
          {!pending && (
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
                  required
                  value={amount}
                  onChangeText={(next) => updateDraft({ amount: next })}
                  keyboardType="decimal-pad"
                />
              )}
              <Field
                label={
                  edit?.kind === "request"
                    ? "Purpose"
                    : "Reason or transaction reference"
                }
                required
                value={reference}
                onChangeText={(next) => updateDraft({ reference: next })}
                multiline
              />
              <DateField
                label="Transaction date"
                required
                value={date}
                onChange={(next) => updateDraft({ date: next })}
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
                        required
                        value={r.vendor}
                        onChangeText={(v) => update(i, { vendor: v })}
                      />
                      <Field
                        label="Receipt number"
                        required
                        value={r.number}
                        onChangeText={(v) => update(i, { number: v })}
                      />
                      <DateField
                        label="Receipt date"
                        required
                        value={r.date}
                        onChange={(v) => update(i, { date: v })}
                      />
                      <Field
                        label="Actual cost"
                        required
                        value={r.amount}
                        onChangeText={(v) => update(i, { amount: v })}
                        keyboardType="decimal-pad"
                      />
                      <Button
                        variant="outline"
                        busy={action.busy}
                        icon={<Upload size={15} color={palette.primary} />}
                        onPress={() =>
                          void action.run(async () => {
                            const [file] = await chooseFiles(formats);
                            if (!file) return;
                            const bytes = await file.arrayBuffer();
                            if (
                              !formats.includes(file.type) ||
                              bytes.byteLength > 10 * 1024 * 1024
                            )
                              throw new PublicMessageError(
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
                            if (error) throw error;
                            update(i, { path });
                          })
                        }
                      >
                        {r.path ? "Replace receipt" : "Attach receipt"}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={action.busy}
                        icon={<X size={15} color={palette.primary} />}
                        onPress={() =>
                          updateDraft((old) => ({
                            ...old,
                            receipts: old.receipts.filter((_, j) => i !== j),
                          }))
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
                      icon={<Plus size={15} color={palette.primary} />}
                      onPress={() =>
                        updateDraft((old) => ({
                          ...old,
                          receipts: [
                            ...old.receipts,
                            {
                              vendor: "",
                              number: "",
                              date,
                              amount: "",
                              path: "",
                            },
                          ],
                        }))
                      }
                    >
                      Add receipt
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </Sheet>
      )}
      {!edit && !pending && !!action.error && (
        <ErrorState context="action" error={action.error} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  heroCard: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    gap: 11,
  },
  heroEyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.75)",
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.84)",
    marginTop: 2,
  },
  heroPods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroPod: {
    flex: 1,
    minWidth: 140,
    borderRadius: 15,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  heroPodBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  podCopy: { flex: 1, minWidth: 0 },
  podLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.74)",
  },
  podValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    fontVariant: ["tabular-nums"],
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  heroMicroPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  heroMicroPillWarn: {
    backgroundColor: "rgba(251,191,36,0.22)",
    borderColor: "rgba(251,191,36,0.38)",
  },
  heroMicroText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "rgba(255,255,255,0.94)",
    fontVariant: ["tabular-nums"],
  },
  topActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topActionBtn: {
    flex: 1,
    minWidth: 140,
  },
  filterRow: {
    flexDirection: "row",
    gap: 7,
    paddingVertical: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  insetGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  reqRow: {
    padding: 12,
    gap: 7,
  },
  reqTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  reqPurpose: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    flex: 1,
  },
  reqAmt: {
    fontSize: 14.5,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  reqSub: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  reqPerson: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  blockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  blockedIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  blockedText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  reqActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  receiptChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  receiptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
  },
  receiptChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
