import { statusLabel } from "../../shared/statusLabels";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { fetchTeamWorkflowFacts } from "../../../core/web/app/features/team-management/services/teamWorkflowFactsService";
import {
  completionTrend,
  deliveryRows,
  peopleDelivery,
} from "../../../core/web/app/features/analytics/selectors/deliveryAnalytics";
import { ErrorState, DateField, Toggle } from "../../components/ui";
import { useState } from "react";
import { View } from "../../components/ui/Primitives";
import {
  Button,
  Card,
  Choice,
  LabelValue,
  Notice,
  SearchField,
  colors,
} from "../../components/ui";
import { DeadlineBadge } from "../../components/ui/DeadlineBadge";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import type { Navigate } from "../../shared/routes";

export function DeliveryAnalytics({
  tasks,
  navigate,
}: {
  tasks: Task[];
  navigate: Navigate;
}) {
  const { profile } = useAuth();
  const ids = tasks.map((task) => task.id);
  const workflow = useFacts(
    "delivery-analytics:" + profile?.id + ":" + ids.join(","),
    () => fetchTeamWorkflowFacts(ids),
    !!profile && !!ids.length,
  );
  const [project, setProject] = useState("");
  const [weekIds, setWeekIds] = useState<string[]>();
  const projects = [
    ...new Map(
      tasks.flatMap((t) =>
        t.linkedProjectId
          ? [[t.linkedProjectId, t.projectTitle || "Project"] as const]
          : [],
      ),
    ).entries(),
  ];
  const [person, setPerson] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(25);
  const current = tasks.filter(
    (t) => !t.archivedAt && t.status !== "cancelled",
  );
  const statuses = [...new Set(current.map((t) => t.status))];
  const people = [
    ...new Map(
      current.flatMap((t) =>
        t.assigneeId
          ? [[t.assigneeId, t.assigneeName || "Assigned lead"] as const]
          : [],
      ),
    ).entries(),
  ].map(([id, name]) => ({ id, name }));
  const rows = workflow.data
    ? deliveryRows({
        tasks: current,
        people,
        projects: [],
        facts: workflow.data,
      })
    : [];
  const rowById = new Map(rows.map((row) => [row.task.id, row]));
  const invalid = !!from && !!to && from > to;
  const filtered = invalid
    ? []
    : current.filter((t) => {
        const due = (t.dueDate || t.deadline || "").slice(0, 10);
        return (
          (!status || t.status === status) &&
          (!project || t.linkedProjectId === project) &&
          (!weekIds || weekIds.includes(t.id)) &&
          (!person || t.assigneeId === person) &&
          (!overdue || rowById.get(t.id)?.overdue) &&
          (!from || (!!due && due >= from)) &&
          (!to || (!!due && due <= to)) &&
          t.title.toLowerCase().includes(query.toLowerCase())
        );
      });
  const completed = current.filter((t) => t.status === "completed").length;
  return (
    <Card title="Delivery analytics">
      <LabelValue
        label="Completed tasks"
        value={completed + " of " + current.length}
      />
      {statuses.map((value) => {
        const count = current.filter((t) => t.status === value).length;
        const label = value.replace(/_/g, " ");
        return (
          <Card key={value}>
            <LabelValue label={label} value={String(count)} />
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.border,
              }}
            >
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  width: `${(count / current.length) * 100}%`,
                  backgroundColor:
                    value === "completed" ? colors.success : colors.primary,
                }}
              />
            </View>
            <Button
              variant="ghost"
              onPress={() => {
                setStatus(value);
                setLimit(25);
              }}
            >
              View {label} tasks
            </Button>
          </Card>
        );
      })}
      {!!workflow.error && (
        <ErrorState
          error={workflow.error}
          retry={() => void workflow.refresh()}
        />
      )}
      {!!workflow.data && (
        <Card title="Weekly completions">
          {completionTrend(rows).map((week) => (
            <Button
              key={week.from}
              variant="outline"
              disabled={!week.count}
              onPress={() => {
                setWeekIds(week.ids);
                setStatus("");
                setPerson("");
                setProject("");
                setOverdue(false);
                setFrom("");
                setTo("");
                setQuery("");
                setLimit(25);
              }}
            >
              {week.label} · {week.count} completed
            </Button>
          ))}
        </Card>
      )}
      {!!workflow.data && (
        <Card title="Lead delivery">
          {peopleDelivery(rows, people)
            .filter((p) => !person || p.id === person)
            .map((p) => (
              <Card key={p.id} title={p.name}>
                <Button
                  variant="outline"
                  onPress={() => {
                    setPerson(p.id);
                    setWeekIds(undefined);
                    setLimit(25);
                  }}
                >
                  Show tasks led
                </Button>
                <LabelValue
                  label="Led / contributed"
                  value={p.leading + " / " + p.contributing}
                />
                <LabelValue
                  label="On-time first submissions"
                  value={p.onTime + " of " + p.dated}
                />
                <LabelValue
                  label="Overdue / returned for changes"
                  value={p.overdue + " / " + p.revisions}
                />
                <LabelValue
                  label="Typical execution time"
                  value={
                    p.medianHours === null
                      ? "Not enough data"
                      : p.medianHours.toFixed(1) +
                        "h · " +
                        p.samples +
                        " completed samples"
                  }
                />
              </Card>
            ))}
        </Card>
      )}
      {!!weekIds && (
        <Button variant="outline" onPress={() => setWeekIds(undefined)}>
          Clear completion week
        </Button>
      )}
      {projects.length > 0 && (
        <Choice
          label="Project"
          value={project}
          onChange={(v) => {
            setProject(v);
            setLimit(25);
          }}
          options={[
            { value: "", label: "All projects" },
            ...projects.map(([value, label]) => ({ value, label })),
          ]}
        />
      )}
      {!!project && (
        <Button
          variant="outline"
          onPress={() =>
            navigate({ name: "project", id: project, view: "funding" })
          }
        >
          Open project funding
        </Button>
      )}
      <Choice
        label="Task lead"
        value={person}
        onChange={setPerson}
        options={[
          { value: "", label: "All leads" },
          ...people.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />
      <DateField label="Deadline from" value={from} onChange={setFrom} />
      <DateField label="Deadline through" value={to} onChange={setTo} />
      {invalid && (
        <ErrorState
          error={new Error("The end date must be on or after the start date.")}
        />
      )}
      <Toggle
        label="Overdue only"
        value={overdue}
        onChange={setOverdue}
        disabled={!workflow.data}
      />
      <Choice
        label="Status filter"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setLimit(25);
        }}
        options={[
          { value: "", label: "All statuses" },
          ...statuses.map((value) => ({
            value,
            label: value.replace(/_/g, " "),
          })),
        ]}
      />
      <SearchField
        value={query}
        onChange={(v) => {
          setQuery(v);
          setLimit(25);
        }}
        placeholder="Find a task"
      />
      {!filtered.length && <Notice>No matching tasks.</Notice>}
      {filtered.slice(0, limit).map((t) => (
        <Card key={t.id} title={t.title}>
          <LabelValue
            label="Lead"
            value={t.assigneeName || "Needs assignment"}
          />
          <LabelValue label="Status" value={statusLabel(t.status)} />
          <DeadlineBadge value={t.deadline || t.dueDate} status={t.status} />
          {!!rowById.get(t.id) && (
            <LabelValue
              label="Prerequisites remaining"
              value={String(
                rowById
                  .get(t.id)!
                  .prerequisites.filter((p) => p.status !== "completed")
                  .length + rowById.get(t.id)!.missingPrerequisites,
              )}
            />
          )}
          {!!t.linkedProjectId && (
            <Button
              variant="ghost"
              onPress={() =>
                navigate({ name: "task", id: t.id, view: "budget" })
              }
            >
              Open task budget
            </Button>
          )}
          <Button
            variant="outline"
            onPress={() => navigate({ name: "task", id: t.id })}
          >
            Open task
          </Button>
        </Card>
      ))}
      {filtered.length > limit && (
        <Button variant="outline" onPress={() => setLimit(limit + 25)}>
          Show more tasks
        </Button>
      )}
    </Card>
  );
}
