import { Text } from "../../components/ui/Typography";
import { recordedPeso } from "../../components/ui/theme";
import { statusLabel } from "../../shared/statusLabels";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Banknote from "lucide-react-native/icons/banknote";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Clock from "lucide-react-native/icons/clock";
import FileText from "lucide-react-native/icons/file-text";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import ImageIcon from "lucide-react-native/icons/image";
import Receipt from "lucide-react-native/icons/receipt";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Upload from "lucide-react-native/icons/upload";
import X from "lucide-react-native/icons/x";
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
  Status,
  colors,
  dateLabel,
  peso,
  withOpacity,
} from "../../components/ui";
import { View } from "../../components/ui/Primitives";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { useAction } from "../../shared/useAction";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { PublicMessageError } from "../../shared/userMessages";
import { useAuth } from "../authentication";
import { confirmAction } from "../../shared/confirm";
import {
  cancelContextualCashRequest,
  acknowledgePettyCashRelease,
  createReceiptSignedUrl,
  decidePettyCashRequest,
  decidePettyCashLeaderReview,
  recordAccountingRelease,
} from "../../../core/web/app/features/budget/services/budgetService";
import type { PettyCashRequest } from "../../../core/web/app/features/budget/types";
import { LiquidationSheet } from "./LiquidationSheet";
import { SettlementPanel } from "./SettlementPanel";
import { useFinancialAction } from "./useFinancialCommand";
import { FinancialCancelled } from "./financialReceipt";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { cashRequestAmount, cashRequestReference } from "./mobileFinanceScope";
import type { CashRequestBundle } from "./focusedSubtaskFunding";
import { nativeWindow } from "../../../platform/webRuntime";
export function CashRequestCard({
  request,
  bundle,
  onSaved,
  onCorrect,
  onOpenProject,
  readOnly = false,
  focusedReleaseId,
}: {
  request: PettyCashRequest;
  bundle: CashRequestBundle;
  onSaved: () => Promise<void>;
  onCorrect?: () => void;
  onOpenProject?: () => void;
  readOnly?: boolean;
  focusedReleaseId?: string;
}) {
  const { profile, can, organization } = useAuth(),
    palette = useTheme(),
    { isDark } = useAppearance(),
    { fontScale, width } = useWindowDimensions(),
    stackHeroMetrics = fontScale > 1.35 || width < 320,
    readAction = useAction();
  const [receipts, setReceipts] = useState(false),
    [breakdown, showBreakdown] = useState(false),
    [history, showHistory] = useState(false),
    [operation, setOperation] = useState<
      "cancel" | "approve" | "reject" | "release"
    >(),
    [releaseId, setReleaseId] = useState("");
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(
      profile?.id,
      "cash-decision:" +
        request.id +
        ":" +
        (operation ?? "none") +
        (operation === "release" ? ":" + releaseId : ""),
    ),
    !!operation,
    () => ({
      reason: "",
      method: "cash" as "cash" | "cheque",
      cheque: "",
    }),
  );
  const { reason, method, cheque } = draft;
  const action = useFinancialAction(
    profile?.id || "",
    `cash:${request.id}:${JSON.stringify([request.status, bundle.releases.filter((r) => r.requestId === request.id).map((r) => [r.id, r.status, r.acknowledgedAt]), bundle.liquidations.filter((l) => l.requestId === request.id).map((l) => [l.id, l.version, l.status])])}`,
    JSON.stringify([
      request.status,
      operation,
      releaseId,
      bundle.releases
        .filter((r) => r.requestId === request.id)
        .map((r) => [r.id, r.status, r.acknowledgedAt]),
      bundle.liquidations
        .filter((l) => l.requestId === request.id)
        .map((l) => [l.id, l.version, l.status]),
    ]),
  );
  const own = request.requesterId === profile?.id,
    recipient = request.cashRecipientId === profile?.id,
    head =
      isAppointedOfficeHead(profile, organization ? [organization] : []) &&
      profile?.org_id === request.fundingOrgId,
    accounting =
      profile?.role === "accounting_staff" &&
      can("navigation.accounting_releases");
  const canReleaseCash = accounting && can("accounting.release_cash");
  const releases = bundle.releases
      .filter((r) => r.requestId === request.id)
      .sort(
        (a, b) =>
          Number(b.id === focusedReleaseId) - Number(a.id === focusedReleaseId),
      ),
    liquidations = bundle.liquidations
      .filter((l) => l.requestId === request.id)
      .sort((a, b) => b.version - a.version),
    latest = liquidations[0];
  const amount = cashRequestAmount(request);
  const canCancel =
    own &&
    ![
      "partially_released",
      "released",
      "liquidation_submitted",
      "pending_leader_liquidation_review",
      "pending_department_settlement",
      "changes_requested",
      "overdue_liquidation",
      "settled",
      "rejected",
      "cancelled",
      "expired",
    ].includes(request.status);
  const canCorrect =
    own &&
    ["leader_changes_requested", "department_changes_requested"].includes(
      request.status,
    );
  const leaderDecision =
      profile?.id === request.taskLeaderId &&
      request.status === "pending_leader_review",
    headDecision =
      head &&
      ["pending", "pending_department_approval"].includes(request.status);
  const decide = () =>
    action.run(async () => {
      if (!operation) return;
      if (readOnly)
        throw new PublicMessageError("Refresh to verify current cash request access.");
      if (operation !== "release" && !reason.trim())
        throw new PublicMessageError("Record a reason for this decision.");
      if (operation === "cancel")
        await cancelContextualCashRequest(request.id, reason);
      if (operation === "approve" || operation === "reject") {
        if (
          !(await confirmAction(
            operation === "approve"
              ? leaderDecision
                ? "Forward this request to the Office?"
                : "Authorize this cash request?"
              : leaderDecision
                ? "Return this request for changes?"
                : "Reject this cash request?",
            `${peso(request.requestedAmount)} · ${request.purpose}`,
            operation === "approve"
              ? leaderDecision
                ? "Forward for approval"
                : "Authorize request"
              : leaderDecision
                ? "Request changes"
                : "Reject request",
          ))
        )
          throw new FinancialCancelled();
        if (leaderDecision)
          await decidePettyCashLeaderReview(
            request.id,
            operation === "approve",
            reason,
          );
        else
          await decidePettyCashRequest(
            request.id,
            operation === "approve",
            reason,
          );
      }
      if (operation === "release") {
        const release = releases.find((item) => item.id === releaseId);
        if (!canReleaseCash || release?.status !== "scheduled")
          throw new PublicMessageError("This release is no longer available to record.");
        if (
          !(await confirmAction(
            "Record cash release?",
            `${peso(release.amount)} · ${method === "cheque" ? "Cheque " + cheque : "Cash"}. Record this only after the actual handover.`,
            "Record release",
          ))
        )
          throw new FinancialCancelled();
        await recordAccountingRelease({
          releaseId,
          method,
          chequeNumber: cheque || undefined,
        });
      }
      clearDraft();
      setOperation(undefined);
      nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
      await onSaved();
    }, "Financial action recorded.");
  const HeroStatusIcon = [
    "approved",
    "scheduled_for_release",
    "settled",
  ].includes(request.status)
    ? CircleCheck
    : [
          "rejected",
          "overdue_liquidation",
          "changes_requested",
          "leader_changes_requested",
          "department_changes_requested",
        ].includes(request.status)
      ? CircleAlert
      : ["pending", "partially_released", "released"].includes(request.status)
        ? Clock
        : FileText;
  const insetBg = isDark ? withOpacity(palette.background, 0.72) : "#f7f9fd";
  const canSubmitReceipts =
    !readOnly &&
    recipient &&
    ["released", "changes_requested", "overdue_liquidation"].includes(
      request.status,
    );
  const showTopActions =
    (!readOnly && canCorrect && !!onCorrect) ||
    (!readOnly && canCancel) ||
    (!readOnly && (leaderDecision || headDecision)) ||
    canSubmitReceipts;
  const breakdownReasons = [
    request.approvalReason,
    request.leaderDecisionReason,
    request.departmentDecisionReason,
  ].filter(Boolean);

  return (
    <View style={s.root}>
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
        <View style={s.heroTopRow}>
          <View style={s.heroRefPill}>
            <Text style={s.heroRefText}>
              {cashRequestReference(request.requestNumber)}
              {request.requesterName ? ` · ${request.requesterName}` : ""}
            </Text>
          </View>
          <View
            accessibilityLabel={`Status: ${statusLabel(request.status, "finance")}`}
            style={s.heroStatusPill}
          >
            <HeroStatusIcon aria-hidden size={11.5} color="#ffffff" />
            <Text style={s.heroStatusText}>
              {statusLabel(request.status, "finance")}
            </Text>
          </View>
        </View>

        <Text style={s.heroPurpose}>{request.purpose}</Text>

        <View style={[s.heroSplit, stackHeroMetrics && s.heroStacked]}>
          <View style={s.heroCol}>
            <Text style={s.heroK}>{amount.label.toUpperCase()}</Text>
            <Text style={s.heroV}>{recordedPeso(amount.value)}</Text>
          </View>
          <View
            style={
              stackHeroMetrics ? s.heroDividerHorizontal : s.heroDivider
            }
          />
          <View style={s.heroCol}>
            <Text style={s.heroK}>NEEDED BY</Text>
            <Text style={s.heroDateV}>{dateLabel(request.neededBy)}</Text>
          </View>
        </View>

        {onOpenProject ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open linked project"
            onPress={onOpenProject}
            style={({ pressed }) => [
              s.heroFooter,
              pressed && { opacity: 0.78 },
            ]}
          >
            <Text numberOfLines={1} style={s.heroFooterWork}>
              Work: {request.taskTitle || "Authorized work"}
            </Text>
            <View style={s.heroFooterLink}>
              <Text style={s.heroFooterLinkText}>Open project</Text>
              <ChevronRight size={14} color="rgba(219, 234, 254, 0.92)" />
            </View>
          </Pressable>
        ) : (
          <View style={s.heroFooter}>
            <Text numberOfLines={2} style={s.heroFooterWork}>
              Work: {request.taskTitle || "Authorized work"}
              {request.subtaskTitle ? ` · ${request.subtaskTitle}` : ""}
            </Text>
          </View>
        )}
      </LinearGradient>

      {showTopActions && (
        <View style={s.actionRow}>
          {!!(!readOnly && canCorrect && onCorrect) && (
            <Button
              variant="outline"
              style={s.flexBtn}
              icon={<RotateCcw size={15} color={palette.primary} />}
              onPress={onCorrect}
            >
              Correct and re-request
            </Button>
          )}
          {!!(!readOnly && canCancel) && (
            <Button
              variant="outline"
              style={s.flexBtn}
              icon={<X size={15} color={palette.primary} />}
              onPress={() => setOperation("cancel")}
            >
              Withdraw request
            </Button>
          )}
          {!!(!readOnly && (leaderDecision || headDecision)) && (
            <>
              <Button
                style={s.flexBtn}
                icon={<Check size={15} color={palette.onPrimary} />}
                onPress={() => setOperation("approve")}
              >
                {leaderDecision
                  ? "Forward to Office for approval"
                  : "Authorize request"}
              </Button>
              <Button
                variant="outline"
                style={s.flexBtn}
                icon={
                  leaderDecision ? (
                    <RotateCcw size={15} color={palette.primary} />
                  ) : (
                    <X size={15} color={palette.primary} />
                  )
                }
                onPress={() => setOperation("reject")}
              >
                {leaderDecision ? "Request changes" : "Reject request"}
              </Button>
            </>
          )}
          {canSubmitReceipts && (
            <Button
              style={s.flexBtn}
              icon={<Upload size={15} color={palette.onPrimary} />}
              onPress={() => setReceipts(true)}
            >
              Submit receipts and cash return
            </Button>
          )}
        </View>
      )}

      <View
        style={[
          s.accordionCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            breakdown ? "Hide amount breakdown" : "View amount breakdown"
          }
          accessibilityState={{ expanded: breakdown }}
          onPress={() => showBreakdown(!breakdown)}
          style={s.accordionHead}
        >
          <View style={s.accordionCopy}>
            <Text style={[s.accordionTitle, { color: palette.text }]}>
              Amount breakdown
            </Text>
            <Text style={[s.accordionSub, { color: palette.mutedLabel }]}>
              Requested {peso(request.requestedAmount)} · {amount.label}{" "}
              {recordedPeso(amount.value)}
            </Text>
          </View>
          {breakdown ? (
            <ChevronUp size={17} color={palette.mutedLabel} />
          ) : (
            <ChevronDown size={17} color={palette.mutedLabel} />
          )}
        </Pressable>
        {breakdown && (
          <View
            style={[
              s.breakdownBody,
              { borderTopColor: palette.border },
            ]}
          >
            <DetailGroup>
              <LabelValue
                label="Requested"
                value={peso(request.requestedAmount)}
              />
              <LabelValue
                label="Authorized"
                value={recordedPeso(request.approvedAmount)}
              />
              <LabelValue
                label="Cash released"
                value={recordedPeso(request.releasedAmount)}
              />
              <LabelValue
                label="Settled expenditure"
                value={recordedPeso(request.actualSpent)}
              />
              <LabelValue
                label="Cash returned"
                value={recordedPeso(request.returnedAmount)}
              />
            </DetailGroup>
            {breakdownReasons.map((text, index) => (
              <Notice key={index} tone="neutral">
                {text}
              </Notice>
            ))}
          </View>
        )}
      </View>

      {releases.length > 0 && (
        <Card
          title="Cash releases"
          icon={<Banknote size={16} color={palette.primary} />}
          badge={`${releases.length} recorded`}
        >
          <View style={s.rowsList}>
            {releases.map((release) => {
              const showRecord =
                !readOnly && canReleaseCash && release.status === "scheduled";
              const showAck =
                !readOnly &&
                release.status === "released" &&
                !release.acknowledgedAt &&
                release.recipientId === profile?.id;
              return (
                <View
                  key={release.id}
                  style={[
                    s.insetBox,
                    { backgroundColor: insetBg, borderColor: palette.border },
                  ]}
                >
                  <View style={s.releaseTop}>
                    <Text style={[s.releaseAmt, { color: palette.text }]}>
                      {peso(release.amount)}
                    </Text>
                    <Status
                      value={release.status}
                      domain="finance"
                      variant="pill"
                    />
                  </View>
                  <Text style={[s.releaseMeta, { color: palette.mutedLabel }]}>
                    {release.voucherNumber || "Cash release"} · Scheduled{" "}
                    {dateLabel(release.scheduledDate)}
                    {release.releaseMethod
                      ? ` · ${
                          release.releaseMethod === "cheque"
                            ? `Cheque${release.chequeNumber ? ` ${release.chequeNumber}` : ""}`
                            : "Cash"
                        }`
                      : ""}
                  </Text>
                  {(showRecord || showAck) && (
                    <View style={s.inlineActions}>
                      {showRecord && (
                        <Button
                          compact
                          variant="outline"
                          icon={<Banknote size={13} color={palette.primary} />}
                          onPress={() => {
                            setReleaseId(release.id);
                            setOperation("release");
                          }}
                        >
                          Record cash release
                        </Button>
                      )}
                      {showAck && (
                        <Button
                          compact
                          variant="outline"
                          icon={<Check size={13} color={palette.primary} />}
                          onPress={() =>
                            void action.run(async () => {
                              if (
                                !(await confirmAction(
                                  "Acknowledge cash receipt?",
                                  `${peso(release.amount)} · ${release.voucherNumber || "Cash release"}`,
                                  "Acknowledge receipt",
                                ))
                              )
                                throw new FinancialCancelled();
                              await acknowledgePettyCashRelease(
                                release.id,
                                release.voucherNumber,
                              );
                              nativeWindow.dispatchEvent({
                                type: "eflow:finance-updated",
                              });
                              await onSaved();
                            }, "Cash receipt acknowledged.")
                          }
                        >
                          Acknowledge receipt
                        </Button>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {liquidations.length > 1 && (
        <Button
          compact
          variant="ghost"
          icon={<History size={13} color={palette.primary} />}
          onPress={() => showHistory(!history)}
        >
          {history
            ? "Hide earlier receipt packages"
            : `View earlier receipt packages (${liquidations.length - 1})`}
        </Button>
      )}

      {(history ? liquidations : liquidations.slice(0, 1)).map(
        (liquidation) => (
          <Card
            key={liquidation.id}
            title={`Receipt package · v${liquidation.version}`}
            icon={<Receipt size={16} color={palette.primary} />}
            action={
              <Status
                value={liquidation.status}
                domain="finance"
                variant="pill"
              />
            }
          >
            <View
              style={[
                s.splitStrip,
                { backgroundColor: insetBg, borderColor: palette.border },
              ]}
            >
              <View style={s.stripCell}>
                <Text style={[s.stripK, { color: palette.mutedLabel }]}>
                  Declared spent
                </Text>
                <Text style={[s.stripV, { color: palette.text }]}>
                  {peso(liquidation.declaredSpent)}
                </Text>
              </View>
              <View
                style={[s.stripDivider, { backgroundColor: palette.border }]}
              />
              <View style={s.stripCell}>
                <Text style={[s.stripK, { color: palette.mutedLabel }]}>
                  Returned change
                </Text>
                <Text style={[s.stripV, { color: palette.text }]}>
                  {peso(liquidation.returnedAmount)}
                </Text>
              </View>
            </View>

            {!!liquidation.note && (
              <Text style={[s.pkgNote, { color: palette.text }]}>
                {liquidation.note}
              </Text>
            )}

            {!!liquidation.decisionReason && (
              <Notice
                tone={
                  liquidation.status === "changes_requested"
                    ? "warning"
                    : "info"
                }
              >
                {liquidation.decisionReason}
              </Notice>
            )}

            {liquidation.receipts.length > 0 && (
              <View style={s.receiptChips}>
                {liquidation.receipts.map((receipt) => {
                  const Icon = receipt.mimeType?.startsWith("image/")
                    ? ImageIcon
                    : FileText;
                  return (
                    <Pressable
                      key={receipt.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${receipt.vendor} · ${peso(receipt.amount)} · Open receipt`}
                      disabled={readAction.busy}
                      onPress={() =>
                        void readAction.run(async () => {
                          await Linking.openURL(
                            await createReceiptSignedUrl(receipt.filePath),
                          );
                        })
                      }
                      style={({ pressed }) => [
                        s.receiptChip,
                        {
                          backgroundColor: pressed ? palette.primarySoft : insetBg,
                          borderColor: palette.border,
                          opacity: readAction.busy ? 0.55 : 1,
                        },
                      ]}
                    >
                      <Icon size={13} color={palette.primary} />
                      <Text
                        style={[s.receiptChipText, { color: palette.text }]}
                      >
                        {receipt.vendor} · {peso(receipt.amount)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>
        ),
      )}

      {!!(
        latest &&
        !readOnly &&
        (head || accounting || profile?.id === request.taskLeaderId)
      ) && (
        <SettlementPanel
          request={request}
          liquidation={latest}
          onSaved={onSaved}
        />
      )}
      {!operation && !!action.error && (
        <ErrorState context="action" error={action.error} />
      )}
      {!!readAction.error && <ErrorState error={readAction.error} />}
      {!!action.notice && (
        <Text style={{ color: colors.success }}>{action.notice}</Text>
      )}
      {!!receipts && (
        <LiquidationSheet
          request={request}
          bundle={bundle}
          readOnly={
            readOnly ||
            !recipient ||
            !["released", "changes_requested", "overdue_liquidation"].includes(
              request.status,
            )
          }
          onClose={() => setReceipts(false)}
          onSaved={onSaved}
        />
      )}
      <Sheet
        actionError={action.error}
        open={!!operation}
        title={
          operation === "cancel"
            ? "Withdraw cash request"
            : operation === "release"
              ? "Record cash release"
              : operation === "reject"
                ? leaderDecision
                  ? "Request changes"
                  : "Reject cash request"
                : leaderDecision
                  ? "Forward for Office approval"
                  : "Authorize cash request"
        }
        onClose={() => {
          if (!action.busy) {
            action.clear();
            setOperation(undefined);
          }
        }}
        busy={action.busy}
        footer={
          <Button
            busy={action.busy}
            disabled={readOnly}
            icon={
              operation === "cancel" ? (
                <X size={15} color={palette.onPrimary} />
              ) : operation === "release" ? (
                <Banknote size={15} color={palette.onPrimary} />
              ) : operation === "reject" ? (
                leaderDecision ? (
                  <RotateCcw size={15} color={palette.onPrimary} />
                ) : (
                  <X size={15} color={palette.onPrimary} />
                )
              ) : (
                <Check size={15} color={palette.onPrimary} />
              )
            }
            onPress={() => void decide()}
          >
            {operation === "cancel"
              ? "Withdraw request"
              : operation === "release"
                ? "Record release"
                : operation === "reject"
                  ? leaderDecision
                    ? "Request changes"
                    : "Reject request"
                  : leaderDecision
                    ? "Forward for approval"
                    : "Authorize request"}
          </Button>
        }
      >
        {operation === "release" && (
          <>
            <Choice
              label="Release method"
              value={method}
              searchable={false}
              onChange={(next) => updateDraft({ method: next })}
              options={[
                { value: "cash", label: "Cash" },
                { value: "cheque", label: "Cheque" },
              ]}
            />
            {!!(method === "cheque") && (
              <Field
                label="Cheque number"
                value={cheque}
                onChangeText={(next) => updateDraft({ cheque: next })}
              />
            )}
          </>
        )}
        {!!(operation !== "release") && (
          <Field
            label="Reason / required correction"
            value={reason}
            onChangeText={(next) => updateDraft({ reason: next })}
            multiline
          />
        )}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  heroRefPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroRefText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "rgba(226, 232, 240, 0.94)",
    fontVariant: ["tabular-nums"],
  },
  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  heroStatusText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  heroPurpose: {
    fontSize: 16.5,
    fontWeight: "800",
    lineHeight: 22,
    color: "#ffffff",
  },
  heroSplit: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  heroStacked: {
    flexDirection: "column",
  },
  heroCol: {
    flex: 1,
    minWidth: 0,
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroDividerHorizontal: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroK: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: "rgba(219, 234, 254, 0.78)",
  },
  heroV: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  heroDateV: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 6,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.14)",
  },
  heroFooterWork: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(219, 234, 254, 0.88)",
  },
  heroFooterLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  heroFooterLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  flexBtn: {
    flex: 1,
    minWidth: 140,
  },
  accordionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  accordionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  accordionCopy: {
    flex: 1,
    gap: 2,
  },
  accordionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  accordionSub: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  breakdownBody: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 10,
  },
  rowsList: {
    gap: 8,
  },
  insetBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  releaseTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  releaseAmt: {
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  releaseMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  splitStrip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stripCell: {
    flex: 1,
    minWidth: 0,
  },
  stripDivider: {
    width: 1,
    height: 28,
  },
  stripK: {
    fontSize: 11,
    fontWeight: "600",
  },
  stripV: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  pkgNote: {
    fontSize: 13,
    lineHeight: 19,
  },
  receiptChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  receiptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
  },
  receiptChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
