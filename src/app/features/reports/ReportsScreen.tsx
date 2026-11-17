import { useState } from "react";
import { StyleSheet } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import ChartColumn from "lucide-react-native/icons/chart-column";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Download from "lucide-react-native/icons/download";
import Layers from "lucide-react-native/icons/layers";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Users from "lucide-react-native/icons/users";
import { ScrollView, View } from "../../components/ui/Primitives";
import {
  AllocationBar,
  Button,
  Card,
  Choice,
  DetailGroup,
  ErrorState,
  LabelValue,
  Loading,
  MetricPair,
  Notice,
  Screen,
  SearchField,
  Sheet,
} from "../../components/ui";
import { FilterChip } from "../../components/ui/FilterChip";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import { useOfficeAnalytics } from "../analytics";
import { useTaskFacts, myNativeTasks } from "../tasks";
import { taskCalendarDate } from "../tasks/taskDates";
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
import { exportNativeReport } from "./exportReport";
import { ReportRows } from "./ReportRows";
import { useWorkspace } from "../workspaces";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { workDay } from "../../../core/web/app/shared/workCalendar";
import { reportRecordRoute } from "./reportRecordRoute";

const REPORT_PILL_LABELS: Record<DepartmentReportKind, string> = {
  operations: "Operations",
  projects: "Projects",
  contributions: "Contributions",
  reviews: "Reviews",
  evidence: "Evidence",
  risks: "Risks",
  lifecycle: "Lifecycle",
};

const PERIOD_OPTIONS = [
  { value: "0", short: "All dates", label: "All time" },
  { value: "7", short: "Last 7d", label: "Last 7 days" },
  { value: "30", short: "Last 30d", label: "Last 30 days" },
  { value: "90", short: "Last 90d", label: "Last 90 days" },
] as const;

export function ReportsScreen({
  navigate,
  initialView,
}: {
  navigate: Navigate;
  initialView?: string;
}) {
  const { profile, organization, can } = useAuth();
  const { selected, loading, error } = useWorkspace();
  const office = selected?.workspace;

  if (profile?.role !== "head") return <PersonalReports navigate={navigate} />;

  if (!office && loading && !error)
    return (
      <Screen title="Office Analytics">
        <Loading label="Verifying Office access" layout="verification" />
      </Screen>
    );

  if (
    error ||
    office?.kind !== "office" ||
    !office.office_id ||
    office.office_id !== profile.org_id ||
    !can("navigation.reports") ||
    !isAppointedOfficeHead(profile, organization ? [organization] : [])
  )
    return (
      <Screen title="Office Analytics">
        <ErrorState error="Select your appointed Office workspace to view Office reports." />
      </Screen>
    );

  return (
    <OfficeReports
      key={office.id + ":" + initialView}
      navigate={navigate}
      initialView={initialView}
      office={office.office_id}
      workspaceId={office.id}
    />
  );
}

function OfficeReports({
  navigate,
  initialView,
  office,
}: {
  navigate: Navigate;
  initialView?: string;
  office: string;
  workspaceId: string;
}) {
  const palette = useTheme();
  const focused = useIsFocused();
  const firstKind =
    DEPARTMENT_REPORTS.find((report) => report.id === initialView)?.id ??
    "operations";
  const [includeHistory, setIncludeHistory] = useState(
    () => !["operations", "projects"].includes(firstKind),
  );
  const { organization } = useAuth(),
    analytics = useOfficeAnalytics(true, office, focused, includeHistory),
    action = useAction();
  const [kind, setKind] = useState<DepartmentReportKind>(firstKind),
    [query, setQuery] = useState(""),
    [person, setPerson] = useState("all"),
    [project, setProject] = useState("all"),
    [status, setStatus] = useState("all"),
    [period, setPeriod] = useState("0"),
    [filterOpen, setFilterOpen] = useState(false),
    [exportNotice, setExportNotice] = useState<string>();

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
      Number(period) > 0
        ? ((workDay(new Date(), "Asia/Manila") ?? 0) - Number(period) + 1) *
            86400000 -
          8 * 3600000
        : undefined,
  });

  const peopleCount = new Set(
    rows.map((row) => row.personId).filter(Boolean),
  ).size;
  const projectsCount = new Set(
    rows.map((row) => row.projectId).filter(Boolean),
  ).size;
  const activeFilters =
    Number(person !== "all") +
    Number(project !== "all") +
    Number(status !== "all") +
    Number(period !== "0");
  const hasResettableFilters = activeFilters > 0 || query.trim().length > 0;

  const resetFilters = () => {
    setQuery("");
    setPerson("all");
    setProject("all");
    setStatus("all");
    setPeriod("0");
  };

  const scope = `${organization?.name || "Assigned Office"} · Authorized Office scope · ${period === "0" ? "All time" : `Last ${period} days`} · Person: ${person === "all" ? "All" : data?.employees.find((p) => p.id === person)?.name || person} · Project: ${project === "all" ? "All" : data?.projects.find((p) => p.id === project)?.title || project} · Status: ${status} · Search: ${query || "None"}`;
  const noticeTone =
    kind === "reviews"
      ? "review"
      : kind === "risks"
        ? "warning"
        : kind === "contributions" || kind === "lifecycle"
          ? "neutral"
          : "info";

  return (
    <Screen
      title="Office Analytics"
      description={`${organization?.name || "Assigned Office"} · ${period === "0" ? "All dates" : `Last ${period} calendar days`} · Philippine time`}
      onRefresh={() => analytics.refresh()}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
      >
        {DEPARTMENT_REPORTS.map((report) => (
          <FilterChip
            key={report.id}
            label={REPORT_PILL_LABELS[report.id]}
            accessibilityLabel={report.title}
            selected={kind === report.id}
            onPress={() => {
              setKind(report.id);
              if (!["operations", "projects"].includes(report.id))
                setIncludeHistory(true);
              setStatus("all");
            }}
          />
        ))}
      </ScrollView>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search report records…"
        filterTrigger={{
          label: "Filters",
          active: filterOpen || activeFilters > 0,
          count: activeFilters,
          accessibilityLabel: activeFilters
            ? `Filters, ${activeFilters} active`
            : "Filters",
          onPress: () => setFilterOpen(true),
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.short}
            accessibilityLabel={`Period: ${opt.label}`}
            selected={period === opt.value}
            onPress={() => setPeriod(opt.value)}
          />
        ))}
        {hasResettableFilters && (
          <FilterChip
            label="Reset"
            tone="tinted"
            removable
            accessibilityLabel="Reset report filters"
            onPress={resetFilters}
          />
        )}
      </ScrollView>

      <Notice tone={noticeTone}>
        {kind === "reviews"
          ? "Review waiting time runs from submission to decision, or to now for pending attempts. It is separate from work execution time."
          : kind === "contributions"
            ? "Lead and contributor roles describe recorded assignments. A submission identifies its author, and approval is a separate event."
            : "Current overdue work uses the recorded due date. Historical timeliness and early completion are unavailable when the deadline in force at the time cannot be verified."}
      </Notice>

      {analytics.error ? (
        <ErrorState
          error={analytics.error}
          retry={() => void analytics.refresh()}
        />
      ) : analytics.loading && !data ? (
        <Loading label="Loading Office analytics" layout="reports" />
      ) : (
        <>
          <Card
            title={definition.title}
            icon={<ChartColumn size={16} color={palette.primary} />}
            badge={period === "0" ? "All time" : `${period}d`}
            badgeTone={
              kind === "risks"
                ? "warning"
                : kind === "reviews"
                  ? "review"
                  : "neutral"
            }
          >
            <Text style={[s.cardSubtitle, { color: palette.muted }]}>
              {definition.description}
            </Text>
            <MetricPair
              items={[
                {
                  label: "Visible records",
                  value: String(rows.length),
                  icon: <Layers size={18} color={palette.primary} />,
                },
                {
                  label: "People",
                  value: String(peopleCount),
                  tone: "info",
                  icon: <Users size={18} color={palette.blue} />,
                },
              ]}
            />
            <DetailGroup>
              <LabelValue label="Projects" value={String(projectsCount)} />
              {activeFilters > 0 && (
                <LabelValue
                  label="Active filters"
                  value={`${activeFilters} applied`}
                  tone="info"
                />
              )}
            </DetailGroup>
            <ExportActions
              compact
              disabled={!rows.length || action.busy}
              run={(format) => {
                setExportNotice(undefined);
                void action.run(async () => {
                  setExportNotice(
                    await exportNativeReport(format, rows, definition.title, scope, "save"),
                  );
                });
              }}
            />
            {exportNotice && (
              <Notice tone="success" title="Open your report">
                {exportNotice}
              </Notice>
            )}
            {!!action.error && <ErrorState context="action" error={action.error} />}
          </Card>

          <ReportRows
            key={JSON.stringify([kind, query, person, project, status, period])}
            rows={rows}
            navigate={navigate}
            destination={(row) =>
              reportRecordRoute(row, data?.facts, data?.attention)
            }
          />
        </>
      )}

      <Sheet
        open={filterOpen}
        title="Filter records"
        onClose={() => setFilterOpen(false)}
      >
        <View style={s.sheetStack}>
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
          <Choice
            label="Status"
            value={status}
            searchable={false}
            onChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              ...[...new Set(all.map((row) => row.status))]
                .sort()
                .map((value) => ({ value, label: value })),
            ]}
          />
          <Period value={period} onChange={setPeriod} />
          {hasResettableFilters && (
            <Button
              variant="outline"
              icon={<RotateCcw size={16} color={palette.primary} />}
              onPress={() => {
                resetFilters();
                setFilterOpen(false);
              }}
            >
              Reset all filters
            </Button>
          )}
        </View>
      </Sheet>

    </Screen>
  );
}

function PersonalReports({ navigate }: { navigate: Navigate }) {
  const palette = useTheme();
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
  const completedCount = mine.filter((t) => t.status === "completed").length;
  const completionRate = mine.length
    ? Math.round((completedCount / mine.length) * 100)
    : 0;

  const rows: DepartmentReportRow[] = mine.map((task) => {
    const due = taskCalendarDate(task.deadline || task.dueDate);
    return {
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
      dueAt: due ? new Date(due + "T00:00:00").getTime() : undefined,
      metric: `${task.percentComplete ?? 0}% complete`,
      detail: task.description || "",
      taskId: task.id,
    };
  });

  const title = `My work report — ${profile?.full_name || "Me"}`,
    scope = `Personal report · Status: ${status} · ${period === "0" ? "All time" : `Last ${period} days`}`;

  return (
    <Screen
      title="My Work Report"
      description="A personal summary of authorized tasks and progress."
      onRefresh={() => facts.refresh()}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
      >
        {[
          { value: "all", label: "All statuses" },
          { value: "in_progress", label: "In progress" },
          { value: "for_review", label: "In review" },
          { value: "completed", label: "Completed" },
        ].map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            selected={status === opt.value}
            onPress={() => setStatus(opt.value)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.short}
            accessibilityLabel={`Period: ${opt.label}`}
            selected={period === opt.value}
            onPress={() => setPeriod(opt.value)}
          />
        ))}
      </ScrollView>

      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading label="Loading work report" layout="reports" />
      ) : (
        <>
          <Card
            title="Work summary"
            icon={<ChartColumn size={16} color={palette.primary} />}
            badge={period === "0" ? "All time" : `${period}d`}
          >
            <MetricPair
              items={[
                {
                  label: "Tasks",
                  value: String(rows.length),
                  icon: <Layers size={18} color={palette.primary} />,
                },
                {
                  label: "Completed",
                  value: String(completedCount),
                  tone: "success",
                  icon: <CircleCheck size={18} color={palette.success} />,
                },
              ]}
            />
            <AllocationBar
              label="Completion rate"
              summary={`${completionRate}% · ${completedCount} of ${rows.length}`}
              percent={completionRate}
              tone="success"
            />
            <ExportActions
              compact
              disabled={!rows.length || !!facts.error || action.busy}
              run={(format) =>
                void action.run(() =>
                  exportNativeReport(format, rows, title, scope),
                )
              }
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
      searchable={false}
      onChange={onChange}
      options={PERIOD_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
      }))}
    />
  );
}

function ExportActions({
  disabled,
  compact = false,
  run,
}: {
  disabled: boolean;
  compact?: boolean;
  run: (format: "csv" | "pdf") => void;
}) {
  const palette = useTheme();
  const iconSize = compact ? 12 : 16;
  return (
    <View style={s.exportRow}>
      <Button
        variant="outline"
        compact={compact}
        disabled={disabled}
        icon={<Download size={iconSize} color={palette.primary} />}
        onPress={() => run("csv")}
      >
        Export CSV
      </Button>
      <Button
        variant="outline"
        compact={compact}
        disabled={disabled}
        icon={<Download size={iconSize} color={palette.primary} />}
        onPress={() => run("pdf")}
      >
        Export PDF
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  exportRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetStack: {
    gap: 14,
  },
});
