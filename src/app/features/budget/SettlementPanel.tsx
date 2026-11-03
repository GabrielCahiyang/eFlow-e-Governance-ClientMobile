import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  Loading,
  Notice,
  Row,
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
        <Loading label="Verifying independent review…" />
      )}
      {!!independent.error && (
        <ErrorState
          error={independent.error}
          retry={() => void independent.refresh()}
        />
      )}
      {pending && independent.data?.eligibleSettlers === 0 && (
        <ErrorState
          error={
            new Error(
              "Settlement blocked. An independent Accounting Officer is required. Receipt endorsement does not settle the advance.",
            )
          }
        />
      )}
      {!!independent.data?.required && (
        <>
          <Notice>
            Independent review is required. Review approval does not grant
            permission to settle or post journals.
          </Notice>
          {!!independent.data.review && (
            <Text style={{ color: colors.muted }}>
              Independent review:{" "}
              {independent.data.review.status.replaceAll("_", " ")}
            </Text>
          )}
          {!!(accounting && independent.data.candidates.length > 0) && (
            <>
              <Choice
                label="Independent reviewer"
                value={reviewer}
                onChange={setReviewer}
                options={independent.data.candidates.map((c) => ({
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
          {!!independent.data.canReview && (
            <Row>
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
            </Row>
          )}
        </>
      )}
      {!!independent.data?.escalationRequired && (
        <Notice>
          No independent eligible settler is currently available. Resolve the
          appointment through the authorized Office workflow.
        </Notice>
      )}
      <Field
        label="Review note / required correction"
        value={reason}
        onChangeText={setReason}
        multiline
      />
      {!!(
        leader ||
        (head && late) ||
        (accounting &&
          independent.data &&
          independentReviewAllowsPosting(independent.data, profile!.id) &&
          !late)
      ) && (
        <Row>
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
        </Row>
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {!!action.notice && (
        <Text style={{ color: colors.success }}>{action.notice}</Text>
      )}
    </Card>
  );
}
