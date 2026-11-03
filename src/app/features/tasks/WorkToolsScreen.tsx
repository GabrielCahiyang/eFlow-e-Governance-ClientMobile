import { useState } from "react";
import {Pressable,View} from '../../components/ui/Primitives';
import {
  Card,
  Empty,
  ErrorState,
  Loading,
  Row,
  Screen,
  SearchField,
  Status,
  Tabs,
  colors,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import type { Navigate } from "../../shared/routes";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { useTaskFacts } from "./useTaskFacts";
import {
  myNativeTasks,
  nativeDeadlineGroups,
  nativeHistoryGroups,
} from "./workTools";
export function WorkToolsScreen({
  kind,
  navigate,
}: {
  kind: "deadlines" | "history";
  navigate: Navigate;
}) {
  const { profile } = useAuth(),
    facts = useTaskFacts(kind),
    [tab, setTab] =
      useState<keyof ReturnType<typeof nativeHistoryGroups>>("completed"),
    [search, setSearch] = useState("");
  const mine = myNativeTasks(facts.data || [], profile?.id || ""),
    deadlines = nativeDeadlineGroups(mine),
    history = nativeHistoryGroups(mine);
  const matching = (task: Task) =>
    [task.title, task.projectTitle, task.rejectionNote, task.reopenReason].some(
      (value) => value?.toLowerCase().includes(search.trim().toLowerCase()),
    );
  const taskRows = (tasks: Task[]) =>
    tasks.filter(matching).length ? (
      tasks.filter(matching).map((task) => (
        <Pressable
          key={task.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${task.title}`}
          onPress={() =>
            navigate({
              name: "task",
              id: task.id,
              projectId: task.linkedProjectId,
            })
          }
          style={{
            padding: 14,
            gap: 7,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
            {task.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {task.projectTitle || "Office work"}
          </Text>
          <Row>
            <Status value={task.archivedAt ? "archived" : task.status} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {kind === "deadlines"
                ? `Due ${dateLabel(task.deadline || task.dueDate)}`
                : tab === "completed"
                  ? `Completed ${dateLabel(task.updatedAt)}`
                  : tab === "archived"
                    ? `Archived ${dateLabel(task.archivedAt)}`
                    : tab === "rejected"
                      ? task.rejectionNote
                      : task.reopenReason}
            </Text>
          </Row>
        </Pressable>
      ))
    ) : (
      <Empty
        title="Nothing here"
        description={
          search
            ? "Try another search."
            : "Work will appear here as its status changes."
        }
      />
    );
  return (
    <Screen
      title={kind === "deadlines" ? "Deadlines" : "Task History"}
      description={
        kind === "deadlines"
          ? "Stay ahead of what's due and what's waiting on review."
          : "Your finished and past work, kept out of your active task list."
      }
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
    >
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search your work…"
      />
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading />
      ) : kind === "deadlines" ? (
        <>
          {(
            [
              ["overdue", "Overdue"],
              ["today", "Due today"],
              ["awaiting", "Awaiting review"],
              ["upcoming", "Upcoming"],
            ] as const
          ).map(([key, label]) => (
            <Card key={key} title={`${label} (${deadlines[key].length})`}>
              {taskRows(deadlines[key])}
            </Card>
          ))}
        </>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={(value) => setTab(value as typeof tab)}
            items={(
              [
                ["completed", "Completed"],
                ["rejected", "Needs changes"],
                ["reopened", "Reopened"],
                ["archived", "Archived"],
              ] as const
            ).map(([id, label]) => ({
              id,
              label: `${label} (${history[id].length})`,
            }))}
          />
          <Card title={`${history[tab].length} records`}>
            {taskRows(history[tab])}
          </Card>
        </>
      )}
    </Screen>
  );
}
