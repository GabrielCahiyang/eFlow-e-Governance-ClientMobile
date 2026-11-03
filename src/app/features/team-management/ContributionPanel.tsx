import { useState } from "react";
import {
  Card,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import type { Employee } from "../../../core/web/app/services/employeeService";
import type { Task } from "../../../core/web/app/features/tasks";
import type { TeamWorkflowFacts } from "../../../core/web/app/features/team-management/types";
import {
  buildMonthlyContributionLeaderboard,
  getRecentManilaMonthPeriods,
} from "../../../core/web/app/features/productivity/selectors/monthlyContributionSelectors";
import { fetchMonthlyProductivitySnapshots } from "../../../core/web/app/features/productivity/services/productivitySnapshotService";
export function ContributionPanel({
  employees,
  tasks,
  facts,
  actor,
  onlySelf = false,
}: {
  employees: Employee[];
  tasks: Task[];
  facts: TeamWorkflowFacts;
  actor: string;
  onlySelf?: boolean;
}) {
  const [periods] = useState(() => getRecentManilaMonthPeriods()),
    [month, setMonth] = useState(periods[0].key),
    current = month === periods[0].key;
  const historical = useFacts(
      "contribution:" + actor + ":" + month,
      () => fetchMonthlyProductivitySnapshots(month + "-01"),
      !current,
    ),
    eligible = new Set(employees.map((e) => e.id));
  const rows = (
    current
      ? buildMonthlyContributionLeaderboard(employees, tasks, facts, periods[0])
      : historical.data || []
  ).filter(
    (row) => eligible.has(row.userId) && (!onlySelf || row.userId === actor),
  );
  return (
    <>
      <Choice
        label="Manila month"
        value={month}
        onChange={setMonth}
        options={periods.map((p) => ({ value: p.key, label: p.label }))}
      />
      <Notice>
        Recognition and supervision aid. Contribution scores do not change AI
        assignment inputs and must not be used as the sole personnel decision
        signal.
      </Notice>
      {!current && historical.error ? (
        <ErrorState
          error={historical.error}
          retry={() => void historical.refresh()}
        />
      ) : !current && historical.loading && !historical.data ? (
        <Loading />
      ) : !rows.length ? (
        <Empty title="No approved contributions for this month" />
      ) : (
        rows.map((row) => (
          <Card key={row.userId} title={`${row.rank}. ${row.employeeName}`}>
            <LabelValue
              label="Source"
              value={
                row.source === "snapshot"
                  ? "Saved monthly snapshot"
                  : "Current workflow facts"
              }
            />
            <LabelValue
              label="Contribution score"
              value={String(row.contributionScore)}
            />
            <LabelValue
              label="Approved tasks"
              value={String(row.approvedTasks)}
            />
            <LabelValue
              label="Approved subitems"
              value={String(row.approvedSubtasks)}
            />
            <LabelValue
              label="On-time rate"
              value={
                row.onTimeRate === null ? "No approvals" : `${row.onTimeRate}%`
              }
            />
            <LabelValue
              label="First-pass rate"
              value={
                row.firstPassApprovalRate === null
                  ? "No approvals"
                  : `${row.firstPassApprovalRate}%`
              }
            />
            <LabelValue
              label="Median cycle"
              value={
                row.medianCycleHours === null
                  ? "No approvals"
                  : `${row.medianCycleHours} hours`
              }
            />
            {Object.entries(row.breakdown).map(([key, value]) => (
              <LabelValue key={key} label={key} value={String(value)} />
            ))}
          </Card>
        ))
      )}
    </>
  );
}
