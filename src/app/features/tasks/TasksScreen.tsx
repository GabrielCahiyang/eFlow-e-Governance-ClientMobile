import {createPostgresChannel} from "../../shared/postgresChannel";
import { useEffect, useMemo, useState } from "react";
import {Pressable,View} from '../../components/ui/Primitives';
import { Text } from "../../components/ui/Typography";
import {
  Card,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Row,
  Screen,
  SearchField,
  Status,
  Tabs,
  colors,
  dateLabel,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { rowToTask } from "../../../core/web/app/features/tasks/services/taskMapper";
import { getTaskTeamMemberIds } from "../../../core/web/app/features/tasks/selectors/teamMembership";
import { MotionView } from "../../shared/motion";
export function TasksScreen({
  navigate,
  personal = false,
}: {
  navigate: Navigate;
  personal?: boolean;
}) {
  const { profile } = useAuth();
  const facts = useFacts("native-work:" + profile?.id, async () => {
    const rows = await readAllRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    return rows.map(rowToTask);
  });
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [scope, setScope] = useState("active"),
    [priority, setPriority] = useState("all");
  useEffect(() => {
    const channel = createPostgresChannel("native-work-list:" + profile?.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => void facts.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);
  const tasks = useMemo(
    () =>
      (facts.data || []).filter(
        (task) =>
          (!personal ||
            getTaskTeamMemberIds(task).includes(profile?.id || "")) &&
          (scope === "archived" ? !!task.archivedAt : !task.archivedAt) &&
          (scope !== "completed" || task.status === "completed") &&
          (scope !== "active" ||
            !["completed", "cancelled"].includes(task.status)) &&
          (status === "all" || task.status === status) &&
          (priority === "all" || task.priority === priority) &&
          (task.title + " " + task.description + " " + task.assigneeName)
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [facts.data, personal, profile?.id, scope, status, priority, search],
  );
  return (
    <Screen
      title={personal ? "My Work" : "Office tasks"}
      description="Tasks, owners, schedules and delivery status."
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
    >
      <Tabs
        value={scope}
        onChange={setScope}
        items={[
          { id: "active", label: "Active work" },
          { id: "completed", label: "Completed" },
          { id: "all", label: "All work" },
          { id: "archived", label: "Archived" },
        ]}
      />
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search tasks, teams, tags…"
      />
      <Row>
        <View style={{ flex: 1, minWidth: 150 }}>
          <Choice
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              ...[
                "pending_assignment",
                "todo",
                "in_progress",
                "changes_requested",
                "for_review",
                "completed",
                "cancelled",
              ].map((value) => ({ value, label: value.replaceAll("_", " ") })),
            ]}
          />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Choice
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={[
              { value: "all", label: "All priorities" },
              ...["low", "medium", "high"].map((value) => ({
                value,
                label: value,
              })),
            ]}
          />
        </View>
      </Row>
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading />
      ) : tasks.length ? (
        tasks.map((task) => (
          <MotionView key={task.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={"Open " + task.title}
              onPress={() =>
                navigate({ name: "task", id: task.id, title: task.title })
              }
            >
              <Card title={task.title}>
                <Row>
                  <Status value={task.status} />
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {task.priority || "medium"} priority
                  </Text>
                </Row>
                <LabelValue
                  label="Lead"
                  value={task.assigneeName || "Needs assignment"}
                />
                <LabelValue
                  label="Due date"
                  value={dateLabel(task.deadline || task.dueDate)}
                />
                <LabelValue
                  label="Estimated hours"
                  value={`${task.estimatedHours || 0}h`}
                />
                {!!task.projectTitle && (
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {task.projectTitle}
                  </Text>
                )}
              </Card>
            </Pressable>
          </MotionView>
        ))
      ) : (
        <Empty
          title="No tasks in this view"
          description="Change the filters to see other work."
        />
      )}
    </Screen>
  );
}
