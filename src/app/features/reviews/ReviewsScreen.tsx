import { useEffect, useState } from "react";
import {Pressable} from '../../components/ui/Primitives';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Screen,
  SearchField,
  Status,
  Tabs,
  colors,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useTaskFacts } from "../tasks";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import {
  isTaskVisibleInReviewQueue,
  canOpenBudgetReviewWorkspace,
} from "../../../core/web/app/features/reviews/selectors";
import { fetchPersonalSubtaskReviews } from "../../../core/web/app/features/subtasks/services/subtaskWorkflowService";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
export function ReviewsScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth(),
    facts = useTaskFacts("reviews"),
    [kind, setKind] = useState(profile?.role === "head" ? "tasks" : "subtasks"),
    [query, setQuery] = useState("");
  const subtasks = useFacts(
    "review-subitems:" + profile?.id,
    () => fetchPersonalSubtaskReviews(profile!.id),
    !!profile,
  );
  useEffect(() => {
    if (!profile) return;
    const channel = createPostgresChannel(
      "native-review-submissions:" + profile.id,
    )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtask_submissions" },
        () => void subtasks.refresh(),
      )
      .subscribe();
    const poll = setInterval(() => void subtasks.refresh(), 30000);
    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);
  const tasks = (facts.data || [])
    .filter(
      (task) =>
        isTaskVisibleInReviewQueue(task, profile?.id, profile?.role) &&
        [task.title, task.projectTitle, task.assigneeName].some((value) =>
          value?.toLowerCase().includes(query.trim().toLowerCase()),
        ),
    )
    .sort(
      (a, b) =>
        (a.latestSubmission?.submittedAt || a.updatedAt) -
        (b.latestSubmission?.submittedAt || b.updatedAt),
    );
  const items = (subtasks.data || []).filter((item) =>
    [
      item.subtask.title,
      item.taskTitle,
      item.projectTitle,
      item.submission.submitterName,
      item.subtask.workContext?.pathLabel,
    ].some((value) =>
      value?.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );
  const refresh = () => void Promise.all([facts.refresh(), subtasks.refresh()]);
  return (
    <Screen
      title={profile?.role === "head" ? "For Review" : "Leader Reviews"}
      description="Current submissions and their evidence. Review authority is checked again when you decide."
      onRefresh={refresh}
      refreshing={facts.loading || subtasks.loading}
    >
      <Tabs
        value={kind}
        onChange={setKind}
        items={[
          { id: "tasks", label: `Task reviews (${tasks.length})` },
          { id: "subtasks", label: `Subitem reviews (${items.length})` },
          ...(canOpenBudgetReviewWorkspace(
            profile?.role === "head" ? "department" : "leading",
            profile?.role,
          )
            ? [{ id: "budget", label: "Budget reviews" }]
            : []),
        ]}
      />
      {kind === "budget" ? (
        <Card title="Cash and funding reviews">
          <Button
            onPress={() => navigate({ name: "budget", view: "requests" })}
          >
            Open requests and releases
          </Button>
          <Button
            variant="outline"
            onPress={() => navigate({ name: "budget", view: "reviews" })}
          >
            Open independent reviews
          </Button>
        </Card>
      ) : (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search submissions…"
          />
          {kind === "tasks" ? (
            facts.error ? (
              <ErrorState error={facts.error} retry={refresh} />
            ) : facts.loading && !facts.data ? (
              <Loading />
            ) : tasks.length ? (
              tasks.map((task) => (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  onPress={() =>
                    navigate({
                      name: "task",
                      id: task.id,
                      projectId: task.linkedProjectId,
                      view: "review",
                    })
                  }
                >
                  <Card title={task.title}>
                    <Text>{task.projectTitle || "Office work"}</Text>
                    <Text>
                      Submitted by{" "}
                      {task.latestSubmission?.submitterName ||
                        task.assigneeName ||
                        "Project person"}{" "}
                      ·{" "}
                      {dateLabel(
                        task.latestSubmission?.submittedAt || task.updatedAt,
                      )}
                    </Text>
                    <Status value="for_review" />
                    <Text>
                      {task.latestSubmission?.note ||
                        "Open the task to review the current submission and evidence."}
                    </Text>
                  </Card>
                </Pressable>
              ))
            ) : (
              <Empty title="No tasks awaiting your review" />
            )
          ) : subtasks.error ? (
            <ErrorState error={subtasks.error} retry={refresh} />
          ) : subtasks.loading && !subtasks.data ? (
            <Loading />
          ) : items.length ? (
            items.map((item) => (
              <Pressable
                key={item.submission.id}
                accessibilityRole="button"
                onPress={() =>
                  navigate({
                    name: "task",
                    id: item.subtask.taskId,
                    nodeId: item.subtask.id,
                    view: "subitems",
                  })
                }
              >
                <Card
                  title={
                    item.subtask.workContext?.pathLabel || item.subtask.title
                  }
                >
                  <Text>
                    {item.taskTitle} · {item.projectTitle || "Office work"}
                  </Text>
                  <Text>
                    Version {item.submission.version} ·{" "}
                    {item.submission.submitterName} ·{" "}
                    {dateLabel(item.submission.submittedAt)}
                  </Text>
                  <Status value="for_review" />
                  <Text>{item.submission.note}</Text>
                  <Text style={{ color: colors.primary }}>
                    Open current subitem and evidence →
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <Empty title="No subitems awaiting your review" />
          )}
        </>
      )}
    </Screen>
  );
}
