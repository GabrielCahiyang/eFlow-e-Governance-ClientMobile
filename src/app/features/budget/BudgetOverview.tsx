import { View } from "../../components/ui/Primitives";
import { colors } from "../../components/ui";
import { Card, LabelValue, Notice, peso } from "../../components/ui";
import { recordedPeso } from "../../components/ui/theme";
import type { DepartmentBudgetBundle } from "../../../core/web/app/features/budget/types";
import { sectionTotal } from "../../../core/web/app/features/budget/selectors/budgetSections";
export function BudgetOverview({ data }: { data: DepartmentBudgetBundle }) {
  const summary = data.summary;
  if (!summary) return null;
  return (
    <>
      <Card title="Cash workflow">
        {[
          {
            label: "Awaiting release",
            count: data.requests.filter((r) =>
              [
                "approved",
                "partially_released",
                "scheduled_for_release",
              ].includes(r.status),
            ).length,
          },
          {
            label: "Awaiting Accounting settlement",
            count: data.requests.filter(
              (r) => r.status === "pending_department_settlement",
            ).length,
          },
          {
            label: "Settled",
            count: data.requests.filter((r) => r.status === "settled").length,
          },
        ].map(({ label, count }) => (
          <View key={label}>
            <LabelValue label={label} value={String(count)} />
            <View
              style={{
                height: 6,
                backgroundColor: colors.border,
                borderRadius: 4,
              }}
            >
              <View
                style={{
                  height: 6,
                  backgroundColor: colors.primary,
                  borderRadius: 4,
                  width: `${data.requests.length ? (count / data.requests.length) * 100 : 0}%`,
                }}
              />
            </View>
          </View>
        ))}
      </Card>
      <Card title="Office budget position">
        <LabelValue
          label="Approved appropriation"
          value={peso(summary.approvedAmount)}
        />
        <LabelValue
          label="Budget released"
          value={recordedPeso(summary.budgetReleasedAmount)}
        />
        <LabelValue
          label="Pending release"
          value={peso(summary.heldAmount || 0)}
        />
        <LabelValue
          label="Authorized commitments"
          value={peso(summary.committedAmount)}
        />
        <LabelValue
          label="Settled expenditure"
          value={peso(summary.spentAmount)}
        />
        <LabelValue
          label="Available Office Budget"
          value={peso(summary.availableAmount)}
        />
        <Notice>
          Project authorization reserves the Office Budget once. A cash request,
          a release and verified spending are separate records.
        </Notice>
      </Card>
      <Card title="Cash controls">
        <LabelValue
          label="Daily release ceiling"
          value={peso(summary.dailyPettyCashReleaseLimit)}
        />
        <LabelValue
          label="Released today"
          value={peso(summary.releasedToday)}
        />
        <LabelValue
          label="Scheduled today"
          value={peso(summary.scheduledToday)}
        />
        <LabelValue
          label="Release capacity remaining"
          value={peso(summary.dailyReleaseRemaining)}
        />
        <LabelValue
          label="Per-receipt limit"
          value={peso(summary.perReceiptLimit)}
        />
        <LabelValue
          label="Liquidation deadline"
          value={`${summary.liquidationDueDays} days`}
        />
      </Card>
      {(data.sections || [])
        .filter((s) => !s.parentId && !s.retired)
        .map((section) => (
          <Card key={section.id} title={section.name}>
            <LabelValue
              label="Total"
              value={peso(sectionTotal(data.sections || [], section.id))}
            />
            <LabelValue
              label="Committed"
              value={peso(
                sectionTotal(
                  data.sections || [],
                  section.id,
                  "committedAmount",
                ),
              )}
            />
            <LabelValue
              label="Spent"
              value={peso(
                sectionTotal(data.sections || [], section.id, "spentAmount"),
              )}
            />
          </Card>
        ))}
    </>
  );
}
