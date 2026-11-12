import { statusLabel } from "../../shared/statusLabels";
import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import { View } from "../../components/ui/Primitives";
import { useTheme } from "../../components/ui/Appearance";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  Loading,
  Notice,
  colors,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useFinancialAction } from "./useFinancialCommand";
import { FinancialCancelled } from "./financialReceipt";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";
import { nativeWindow } from "../../../platform/webRuntime";
import {
  approveStaffingEscalation,
  getSettlementReview,
  headSettlementAction,
  settlementAllowsAccountingPosting,
} from "./staffingEscalation";
import {
  routeIndependentReview,
  decideIndependentReview,
} from "../../../core/web/app/features/budget/services/independentReviewService";
import {
  decidePettyCashLiquidation,
  authorizeLateLiquidation,
  decidePettyCashLiquidationLeaderReview,
} from "../../../core/web/app/features/budget/services/budgetService";
import { isLiquidationLate } from "../../../core/web/app/features/budget/selectors/cashWorkflowRules";
import { financialFailureIsUncertain } from "../../../core/web/app/features/budget/financialReceipts";
import type {
  PettyCashLiquidation,
  PettyCashRequest,
} from "../../../core/web/app/features/budget/types";
export function SettlementPanel({
  request,
  liquidation,
  onSaved,
}: {
  request: PettyCashRequest;
  liquidation: PettyCashLiquidation;
  onSaved: () => Promise<void>;
}) {
  const { profile, can, organization } = useAuth();
  const assertAccess = useAccountActionAccess();
  const palette = useTheme();
  const [reason, setReason] = useState(""),
    [reviewer, setReviewer] = useState("");
  const pending = liquidation.status === "pending_department_settlement";
  const independent = useFacts(
    `independent:${profile?.id}:${liquidation.id}:${liquidation.version}`,
    () => getSettlementReview(liquidation.id),
    pending,
  );
  const late =
    isLiquidationLate(request, liquidation) && !liquidation.departmentDecidedAt;
  const leader =
    profile?.id === request.taskLeaderId &&
    liquidation.status === "pending_leader_review";
  const head =
    isAppointedOfficeHead(profile, organization ? [organization] : []) &&
    profile?.org_id === request.fundingOrgId;
  const accounting =
    profile?.role === "accounting_staff" &&
    can("navigation.accounting_releases");
  const currentReview = independent.error ? undefined : independent.data;
  const headAction =
    head && pending
      ? headSettlementAction(currentReview, liquidation.version)
      : undefined;
  const escalation = useFinancialAction(
    profile?.id || "",
    `settlement-escalation:${liquidation.id}:${liquidation.version}`,
    JSON.stringify([
      currentReview?.headEscalationFingerprint,
      headAction,
      reason.trim(),
    ]),
  );
  const action = useFinancialAction(
    profile?.id || "",
    `settlement:${liquidation.id}:${JSON.stringify([liquidation.version, liquidation.status, liquidation.departmentDecidedAt, independent.data?.review?.id, independent.data?.review?.status])}`,
    JSON.stringify([
      liquidation.version,
      liquidation.status,
      liquidation.departmentDecidedAt,
      independent.data?.review?.id,
      independent.data?.review?.status,
      reviewer,
    ]),
  );
  const refresh = async () => {
    nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
    nativeWindow.dispatchEvent({
      type: "eflow:finance-updated",
      detail: {
        taskId: request.taskId,
        orgId: request.fundingOrgId,
        requestId: request.id,
      },
    });
    await Promise.all([onSaved(), independent.refresh()]);
  };
  const settle = (approve: boolean) =>
    action.run(
      async () => {
        if (!reason.trim())
          throw new Error("A review note or required correction is required.");
        if (!profile) throw new Error("Sign in again.");
        if (leader) {
          await decidePettyCashLiquidationLeaderReview(
            liquidation.id,
            approve,
            reason,
          );
        } else if (head && late) {
          await authorizeLateLiquidation(liquidation.id, approve, reason);
        } else {
          const current = await getSettlementReview(liquidation.id);
          if (
            !accounting ||
            !settlementAllowsAccountingPosting(current, profile.id)
          )
            throw new Error(
              "Independent review and current Accounting settlement authority are required.",
            );
          if (
            approve &&
            !(await confirmAction(
              "Settle and post journals?",
              "Verify receipts and any returned cash. This records the settlement and balanced journal entries.",
              "Settle and post",
            ))
          )
            throw new FinancialCancelled();
          await decidePettyCashLiquidation(liquidation.id, approve, reason);
        }
      },
      "Receipt decision recorded.",
      refresh,
    );
  const approveEscalation = () =>
    escalation.run(
      async () => {
        if (!profile || !headAction || !reason.trim())
          throw new FinancialCancelled(
            "Current Head approval and a review note are required.",
          );
        const posts = headAction === "post";
        if (
          !(await confirmAction(
            posts
              ? "Approve and post settlement?"
              : "Approve escalated review?",
            posts
              ? "Verify the receipts and any returned cash before posting."
              : "Accounting will still need to post settlement.",
            posts ? "Approve and post" : "Approve review",
          ))
        )
          throw new FinancialCancelled();
        const fresh = await getSettlementReview(liquidation.id);
        if (
          headSettlementAction(fresh, liquidation.version) !== headAction ||
          fresh.headEscalationFingerprint !==
            currentReview?.headEscalationFingerprint
        )
          throw new FinancialCancelled(
            "The review changed. Check the current package before deciding.",
          );
        assertAccess(profile.id);
        const commandId = crypto.randomUUID();
        let uncertain: unknown;
        try {
          await approveStaffingEscalation(fresh, reason.trim(), commandId);
        } catch (error) {
          if (!financialFailureIsUncertain(error)) throw error;
          uncertain = error;
        }
        const recorded = await getSettlementReview(liquidation.id).catch(
          () => undefined,
        );
        if (
          recorded?.liquidationId === liquidation.id &&
          recorded.version === fresh.version &&
          (posts
            ? recorded.headSettlementPosted === true
            : recorded.headEscalationCommandId === commandId)
        )
          return;
        if (uncertain) throw uncertain;
        await refresh();
        throw new Error(
          "The settlement result could not be verified. Check the current request status.",
        );
      },
      headAction === "post" ? "Settlement posted." : "Head decision recorded.",
      refresh,
    );
  const settlementBlocked = pending && currentReview?.eligibleSettlers === 0;
  // Reuse the existing action visibility conditions for the shared note editor.
  // A blocked settlement must not hide a separately authorized review action.
  const canRouteReview = !!(
    !headAction &&
    currentReview?.required &&
    accounting &&
    currentReview.candidates.length > 0
  );
  const canReview = !!(
    !headAction &&
    currentReview?.required &&
    currentReview.canReview
  );
  const showSettlementActions = !!(
    !headAction &&
    (leader ||
      (head && late) ||
      (accounting &&
        currentReview &&
        settlementAllowsAccountingPosting(currentReview, profile!.id) &&
        !late))
  );
  const showReviewForm =
    headAction || canRouteReview || canReview || showSettlementActions;
  const saving = action.busy || escalation.busy;
  if (!leader && !pending) return null;
  return (
    <Card title="Receipt review and settlement">
      {!!leader && (
        <Notice>
          The assigned receipt reviewer must endorse this package before
          Accounting can settle it.
        </Notice>
      )}
      {!!(head && late) && (
        <Notice>
          This package was submitted after its deadline. Independent Head
          authorization is required before Accounting can settle it.
        </Notice>
      )}
      {!!(pending && independent.loading && !independent.data) && (
        <Loading layout="verification" label="Verifying independent review…" />
      )}
      {!!independent.error && (
        <ErrorState
          error={independent.error}
          retry={() => void independent.refresh()}
        />
      )}
      {settlementBlocked && currentReview?.headAlertStatus === "notified" && (
        <Notice>
          Automatically escalated to the Head. No eligible Accounting Officer is
          available. Staff cannot settle cash they requested, received or
          reviewed.
        </Notice>
      )}
      {settlementBlocked &&
        currentReview?.headAlertStatus !== "notified" &&
        !headAction && (
          <ErrorState
            error={
              new Error(
                "Settlement blocked. An independent Accounting Officer is required. Receipt endorsement or review approval does not settle the advance or grant journal-posting permission. Resolve the appointment through the authorized Office workflow.",
              )
            }
          />
        )}
      {!!(independent.data?.required && !settlementBlocked) && (
        <Notice>
          Independent review is required. Review approval does not grant
          permission to settle or post journals.
        </Notice>
      )}
      {!!(independent.data?.required && independent.data.review) && (
        <Text style={{ color: palette.muted }}>
          Independent review: {statusLabel(independent.data!.review!.status)}
        </Text>
      )}
      {!!(independent.data?.escalationRequired && !settlementBlocked) && (
        <Notice>
          No independent eligible settler is currently available. Resolve the
          appointment through the authorized Office workflow.
        </Notice>
      )}
      {showReviewForm && (
        <View
          style={{
            gap: 12,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: palette.border,
          }}
        >
          <Field
            label="Review note"
            value={reason}
            onChangeText={setReason}
            placeholder="Add your review note or required correction"
            accessibilityHint="Required before requesting review or recording a decision."
            multiline
            numberOfLines={4}
            editable={!saving}
            style={{ minHeight: 104 }}
          />
          <Text style={{ fontSize: 13, color: palette.muted }}>
            Required before requesting review or recording a decision.
          </Text>
          {headAction && (
            <Button
              busy={escalation.busy}
              disabled={saving || !reason.trim()}
              onPress={() => void approveEscalation()}
            >
              {headAction === "post"
                ? "Approve and post settlement"
                : "Approve escalated review"}
            </Button>
          )}
          {canRouteReview && (
            <>
              <Choice
                label="Independent reviewer"
                value={reviewer}
                onChange={setReviewer}
                options={independent.data!.candidates.map((c) => ({
                  value: c.id,
                  label: c.name,
                  description: c.appointment,
                }))}
              />
              <Button
                variant="outline"
                busy={action.busy}
                disabled={!reviewer || !reason.trim()}
                onPress={() =>
                  void action.run(async () => {
                    await routeIndependentReview(
                      liquidation.id,
                      liquidation.version,
                      reviewer,
                      reason,
                      crypto.randomUUID(),
                    );
                    await refresh();
                  })
                }
              >
                Request independent review
              </Button>
            </>
          )}
          {canReview && (
            <View style={{ gap: 8 }}>
              <Button
                disabled={action.busy || !reason.trim()}
                onPress={() =>
                  void action.run(async () => {
                    await decideIndependentReview(
                      liquidation.id,
                      liquidation.version,
                      "approved",
                      reason,
                      crypto.randomUUID(),
                    );
                    await refresh();
                  })
                }
              >
                Approve independent review
              </Button>
              <Button
                variant="outline"
                disabled={action.busy || !reason.trim()}
                onPress={() =>
                  void action.run(async () => {
                    await decideIndependentReview(
                      liquidation.id,
                      liquidation.version,
                      "changes_requested",
                      reason,
                      crypto.randomUUID(),
                    );
                    await refresh();
                  })
                }
              >
                Request review changes
              </Button>
            </View>
          )}
          {showSettlementActions && (
            <View style={{ gap: 8 }}>
              <Button busy={action.busy} onPress={() => void settle(true)}>
                {leader
                  ? "Endorse receipt package"
                  : head && late
                    ? "Authorize late package"
                    : "Settle and post"}
              </Button>
              <Button
                variant="outline"
                disabled={action.busy || !reason.trim()}
                onPress={() => void settle(false)}
              >
                Request changes
              </Button>
            </View>
          )}
        </View>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {!!escalation.error && (
        <ErrorState context="action" error={escalation.error} />
      )}
      {!!escalation.notice && (
        <Text style={{ color: colors.success }}>{escalation.notice}</Text>
      )}
      {!!action.notice && (
        <Text style={{ color: colors.success }}>{action.notice}</Text>
      )}
    </Card>
  );
}
