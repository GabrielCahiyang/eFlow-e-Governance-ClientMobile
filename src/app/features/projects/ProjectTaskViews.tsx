import { useWorkStatus } from "../../shared/workStatusPresentation";
import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Pressable, ScrollView, View } from "../../components/ui/Primitives";
import {
  Button,
  Card,
  DataTable,
  LabelValue,
  Row,
  Status,
  colors,
  dateLabel,
  peso,
} from "../../components/ui";
import type { Navigate } from "../../shared/routes";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import type { Project } from "../../../core/web/app/features/projects/services/types";
import { STATUS_COLORS } from "../../../core/web/app/features/project-table/selectors";
import { useAuth } from "../authentication";
export function ProjectTaskTable({
  tasks,
  navigate,
  columns,
}: {
  tasks: Task[];
  navigate: Navigate;
  columns: string[];
}) {
  const { organization } = useAuth();
  const text = (value: string) => (
    <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
      {value}
    </Text>
  );
  const all = [
    {
      id: "task",
      title: "Task",
      width: 260,
      render: (t: Task) => (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigate({ name: "task", id: t.id, projectId: t.linkedProjectId })
          }
        >
          {text(t.title)}
        </Pressable>
      ),
    },
    {
      id: "office",
      title: "Office",
      width: 140,
      render: (t: Task) =>
        text(
          t.orgId && t.orgId === organization?.id
            ? organization.name
            : t.department || t.teamName || "—",
        ),
    },
    {
      id: "owner",
      title: "Owner",
      width: 210,
      render: (t: Task) =>
        text(
          [
            `Lead: ${t.assigneeName || "Needs assignment"}`,
            `Contributors: ${(t.teamMemberNames || []).filter((n) => n !== t.assigneeName).join(", ") || "None"}`,
          ].join("\n"),
        ),
    },
    {
      id: "status",
      title: "Status",
      width: 150,
      render: (t: Task) => <Status value={t.status} work customId={t.customStatusId} />,
    },
    {
      id: "timeline",
      title: "Due date",
      width: 180,
      render: (t: Task) =>
        text(
          (t.startDate ? dateLabel(t.startDate) + " → " : "") +
            dateLabel(t.deadline || t.dueDate),
        ),
    },
    {
      id: "priority",
      title: "Priority",
      width: 110,
      render: (t: Task) => text(t.priority || "medium"),
    },
    {
      id: "effort",
      title: "Estimated hours",
      width: 115,
      render: (t: Task) => text(`${t.estimatedHours || 0}h`),
    },
    {
      id: "dependencies",
      title: "Dependencies",
      width: 190,
      render: (t: Task) =>
        text(
          (t.dependencyIds || [])
            .map((id) => tasks.find((o) => o.id === id)?.title || "Linked task")
            .join(", ") || "—",
        ),
    },
    {
      id: "budget",
      title: "Budget",
      width: 145,
      render: (t: Task) => (
        <Button
          variant="ghost"
          onPress={() => navigate({ name: "task", id: t.id, view: "budget" })}
        >
          View funding
        </Button>
      ),
    },
    {
      id: "progress",
      title: "Progress",
      width: 125,
      render: (t: Task) =>
        text(
          t.status === "completed"
            ? "100% · Approved"
            : `${Math.min(t.percentComplete || 0, 99)}%`,
        ),
    },
  ];
  return (
    <DataTable
      rows={tasks}
      rowKey={(t) => t.id}
      columns={all.filter((c) => c.id === "task" || columns.includes(c.id))}
    />
  );
}
export function ProjectBoard({
  tasks,
  navigate,
}: {
  tasks: Task[];
  navigate: Navigate;
}) {
  const resolve = useWorkStatus();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12 }}
    >
      {[
        "pending_assignment",
        "todo",
        "in_progress",
        "changes_requested",
        "for_review",
        "completed",
        "cancelled",
      ].map((status) => (
        <View key={status} style={s.lane}>
          <Row>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: resolve(status).color ?? STATUS_COLORS[status],
              }}
            />
            <Text style={s.heading}>
              {resolve(status).label} (
              {tasks.filter((t) => t.status === status).length})
            </Text>
          </Row>
          {tasks
            .filter((t) => t.status === status)
            .map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => navigate({ name: "task", id: t.id })}
              >
                <Card title={t.title}>
                  <Status value={t.status} work customId={t.customStatusId} />
                  <Text style={s.muted}>
                    {t.assigneeName || "Needs assignment"}
                  </Text>
                  <Text style={s.muted}>
                    {dateLabel(t.deadline || t.dueDate)}
                  </Text>
                </Card>
              </Pressable>
            ))}
        </View>
      ))}
    </ScrollView>
  );
}
export function ProjectCalendar({
  tasks,
  navigate,
  project,
}: {
  tasks: Task[];
  navigate: Navigate;
  project: Project;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const start = new Date(month.getFullYear(), month.getMonth(), 1),
    offset = start.getDay(),
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const key = (day: number) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Button
          variant="outline"
          accessibilityLabel="Previous month"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          ‹
        </Button>
        <Text style={s.heading}>
          {month.toLocaleDateString("en-PH", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Button
          variant="outline"
          accessibilityLabel="Next month"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          ›
        </Button>
      </Row>
      <View style={s.calendar}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <View key={i} style={s.day}>
            <Text style={s.muted}>{d}</Text>
          </View>
        ))}
        {Array.from({ length: offset + days }, (_, i) => {
          const day = i - offset + 1,
            date = key(day),
            due = tasks.filter(
              (t) => (t.deadline || t.dueDate || "").slice(0, 10) === date,
            );
          return (
            <View key={i} style={s.day}>
              {!!(day > 0) && (
                <>
                  <Text style={s.heading}>{day}</Text>
                  {!!(project.startDate === date) && (
                    <Text style={s.event}>Project start</Text>
                  )}
                  {!!(project.targetDate === date) && (
                    <Text style={s.event}>Project target</Text>
                  )}
                  {due.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => navigate({ name: "task", id: t.id })}
                    >
                      <Text numberOfLines={3} style={s.event}>
                        {t.title}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
export function ProjectGantt({
  tasks,
  navigate,
  project,
}: {
  tasks: Task[];
  navigate: Navigate;
  project: Project;
}) {
  const dates = tasks
    .flatMap((t) => [
      t.startDate,
      t.deadline?.slice(0, 10),
      t.dueDate?.slice(0, 10),
    ])
    .concat([project.startDate, project.targetDate])
    .filter((d): d is string => !!d)
    .sort();
  const start = new Date(
      (dates[0] || new Date().toISOString().slice(0, 10)) + "T12:00:00",
    ).getTime(),
    day = 86400000,
    span = Math.min(
      366,
      Math.max(
        14,
        Math.ceil(
          (new Date((dates.at(-1) || dates[0]) + "T12:00:00").getTime() -
            start) /
            day,
        ) + 2,
      ),
    );
  return (
    <Card title="Project timeline">
      <ScrollView horizontal>
        <View style={{ width: 220 + span * 34 }}>
          <Row style={{ flexWrap: "nowrap", gap: 0 }}>
            <Text style={[s.heading, { width: 220 }]}>Task</Text>
            {Array.from({ length: span }, (_, i) => (
              <Text
                key={i}
                style={[
                  s.muted,
                  { width: 34, textAlign: "center", fontSize: 10 },
                ]}
              >
                {new Date(start + i * day).getDate()}
              </Text>
            ))}
          </Row>
          {tasks.map((t) => {
            const begin = t.startDate
                ? new Date(t.startDate + "T12:00:00").getTime()
                : new Date(
                    (t.deadline || t.dueDate || dates[0]).slice(0, 10) +
                      "T12:00:00",
                  ).getTime(),
              end = new Date(
                (t.deadline || t.dueDate || t.startDate || dates[0]).slice(
                  0,
                  10,
                ) + "T12:00:00",
              ).getTime();
            return (
              <Pressable
                key={t.id}
                onPress={() => navigate({ name: "task", id: t.id })}
                style={{
                  height: 58,
                  flexDirection: "row",
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{ width: 220, paddingRight: 10, color: colors.text }}
                >
                  {t.title}
                </Text>
                <View
                  style={{
                    marginLeft: Math.max(0, (begin - start) / day) * 34,
                    width: Math.max(1, (end - begin) / day + 1) * 34,
                    height: 22,
                    backgroundColor: STATUS_COLORS[t.status],
                    borderRadius: 5,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Card>
  );
}
const s = StyleSheet.create({
  lane: {
    width: 270,
    padding: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    gap: 12,
  },
  heading: { fontSize: 14, fontWeight: "600", color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
  calendar: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    width: "14.28%",
    minHeight: 76,
    padding: 3,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: 3,
  },
  event: {
    fontSize: 9,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    padding: 2,
    borderRadius: 3,
  },
});
