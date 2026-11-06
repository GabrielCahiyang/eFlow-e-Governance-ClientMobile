import { useState } from "react";
import {View} from '../../components/ui/Primitives';
import {
  Button,
  Card,
  Choice,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  SearchField,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useOfficeAnalytics } from "../analytics";
import { useTaskFacts, myNativeTasks } from "../tasks";
import { useAction } from "../../shared/useAction";
import type { Navigate } from "../../shared/routes";
import { DEPARTMENT_REPORTS } from "../../../core/web/app/features/reports/constants";
import {
  buildDepartmentReportRows,
  filterDepartmentReportRows,
} from "../../../core/web/app/features/reports/selectors/departmentReportSelectors";
import type {
  DepartmentReportKind,
  DepartmentReportRow,
} from "../../../core/web/app/features/reports/types";
import { generateManagementBrief } from "../../../core/web/app/features/reports/services/managementBriefService";
import { exportNativeReport } from "./exportReport";
import { ReportRows } from "./ReportRows";
export function ReportsScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth();
  return profile?.role === "head" ? (
    <OfficeReports navigate={navigate} />
  ) : (
    <PersonalReports navigate={navigate} />
  );
}
function OfficeReports({ navigate }: { navigate: Navigate }) {
  const { organization } = useAuth(),
    analytics = useOfficeAnalytics(),
    action = useAction();
  const [kind, setKind] = useState<DepartmentReportKind>("operations"),
    [query, setQuery] = useState(""),
    [person, setPerson] = useState("all"),
    [project, setProject] = useState("all"),
    [status, setStatus] = useState("all"),
    [period, setPeriod] = useState("0"),
    [brief, setBrief] = useState(""),
    [briefOpen, setBriefOpen] = useState(false);
  const data = analytics.data,
    definition = DEPARTMENT_REPORTS.find((report) => report.id === kind)!;
  const all = data
    ? buildDepartmentReportRows(
        kind,
        data.tasks,
        data.projects,
        data.employees,
        data.facts,
        data.attention,
      )
    : [];
  const rows = filterDepartmentReportRows(all, {
    search: query,
    personId: person,
    projectId: project,
    status,
    from:
      Number(period) > 0 ? Date.now() - Number(period) * 86400000 : undefined,
  });
  const scope = `${organization?.name || "Assigned Office"} · Authorized Office scope · ${period === "0" ? "All time" : `Last ${period} days`} · Person: ${person === "all" ? "All" : data?.employees.find((p) => p.id === person)?.name || person} · Project: ${project === "all" ? "All" : data?.projects.find((p) => p.id === project)?.title || project} · Status: ${status} · Search: ${query || "None"}`;
  return (
    <Screen
      title="Reports"
      description="Operational, contribution, review, evidence and risk lenses in your authorized Office scope."
      onRefresh={() => analytics.refresh()}

      actions={
        <ExportActions
          disabled={!rows.length || !!analytics.error || action.busy}
          run={(format) =>
            void action.run(() =>
              exportNativeReport(format, rows, definition.title, scope),
            )
          }
        />
      }
    >
      <Choice
        label="Report"
        value={kind}
        onChange={(value) => {
          setKind(value);
          setStatus("all");
          setBrief("");
        }}
        options={DEPARTMENT_REPORTS.map((report) => ({
          value: report.id,
          label: report.title,
          description: report.description,
        }))}
      />
      <Text>{definition.description}</Text>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search report records…"
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 160 }}>
          <Choice
            label="Person"
            value={person}
            onChange={setPerson}
            options={[
              { value: "all", label: "All people" },
              ...(data?.employees || []).map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 160 }}>
          <Choice
            label="Project"
            value={project}
            onChange={setProject}
            options={[
              { value: "all", label: "All projects" },
              ...(data?.projects || []).map((p) => ({
                value: p.id,
                label: p.title,
              })),
            ]}
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 160 }}>
          <Choice
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              ...[...new Set(all.map((row) => row.status))]
                .sort()
                .map((value) => ({ value, label: value })),
            ]}
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 160 }}>
          <Period value={period} onChange={setPeriod} />
        </View>
      </View>
      {analytics.error ? (
        <ErrorState
          error={analytics.error}
          retry={() => void analytics.refresh()}
        />
      ) : analytics.loading && !data ? (
        <Loading />
      ) : (
        <>
          <Card title={definition.title}>
            <LabelValue label="Visible records" value={String(rows.length)} />
            <LabelValue
              label="People"
              value={String(
                new Set(rows.map((row) => row.personId).filter(Boolean)).size,
              )}
            />
            <LabelValue
              label="Projects"
              value={String(
                new Set(rows.map((row) => row.projectId).filter(Boolean)).size,
              )}
            />
          </Card>
          <Row>
            <Button
              variant="outline"
              disabled={!rows.length || action.busy}
              onPress={() => {
                setBriefOpen(true);
                setBrief("");
                void action.run(async () => {
                  setBrief(
                    await generateManagementBrief(definition.title, rows),
                  );
                });
              }}
            >
              Generate management brief
            </Button>
          </Row>
          <ReportRows rows={rows} navigate={navigate} />
        </>
      )}
      {!!(!!action.error && !briefOpen) && <ErrorState context="action" error={action.error} />}
      <Sheet
        open={briefOpen}
        title="Management brief"
        onClose={() => setBriefOpen(false)}
        busy={action.busy}
      >
        <Notice>
          AI can make mistakes. Verify recommendations against the source
          records.
        </Notice>
        {action.busy ? (
          <Loading />
        ) : action.error ? (
          <ErrorState context="action" error={action.error} />
        ) : (
          <Text selectable style={{ lineHeight: 24 }}>
            {brief}
          </Text>
        )}
      </Sheet>
    </Screen>
  );
}
function PersonalReports({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth(),
    facts = useTaskFacts("work-report"),
    action = useAction(),
    [status, setStatus] = useState("all"),
    [period, setPeriod] = useState("30");
  const since = Number(period) > 0 ? Date.now() - Number(period) * 86400000 : 0;
  const mine = myNativeTasks(facts.data || [], profile?.id || "").filter(
    (task) =>
      (status === "all" || task.status === status) &&
      (!since || task.createdAt >= since || task.updatedAt >= since),
  );
  const rows: DepartmentReportRow[] = mine.map((task) => ({
    id: task.id,
    kind: "operations",
    title: task.title,
    parent: task.description || "—",
    project: task.projectTitle || "Unlinked work",
    projectId: task.linkedProjectId,
    person: profile?.full_name || "Me",
    personId: profile?.id,
    role: "My task contribution",
    status: task.status,
    priority: task.priority || "medium",
    progress: task.percentComplete ?? 0,
    eventAt: task.updatedAt,
    dueAt:
      task.deadline || task.dueDate
        ? new Date(task.deadline || task.dueDate!).getTime()
        : undefined,
    metric: `${task.percentComplete ?? 0}% complete`,
    detail: task.description || "",
    taskId: task.id,
  }));
  const title = `My work report — ${profile?.full_name || "Me"}`,
    scope = `Personal report · Status: ${status} · ${period === "0" ? "All time" : `Last ${period} days`}`;
  return (
    <Screen
      title="My Work Report"
      description="A personal summary of authorized tasks and progress."
      onRefresh={() => facts.refresh()}

      actions={
        <ExportActions
          disabled={!rows.length || !!facts.error || action.busy}
          run={(format) =>
            void action.run(() =>
              exportNativeReport(format, rows, title, scope),
            )
          }
        />
      }
    >
      <Choice
        label="Work report status"
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: "All statuses" },
          { value: "in_progress", label: "In progress" },
          { value: "for_review", label: "In review" },
          { value: "completed", label: "Completed" },
        ]}
      />
      <Period value={period} onChange={setPeriod} />
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading />
      ) : (
        <>
          <Card title="Work summary">
            <LabelValue label="Tasks" value={String(rows.length)} />
            <LabelValue
              label="Completed"
              value={String(
                mine.filter((t) => t.status === "completed").length,
              )}
            />
            <LabelValue
              label="Completion rate"
              value={`${rows.length ? Math.round((mine.filter((t) => t.status === "completed").length / rows.length) * 100) : 0}%`}
            />
          </Card>
          <ReportRows rows={rows} navigate={navigate} />
        </>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Screen>
  );
}
function Period({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Choice
      label="Period"
      value={value}
      onChange={onChange}
      options={[
        { value: "7", label: "Last 7 days" },
        { value: "30", label: "Last 30 days" },
        { value: "90", label: "Last 90 days" },
        { value: "0", label: "All time" },
      ]}
    />
  );
}
function ExportActions({
  disabled,
  run,
}: {
  disabled: boolean;
  run: (format: "csv" | "pdf") => void;
}) {
  return (
    <Row>
      <Button variant="outline" disabled={disabled} onPress={() => run("csv")}>
        Export CSV
      </Button>
      <Button variant="outline" disabled={disabled} onPress={() => run("pdf")}>
        Export PDF
      </Button>
    </Row>
  );
}
