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
import {
  getIndependentReview,
  routeIndependentReview,
  decideIndependentReview,
  independentReviewAllowsPosting,
} from "../../../core/web/app/features/budget/services/independentReviewService";
import {
  decidePettyCashLiquidation,
  authorizeLateLiquidation,
  decidePettyCashLiquidationLeaderReview,
} from "../../../core/web/app/features/budget/services/budgetService";
import { isLiquidationLate } from "../../../core/web/app/features/budget/selectors/cashWorkflowRules";
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
  const palette = useTheme();
  const [reason, setReason] = useState(""),
    [reviewer, setReviewer] = useState("");
  const pending = liquidation.status === "pending_department_settlement";
  const independent = useFacts(
    `independent:${profile?.id}:${liquidation.id}:${liquidation.version}`,
    () => getIndependentReview(liquidation.id),
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
    await onSaved();
    await independent.refresh();
  };
  const settle = (approve: boolean) =>
    action.run(async () => {
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
        const current = await getIndependentReview(liquidation.id);
        if (!accounting || !independentReviewAllowsPosting(current, profile.id))
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
      await refresh();
    }, "Receipt decision recorded.");
  const settlementBlocked = pending && independent.data?.eligibleSettlers === 0;
  // Reuse the existing action visibility conditions for the shared note editor.
  // A blocked settlement must not hide a separately authorized review action.
  const canRouteReview = !!(
    independent.data?.required &&
    accounting &&
    independent.data.candidates.length > 0
  );
  const canReview = !!(
    independent.data?.required && independent.data.canReview
  );
  const showSettlementActions = !!(
    leader ||
    (head && late) ||
    (accounting &&
      independent.data &&
      independentReviewAllowsPosting(independent.data, profile!.id) &&
      !late)
  );
  const showReviewForm = canRouteReview || canReview || showSettlementActions;
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
      {settlementBlocked && (
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
          Independent review:{" "}
          {independent.data!.review!.status.replaceAll("_", " ")}
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
            editable={!action.busy}
            style={{ minHeight: 104 }}
          />
          <Text style={{ fontSize: 13, color: palette.muted }}>
            Required before requesting review or recording a decision.
          </Text>
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
      {!!action.notice && (
        <Text style={{ color: colors.success }}>{action.notice}</Text>
      )}
    </Card>
  );
}
