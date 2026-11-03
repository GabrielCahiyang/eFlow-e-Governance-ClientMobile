import { DeliveryAnalytics } from "../analytics";
import { useState } from "react";
import { Pressable, View } from "../../components/ui/Primitives";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Row,
  Screen,
  Tabs,
  colors,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { useFacts } from "../../shared/useFacts";
import type { Navigate, RouteName } from "../../shared/routes";
import { fetchVisibleTasks } from "../tasks";
import { fetchProjects } from "../projects";
import { getTaskLeadId } from "../../../core/web/app/features/tasks/selectors/teamMembership";
export function OverviewScreen({ navigate }: { navigate: Navigate }) {
  const { profile, organization } = useAuth(),
    workspace = useWorkspace(),
    [attention, setAttention] = useState("overdue");
  const facts = useFacts(
    `overview:${profile?.id}:${workspace.selected?.workspace.id}`,
    async () => {
      const [tasks, projects] = await Promise.all([
        fetchVisibleTasks(),
        fetchProjects(),
      ]);
      return { tasks, projects };
    },
  );
  const ids = workspace.selected
      ? new Set(workspace.selected.projects.map((p) => p.id))
      : undefined,
    projects = (facts.data?.projects || []).filter(
      (p) => p.status === "active" && (!ids || ids.has(p.id)),
    );
  const tasks = (facts.data?.tasks || []).filter(
      (t) =>
        !t.archivedAt &&
        t.orgId === profile?.org_id &&
        (!ids || !t.linkedProjectId || ids.has(t.linkedProjectId)),
    ),
    open = tasks.filter((t) => !["completed", "cancelled"].includes(t.status)),
    now = Date.now(),
    week = 7 * 86400000;
  const groups = {
    overdue: open.filter(
      (t) =>
        !!(t.deadline || t.dueDate) &&
        new Date(t.deadline || t.dueDate!).getTime() < now,
    ),
    due: open.filter((t) => {
      const due = new Date(t.deadline || t.dueDate || "").getTime();
      return due >= now && due < now + week;
    }),
    review: tasks.filter((t) => t.status === "for_review"),
    lead: open.filter((t) => !getTaskLeadId(t)),
  };
  const visible = groups[attention as keyof typeof groups];
  return (
    <Screen
      title="Office dashboard"
      description={`${organization?.name || "Office"} · See where work stands and what needs your attention.`}
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
      actions={
        <Button variant="outline" onPress={() => navigate({ name: "reports" })}>
          Open reports →
        </Button>
      }
    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading />
      ) : (
        <>
          <Row>
            {[
              {
                label: "Active projects",
                amount: projects.length,
                route: "projects",
              },
              { label: "Open tasks", amount: open.length, route: "tasks" },
              {
                label: "Overdue tasks",
                amount: groups.overdue.length,
                route: "deadlines",
              },
              {
                label: "Awaiting review",
                amount: groups.review.length,
                route: "reviews",
              },
            ].map((metric) => (
              <Pressable
                key={metric.label}
                accessibilityRole="button"
                accessibilityLabel={metric.label}
                onPress={() => navigate({ name: metric.route as RouteName })}
                style={{ flex: 1, minWidth: 145 }}
              >
                <Card>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    {metric.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 30,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {metric.amount}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </Row>
          <Card title="Project progress">
            {projects.length ? (
              projects.map((project) => {
                const work = tasks.filter(
                    (t) =>
                      t.linkedProjectId === project.id &&
                      t.status !== "cancelled",
                  ),
                  completed = work.filter(
                    (t) => t.status === "completed",
                  ).length,
                  percent = work.length
                    ? Math.round((completed / work.length) * 100)
                    : 0;
                return (
                  <Pressable
                    key={project.id}
                    accessibilityRole="button"
                    accessibilityLabel={"Open " + project.title}
                    onPress={() =>
                      navigate({ name: "project", id: project.id })
                    }
                    style={{
                      gap: 10,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <LabelValue label={project.title} value={percent + "%"} />
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {completed} of {work.length} tasks completed
                    </Text>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: colors.border,
                        borderRadius: 3,
                      }}
                    >
                      <View
                        style={{
                          height: 4,
                          width: `${percent}%`,
                          backgroundColor: colors.primary,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Empty title="No active projects" />
            )}
          </Card>
          <Card title="Needs attention">
            {profile?.role === "head" && !!facts.data && !facts.error && (
              <DeliveryAnalytics tasks={tasks} navigate={navigate} />
            )}
            <Tabs
              value={attention}
              onChange={setAttention}
              items={[
                { id: "overdue", label: `Overdue ${groups.overdue.length}` },
                { id: "due", label: `Due next 7 days ${groups.due.length}` },
                {
                  id: "review",
                  label: `Awaiting review ${groups.review.length}`,
                },
                { id: "lead", label: `Needs a lead ${groups.lead.length}` },
              ]}
            />
            {visible.length ? (
              visible.map((task) => (
                <Button
                  key={task.id}
                  variant="ghost"
                  onPress={() => navigate({ name: "task", id: task.id })}
                >
                  {task.title}
                </Button>
              ))
            ) : (
              <Empty
                title={
                  attention === "overdue"
                    ? "No overdue tasks"
                    : "No tasks need attention here"
                }
                description="New work will appear here as your team updates its tasks."
              />
            )}
          </Card>
          <Card title="Recent task updates">
            {tasks
              .slice()
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 10)
              .map((task) => (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityLabel={"Open " + task.title}
                  onPress={() => navigate({ name: "task", id: task.id })}
                  style={{
                    paddingVertical: 10,
                    gap: 4,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.text }}>
                    {task.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {task.projectTitle} · {dateLabel(task.updatedAt)}
                  </Text>
                </Pressable>
              ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
