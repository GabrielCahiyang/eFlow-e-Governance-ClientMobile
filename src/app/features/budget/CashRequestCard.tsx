import { Text } from "../../components/ui/Typography";
import { recordedPeso } from "../../components/ui/theme";
import { useState } from "react";
import { Linking } from "react-native";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Row,
  Sheet,
  Status,
  colors,
  dateLabel,
  peso,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
  readOnly = false,
  focusedReleaseId,
}: {
  request: PettyCashRequest;
  bundle: CashRequestBundle;
  onSaved: () => Promise<void>;
  onCorrect?: () => void;
  readOnly?: boolean;
  focusedReleaseId?: string;
}) {
  const { profile, can, organization } = useAuth(),
    readAction = useAction();
  const [receipts, setReceipts] = useState(false),
    [breakdown, showBreakdown] = useState(false),
    [history, showHistory] = useState(false),
    [operation, setOperation] = useState<
      "cancel" | "approve" | "reject" | "release"
    >(),
    [reason, setReason] = useState(""),
    [method, setMethod] = useState<"cash" | "cheque">("cash"),
    [cheque, setCheque] = useState(""),
    [releaseId, setReleaseId] = useState("");
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
        throw new Error("Refresh to verify current cash request access.");
      if (operation !== "release" && !reason.trim())
        throw new Error("Record a reason for this decision.");
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
          throw new Error("This release is no longer available to record.");
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
      setOperation(undefined);
      setReason("");
      nativeWindow.dispatchEvent({ type: "eflow:finance-updated" });
      await onSaved();
    }, "Financial action recorded.");
  return (
    <Card title={cashRequestReference(request.requestNumber)}>
      <Status value={request.status} domain="finance" />
      <Text style={{ color: colors.text, lineHeight: 21 }}>
        {request.purpose}
      </Text>
      <LabelValue label="Work" value={request.taskTitle || "Authorized work"} />
      <LabelValue
        stacked
        label={amount.label}
        value={recordedPeso(amount.value)}
      />
      <LabelValue label="Needed by" value={dateLabel(request.neededBy)} />
      <Row>
        {!!(!readOnly && canCorrect && onCorrect) && (
          <Button variant="outline" onPress={onCorrect}>
            Correct and re-request
          </Button>
        )}
        {!!(!readOnly && canCancel) && (
          <Button variant="outline" onPress={() => setOperation("cancel")}>
            Withdraw request
          </Button>
        )}
        {!!(!readOnly && (leaderDecision || headDecision)) && (
          <>
            <Button onPress={() => setOperation("approve")}>
              {leaderDecision
                ? "Forward to Office for approval"
                : "Authorize request"}
            </Button>
            <Button variant="outline" onPress={() => setOperation("reject")}>
              {leaderDecision ? "Request changes" : "Reject request"}
            </Button>
          </>
        )}
      </Row>
      {releases.map((release) => (
        <Card key={release.id} title={release.voucherNumber || "Cash release"}>
          <LabelValue
            label="Scheduled"
            value={dateLabel(release.scheduledDate)}
          />
          <LabelValue label="Amount" value={peso(release.amount)} />
          <Status value={release.status} />
          <Row>
            {!!(
              !readOnly &&
              canReleaseCash &&
              release.status === "scheduled"
            ) && (
              <Button
                variant="outline"
                onPress={() => {
                  setReleaseId(release.id);
                  setOperation("release");
                }}
              >
                Record cash release
              </Button>
            )}
            {!!(
              !readOnly &&
              release.status === "released" &&
              !release.acknowledgedAt &&
              release.recipientId === profile?.id
            ) && (
              <Button
                variant="outline"
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
                  })
                }
              >
                Acknowledge receipt
              </Button>
            )}
          </Row>
        </Card>
      ))}
      {!!(
        !readOnly &&
        recipient &&
        ["released", "changes_requested", "overdue_liquidation"].includes(
          request.status,
        )
      ) && (
        <Button onPress={() => setReceipts(true)}>
          Submit receipts and cash return
        </Button>
      )}
      <Button variant="ghost" onPress={() => showBreakdown(!breakdown)}>
        {breakdown ? "Hide amount breakdown" : "View amount breakdown"}
      </Button>
      {breakdown && (
        <Card title="Amount breakdown">
          <LabelValue label="Requested" value={peso(request.requestedAmount)} />
          <LabelValue
            stacked
            label="Authorized"
            value={recordedPeso(request.approvedAmount)}
          />
          <LabelValue
            stacked
            label="Cash released"
            value={recordedPeso(request.releasedAmount)}
          />
          <LabelValue
            stacked
            label="Settled expenditure"
            value={recordedPeso(request.actualSpent)}
          />
          <LabelValue
            stacked
            label="Cash returned"
            value={recordedPeso(request.returnedAmount)}
          />
          {[
            request.approvalReason,
            request.leaderDecisionReason,
            request.departmentDecisionReason,
          ]
            .filter(Boolean)
            .map((text, index) => (
              <Notice key={index}>{text}</Notice>
            ))}
        </Card>
      )}
      {liquidations.length > 1 && (
        <Button variant="ghost" onPress={() => showHistory(!history)}>
          {history
            ? "Hide earlier receipt packages"
            : "View earlier receipt packages"}
        </Button>
      )}
      {(history ? liquidations : liquidations.slice(0, 1)).map(
        (liquidation) => (
          <Card
            key={liquidation.id}
            title={`Receipt package · version ${liquidation.version}`}
          >
            <Status value={liquidation.status} />
            <LabelValue
              stacked
              label="Declared spending"
              value={peso(liquidation.declaredSpent)}
            />
            <LabelValue
              stacked
              label="Returned cash"
              value={peso(liquidation.returnedAmount)}
            />
            <Text style={{ color: colors.text, lineHeight: 20 }}>
              {liquidation.note}
            </Text>
            {!!liquidation.decisionReason && (
              <Notice>{liquidation.decisionReason}</Notice>
            )}
            {liquidation.receipts.map((receipt) => (
              <Button
                key={receipt.id}
                variant="outline"
                onPress={() =>
                  void readAction.run(async () => {
                    await Linking.openURL(
                      await createReceiptSignedUrl(receipt.filePath),
                    );
                  })
                }
              >
                {receipt.vendor} · {peso(receipt.amount)} · Open receipt
              </Button>
            ))}
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
      {!!action.error && <ErrorState context="action" error={action.error} />}
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
        onClose={() => setOperation(undefined)}
        busy={action.busy}
        footer={
          <Button
            busy={action.busy}
            disabled={readOnly}
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
              onChange={setMethod}
              options={[
                { value: "cash", label: "Cash" },
                { value: "cheque", label: "Cheque" },
              ]}
            />
            {!!(method === "cheque") && (
              <Field
                label="Cheque number"
                value={cheque}
                onChangeText={setCheque}
              />
            )}
          </>
        )}
        {!!(operation !== "release") && (
          <Field
            label="Reason / required correction"
            value={reason}
            onChangeText={setReason}
            multiline
          />
        )}
        {!!action.error && <ErrorState context="action" error={action.error} />}
      </Sheet>
    </Card>
  );
}
