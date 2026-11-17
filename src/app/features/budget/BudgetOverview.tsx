import Coins from "lucide-react-native/icons/coins";
import Wallet from "lucide-react-native/icons/wallet";
import {
  AllocationBar,
  Card,
  DetailGroup,
  LabelValue,
  MetricPair,
  Notice,
  peso,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { recordedPeso } from "../../components/ui/theme";
import type { DepartmentBudgetBundle } from "../../../core/web/app/features/budget/types";
import { sectionTotal } from "../../../core/web/app/features/budget/selectors/budgetSections";

export function BudgetOverview({ data }: { data: DepartmentBudgetBundle }) {
  const palette = useTheme();
  const summary = data.summary;
  if (!summary) return null;
  const totalRequests = data.requests.length;

  return (
    <>
      <Card title="Cash workflow">
        {[
          {
            label: "Awaiting release",
            tone: "warning" as const,
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
            tone: "info" as const,
            count: data.requests.filter(
              (r) => r.status === "pending_department_settlement",
            ).length,
          },
          {
            label: "Settled",
            tone: "success" as const,
            count: data.requests.filter((r) => r.status === "settled").length,
          },
        ].map(({ label, count, tone }) => (
          <AllocationBar
            key={label}
            label={label}
            summary={String(count)}
            percent={totalRequests ? (count / totalRequests) * 100 : 0}
            tone={tone}
          />
        ))}
      </Card>
      <Card
        title="Office budget position"
        icon={<Wallet size={16} color={palette.primary} />}
      >
        <MetricPair
          items={[
            {
              label: "Approved appropriation",
              value: peso(summary.approvedAmount),
              icon: <Wallet size={18} color={palette.primary} />,
            },
            {
              label: "Available Office Budget",
              value: peso(summary.availableAmount),
              tone: "success",
              icon: <Coins size={18} color={palette.success} />,
            },
          ]}
        />
        <DetailGroup>
          <LabelValue
            label="Budget released"
            value={recordedPeso(summary.budgetReleasedAmount)}
          />
          <LabelValue
            label="Pending release"
            value={peso(summary.heldAmount || 0)}
            tone={summary.heldAmount ? "warning" : "neutral"}
          />
          <LabelValue
            label="Authorized commitments"
            value={peso(summary.committedAmount)}
          />
          <LabelValue
            label="Settled expenditure"
            value={peso(summary.spentAmount)}
          />
        </DetailGroup>
        <Notice tone="neutral">
          Project authorization reserves the Office Budget once. A cash request,
          a release and verified spending are separate records.
        </Notice>
      </Card>
      <Card title="Cash controls">
        <DetailGroup>
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
        </DetailGroup>
      </Card>
      {(data.sections || [])
        .filter((s) => !s.parentId && !s.retired)
        .map((section) => (
          <Card key={section.id} title={section.name}>
            <DetailGroup>
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
            </DetailGroup>
          </Card>
        ))}
    </>
  );
}
