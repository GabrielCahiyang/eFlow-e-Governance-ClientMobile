import { useEffect, useState } from "react";
import { ContributionPanel } from "./ContributionPanel";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Screen,
  SearchField,
  Tabs,
} from "../../components/ui";
import { DeliveryAnalytics, useOfficeAnalytics } from "../analytics";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import { buildSkillCoverage } from "../../../core/web/app/features/team-management/selectors/skillSelectors";
import type { TeamAttentionKind } from "../../../core/web/app/features/team-management/types";
import { readEmployeeNotes } from "./employeeNotes";
import { CoachingSheet } from "./CoachingSheet";
import { MemberWork } from "./MemberWork";
export function TeamScreen({
  kind,
  navigate,
}: {
  kind: "supervision" | "intelligence" | "performance";
  navigate: Navigate;
}) {
  const { profile, can } = useAuth(),
    analytics = useOfficeAnalytics(kind === "performance"),
    [view, setView] = useState(
      kind === "supervision"
        ? "people"
        : kind === "performance"
          ? "contribution"
          : "health",
    ),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [attentionKind, setAttentionKind] = useState<TeamAttentionKind | "all">(
      "all",
    ),
    [coaching, setCoaching] = useState(false);
  const data = analytics.data,
    ids = (data?.employees || []).map((e) => e.id),
    notes = useFacts(
      "team-notes:" + profile?.id + ":" + ids.join(","),
      () => readEmployeeNotes(ids),
      !!data && kind !== "performance",
    );
  const people = (data?.employees || []).filter(
      (e) => kind !== "performance" || e.id === profile?.id,
    ),
    filtered = people.filter((e) =>
      (
        e.name +
        " " +
        e.jobTitle +
        " " +
        (notes.data?.[e.id]?.tags || []).join(" ")
      )
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
    person = people.find((e) => e.id === selected),
    metric = data?.memberMetrics.find((m) => m.employeeId === person?.id);
  useEffect(() => {
    setSelected((current) =>
      people.some((e) => e.id === current) ? current : people[0]?.id || "",
    );
  }, [data?.employees]);
  const tabs =
    kind === "performance"
      ? [{ id: "contribution", label: "Monthly contribution" }]
      : [
          { id: "delivery", label: "Project analytics" },
          { id: "people", label: "Employee analytics" },
          { id: "attention", label: "Attention queue" },
          { id: "health", label: "Workload & health" },
          ...(can("navigation.intelligence") || kind === "intelligence"
            ? [
                { id: "skills", label: "Skills coverage" },
                { id: "contribution", label: "Monthly contribution" },
              ]
            : []),
        ];
  return (
    <Screen
      title={kind === "performance" ? "Performance" : "Analytics"}
      description="Live work, submission and review facts from your authorized Office scope."
      onRefresh={() => analytics.refresh()}

      actions={
        kind === "supervision" ? (
          <Button
            variant="outline"
            onPress={() => navigate({ name: "identity" })}
          >
            Identity & access
          </Button>
        ) : undefined
      }
    >
      <Tabs value={view} onChange={setView} items={tabs} />
      {analytics.error ? (
        <ErrorState
          error={analytics.error}
          retry={() => void analytics.refresh()}
        />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          {view === "delivery" && kind !== "performance" && (
            <DeliveryAnalytics tasks={data.tasks} navigate={navigate} />
          )}
          {view === "delivery" ? null : view === "health" ? (
            <>
              <Card title="Office delivery health">
                {Object.entries({
                  Active: data.health.activeTasks,
                  Completed: data.health.completedTasks,
                  Overdue: data.health.overdue,
                  Blocked: data.health.blocked,
                  Stalled: data.health.stalled,
                  "Awaiting review": data.health.awaitingReview,
                  "Changes requested": data.health.changesRequested,
                }).map(([key, value]) => (
                  <LabelValue key={key} label={key} value={String(value)} />
                ))}
              </Card>
              <Notice>
                Metrics support supervision and assignment decisions. Inspect
                source work before making a judgment; these are not automatic
                performance ratings.
              </Notice>
            </>
          ) : view === "attention" ? (
            <>
              <Choice
                label="Attention type"
                value={attentionKind}
                onChange={setAttentionKind}
                options={[
                  "all",
                  "overdue",
                  "due_soon",
                  "blocked",
                  "stalled",
                  "awaiting_review",
                  "changes_requested",
                  "unassigned",
                  "vague_schedule",
                ].map((value) => ({ value, label: value.replace(/_/g, " ") }))}
              />
              {!data.attention.filter(
                (item) =>
                  attentionKind === "all" || item.kind === attentionKind,
              ).length ? (
                <Empty title="No attention items in this filter" />
              ) : (
                data.attention
                  .filter(
                    (item) =>
                      attentionKind === "all" || item.kind === attentionKind,
                  )
                  .map((item) => (
                    <Card key={item.id} title={item.title}>
                      <LabelValue label="Work" value={item.taskTitle} />
                      <LabelValue label="Details" value={item.detail} />
                      <LabelValue label="Severity" value={item.severity} />
                      <Button
                        variant="outline"
                        onPress={() =>
                          navigate({
                            name: "task",
                            id: item.taskId,
                            nodeId: item.subtaskId,
                          })
                        }
                      >
                        Inspect work
                      </Button>
                    </Card>
                  ))
              )}
            </>
          ) : view === "skills" ? (
            notes.error ? (
              <ErrorState
                error={notes.error}
                retry={() => void notes.refresh()}
              />
            ) : notes.loading && !notes.data ? (
              <Loading />
            ) : (
              <>
                <Notice>
                  Coverage combines stored profile skills and coaching tags. One
                  person covering a skill is a single point of dependency.
                </Notice>
                {buildSkillCoverage(data.employees, notes.data || {}).map(
                  (row) => (
                    <Card key={row.skill} title={row.skill}>
                      <LabelValue
                        label="Coverage"
                        value={row.coverage.replace(/_/g, " ")}
                      />
                      <LabelValue
                        label="People"
                        value={row.employeeNames.join(", ")}
                      />
                    </Card>
                  ),
                )}
              </>
            )
          ) : view === "contribution" ? (
            <ContributionPanel
              employees={data.employees}
              tasks={data.tasks}
              facts={data.facts}
              actor={profile!.id}
              onlySelf={kind === "performance"}
            />
          ) : (
            <>
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search people, job title or skill tag"
              />
              <Choice
                label="Team member"
                value={selected}
                onChange={setSelected}
                options={filtered.map((e) => ({
                  value: e.id,
                  label: e.name,
                  description: e.jobTitle,
                }))}
              />
              {!filtered.length ? (
                <Empty title="No matching people" />
              ) : person && metric ? (
                <>
                  <Card title={person.name}>
                    <LabelValue label="Role" value={person.jobTitle} />
                    <LabelValue
                      label="Office"
                      value={person.departmentName || "Not provided"}
                    />
                    <LabelValue
                      label="Workload"
                      value={
                        metric.workload?.label || String(metric.workloadSignal)
                      }
                    />
                    {Object.entries({
                      "Active tasks": metric.activeTasks,
                      Leading: metric.leadingTasks,
                      Subtasks: metric.activeSubtasks,
                      "Review waiting": metric.awaitingReview,
                      Overdue: metric.overdue,
                      Blocked: metric.blocked,
                      "Due soon": metric.dueSoon,
                      "Completed contributions": metric.completedContributions,
                    }).map(([key, value]) => (
                      <LabelValue key={key} label={key} value={String(value)} />
                    ))}
                  </Card>
                  {kind === "intelligence" && (
                    <Card title="Manager context">
                      {notes.error ? (
                        <ErrorState
                          error={notes.error}
                          retry={() => void notes.refresh()}
                        />
                      ) : !notes.data ? (
                        <Loading />
                      ) : (
                        <>
                          <LabelValue
                            label="Strengths"
                            value={
                              notes.data[person.id]?.strengths ||
                              person.jobDescription ||
                              "Not provided"
                            }
                          />
                          <LabelValue
                            label="Development"
                            value={
                              notes.data[person.id]?.weaknesses ||
                              "Not provided"
                            }
                          />
                          <LabelValue
                            label="Notes"
                            value={
                              notes.data[person.id]?.notes || "Not provided"
                            }
                          />
                          <Button
                            disabled={!can("navigation.team_intelligence")}
                            onPress={() => setCoaching(true)}
                          >
                            Edit coaching context
                          </Button>
                        </>
                      )}
                    </Card>
                  )}
                  <MemberWork
                    employee={person.id}
                    tasks={data.tasks}
                    facts={data.facts}
                    navigate={navigate}
                  />
                </>
              ) : (
                <Empty title="Choose a team member" />
              )}
            </>
          )}
          {!!(coaching && person) && (
            <CoachingSheet
              employee={person!}
              actor={profile!.id}
              note={notes.data?.[person!.id]}
              onClose={() => setCoaching(false)}
              onSaved={notes.refresh}
            />
          )}
        </>
      )}
    </Screen>
  );
}
