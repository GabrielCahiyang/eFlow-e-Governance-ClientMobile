import { createLiveRefreshController } from "../../shared/liveUpdates";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import FolderOpen from "lucide-react-native/icons/folder-open";
import Pencil from "lucide-react-native/icons/pencil";
import Play from "lucide-react-native/icons/play";
import Plus from "lucide-react-native/icons/plus";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import User from "lucide-react-native/icons/user";
import Users from "lucide-react-native/icons/users";
import X from "lucide-react-native/icons/x";
import {
  AllocationBar,
  Button,
  Card,
  DetailGroup,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  SearchField,
  Status,
  Tabs,
  withOpacity,
} from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { AvatarBadge } from "../tasks/TaskBentoComponents";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { ProjectFiles, ProjectActivity } from "../projects";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
import { confirmAction } from "../../shared/confirm";
import { useSnapshotPage } from "../../shared/useSnapshotPage";
import type { Navigate } from "../../shared/routes";
import { fetchPersonalProject } from "../../../core/web/app/features/workspaces/services/workspaceService";
import type { PersonalTask } from "../../../core/web/app/features/workspaces/types";
import { usePersonalActions } from "./usePersonalActions";
import { PersonalTaskSheet } from "./PersonalTaskSheet";
import { PersonalNestedWork } from "./PersonalNestedWork";
import { nativeWindow } from "../../../platform/webRuntime";
import { branchCompletion } from "../tasks/branchInspector";
import { completionPercent } from "../../shared/completion";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";

export function PersonalProjectScreen({
  id,
  navigate,
  initialTaskId,
}: {
  id: string;
  navigate: Navigate;
  initialTaskId?: string;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { profile } = useAuth(),
    workspace = useWorkspace(),
    facts = useFacts("personal-project:" + profile?.id + ":" + id, () =>
      fetchPersonalProject(id),
    );
  const action = usePersonalActions(profile?.id || "", id, async () => {
    nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
    await Promise.all([facts.refresh(), workspace.refresh(), tree.refresh()]);
  });
  useEffect(() => {
    const live = createLiveRefreshController({
      onRefresh: () => void facts.refresh(),
    });
    return () => live.dispose();
  }, [facts.refresh]);
  const [view, setView] = useState("tasks"),
    [search, setSearch] = useState(""),
    [editor, setEditor] = useState<{
      mode: "create" | "staff" | "progress" | "submit" | "review";
      task?: PersonalTask;
    }>(),
    [expanded, setExpanded] = useState(
      new Set<string>(initialTaskId ? [initialTaskId] : []),
    ),
    [fileTask, setFileTask] = useState<string>();
  const data = facts.data,
    owner = data?.owner === profile?.id,
    eligible =
      owner ||
      !!data?.members.some(
        (member) =>
          member.user_id === profile?.id &&
          member.state === "active" &&
          member.eligible,
      ),
    active = data?.project.status === "active",
    blocked =
      action.busy ||
      action.loading ||
      action.recoveryBlocked ||
      !!action.pending;
  const availablePeople = (data?.members || []).filter(
    (member) => member.state === "active" && member.eligible,
  );
  const name = (id: string | null) =>
    data?.members.find((member) => member.user_id === id)?.name || "Unassigned";
  const task = initialTaskId
    ? data?.tasks.find((item) => item.id === initialTaskId)
    : undefined;
  const tree = useFacts(
    `personal-tree:${profile?.id}:${id}:${task?.id}`,
    async () => {
      const snapshot = await fetchWorkTree(task!.id);
      if (snapshot.root.kind !== "personal" || snapshot.root.project !== id)
        throw new PublicMessageError("The task hierarchy could not be verified.");
      return snapshot;
    },
    !!task && !facts.error,
  );
  const taskCompletion =
    tree.data && !tree.error && task
      ? branchCompletion(tree.data, task.status)
      : undefined;
  const projectCompleted =
    data?.tasks.filter((item) => item.status === "done").length ?? 0;
  const projectPercent = data
    ? completionPercent(
        projectCompleted,
        data.tasks.length,
        data.project.status,
      )
    : 0;
  const browseTasks =
    !!data && !facts.error && view === "tasks" && !initialTaskId;
  const needle = search.trim().toLowerCase();
  const matchingTasks = browseTasks
    ? data.tasks.filter(
        (task) => !needle || task.title.toLowerCase().includes(needle),
      )
    : [];
  const page = useSnapshotPage(
    JSON.stringify([profile?.id, id, needle]),
    matchingTasks.length,
  );
  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";

  return (
    <Screen<PersonalTask>
      compact
      title={task?.title || data?.project.title || "Personal project"}
      description="Personal workspace"
      onRefresh={async () => {
        await Promise.all([facts.refresh(), tree.refresh()]);
      }}
      list={
        browseTasks
          ? {
              data: matchingTasks.slice(0, page.limit),
              keyExtractor: (task) => task.id,
              onEndReached: page.onEndReached,
              renderItem: ({ item: rowTask }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={rowTask.title}
                  onPress={() =>
                    navigate({
                      name: "personal_project",
                      id,
                      taskId: rowTask.id,
                      title: rowTask.title,
                    })
                  }
                  style={({ pressed }) => [
                    styles.taskRowCard,
                    {
                      backgroundColor: pressed
                        ? palette.primarySoft
                        : palette.surface,
                      borderColor: palette.border,
                    },
                    !isDark && styles.cardShadow,
                  ]}
                >
                  <View style={styles.taskRowTop}>
                    <Text
                      style={[styles.taskRowTitle, { color: palette.text }]}
                    >
                      {rowTask.title}
                    </Text>
                    <ChevronRight size={16} color={palette.mutedLabel} />
                  </View>
                  <View style={styles.taskRowMeta}>
                    <Status value={rowTask.status} variant="pill" work />
                    <View style={styles.metaChip}>
                      <User size={13} color={palette.mutedLabel} />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.metaText,
                          { color: palette.mutedLabel },
                        ]}
                      >
                        {name(rowTask.lead_id)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ),
            }
          : undefined
      }
      actions={
        owner && active && !initialTaskId ? (
          <Button
            icon={<Plus size={15} color={palette.onPrimary} />}
            disabled={blocked || !availablePeople.length}
            onPress={() => setEditor({ mode: "create" })}
          >
            Add personal task
          </Button>
        ) : undefined
      }
    >
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !data ? (
        <Loading label="Loading personal project" layout="personalProject" />
      ) : (
        <>
          <Card style={{ gap: 12 }}>
            <View style={styles.summaryTopRow}>
              <Status value={data.project.status} variant="pill" work />
              <View style={styles.metaChip}>
                <User size={13} color={palette.mutedLabel} />
                <Text style={[styles.metaText, { color: palette.mutedLabel }]}>
                  Owner: {name(data.owner)}
                </Text>
              </View>
            </View>
            {!initialTaskId && (
              <AllocationBar
                label="Tasks completed"
                summary={`${projectCompleted} of ${data.tasks.length} · ${projectPercent}%`}
                percent={projectPercent}
                tone={projectPercent >= 100 ? "success" : "neutral"}
              />
            )}
          </Card>

          {!initialTaskId && (
            <Tabs
              value={view}
              onChange={setView}
              items={[
                { id: "tasks", label: "Tasks" },
                { id: "members", label: "People" },
                { id: "files", label: "Project files" },
                { id: "activity", label: "Activity history" },
              ]}
            />
          )}
          {!!action.error && (
            <ErrorState context="action" error={action.error} />
          )}
          {!!action.notice && <Notice>{action.notice}</Notice>}
          {!!(active && owner && !availablePeople.length) && (
            <Notice>
              No eligible project members are available for assignment. Check
              People and refresh the project before creating a task.
            </Notice>
          )}
          {!!action.pending && (
            <Card
              title="Saved request needs verification"
              icon={<RefreshCw size={16} color={palette.warning} />}
              badge="Pending"
              badgeTone="warning"
            >
              <Button
                busy={action.busy}
                icon={<RefreshCw size={15} color={palette.onPrimary} />}
                onPress={() => void action.retry()}
              >
                Check previous changes
              </Button>
              {!!action.canDiscard && (
                <Button
                  variant="outline"
                  icon={<X size={15} color={palette.primary} />}
                  onPress={() => void action.discard()}
                >
                  Discard rejected request
                </Button>
              )}
              <Button
                variant="outline"
                icon={<RefreshCw size={15} color={palette.primary} />}
                onPress={() => void facts.refresh()}
              >
                Refresh current work
              </Button>
            </Card>
          )}
          {!!(view === "tasks") && (
            <>
              {browseTasks && (
                <View style={styles.searchHeader}>
                  <SearchField
                    value={search}
                    onChange={setSearch}
                    placeholder="Search personal tasks"
                  />
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.countText, { color: palette.mutedLabel }]}
                  >
                    {matchingTasks.length}{" "}
                    {matchingTasks.length === 1 ? "task" : "tasks"}
                  </Text>
                </View>
              )}
              {browseTasks && !data.tasks.length && (
                <Empty kind="tasks" title="No personal tasks yet" />
              )}
              {browseTasks &&
                !!needle &&
                !!data.tasks.length &&
                !matchingTasks.length && (
                  <Empty
                    kind="search"
                    title="No personal tasks match"
                    action={
                      <Button
                        variant="outline"
                        icon={<RotateCcw size={15} color={palette.primary} />}
                        onPress={() => setSearch("")}
                      >
                        Clear search
                      </Button>
                    }
                  />
                )}
              {initialTaskId && !task && (
                <Empty
                  kind="tasks"
                  title="This personal task is no longer available"
                />
              )}
              {task && (
                <Card
                  key={task.id}
                  title={task.title}
                  icon={<ClipboardList size={16} color={palette.primary} />}
                  action={<Status value={task.status} variant="pill" work />}
                  style={{ gap: 12 }}
                >
                  {taskCompletion ? (
                    <AllocationBar
                      label="Progress"
                      summary={
                        taskCompletion.total
                          ? `${taskCompletion.completed}/${taskCompletion.total} complete · ${taskCompletion.percent}%`
                          : `${taskCompletion.percent}%`
                      }
                      percent={taskCompletion.percent}
                      tone={taskCompletion.percent >= 100 ? "success" : "neutral"}
                    />
                  ) : null}

                  <DetailGroup>
                    {!taskCompletion && (
                      <LabelValue
                        label="Progress"
                        value={tree.loading ? "Loading…" : "Unavailable"}
                      />
                    )}
                    <LabelValue label="Lead" value={name(task.lead_id)} />
                    <LabelValue
                      label="Review"
                      value={
                        task.reviewer_id
                          ? name(task.reviewer_id)
                          : "No review required"
                      }
                    />
                  </DetailGroup>

                  {!!task.note && (
                    <View
                      style={[
                        styles.noteBox,
                        {
                          backgroundColor: insetSurface,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.noteLabel,
                          { color: palette.mutedLabel },
                        ]}
                      >
                        Notes
                      </Text>
                      <Text selectable style={{ color: palette.text }}>
                        {task.note}
                      </Text>
                    </View>
                  )}
                  {!!task.review_note && (
                    <Notice tone="warning">{task.review_note}</Notice>
                  )}
                  {!!(active && eligible) && (
                    <Row>
                      {task.lead_id === profile?.id && task.status === "todo" && (
                        <Button
                          variant="outline"
                          icon={<Play size={15} color={palette.primary} />}
                          disabled={blocked}
                          busy={action.busy}
                          onPress={() =>
                            void (async () => {
                              if (
                                !(await confirmAction(
                                  "Start this task?",
                                  "Ready to begin this work?",
                                  "Start work",
                                ))
                              )
                                return;
                              await action.run("start_task", {
                                task_id: task.id,
                                revision: task.revision,
                              });
                            })()
                          }
                        >
                          Start work
                        </Button>
                      )}
                      {!!(
                        task.lead_id === profile?.id &&
                        task.status === "in_progress"
                      ) && (
                        <>
                          <Button
                            variant="outline"
                            icon={<Pencil size={15} color={palette.primary} />}
                            disabled={blocked}
                            onPress={() =>
                              setEditor({ mode: "progress", task })
                            }
                          >
                            Record progress
                          </Button>
                          <Button
                            icon={<Check size={15} color={palette.onPrimary} />}
                            disabled={blocked}
                            onPress={() => setEditor({ mode: "submit", task })}
                          >
                            {task.reviewer_id
                              ? "Submit for review"
                              : "Complete personal task"}
                          </Button>
                        </>
                      )}
                      {!!(
                        task.reviewer_id === profile?.id &&
                        task.lead_id !== profile?.id &&
                        task.status === "submitted"
                      ) && (
                        <Button
                          icon={
                            <ClipboardCheck
                              size={15}
                              color={palette.onPrimary}
                            />
                          }
                          disabled={blocked}
                          onPress={() => setEditor({ mode: "review", task })}
                        >
                          Review work
                        </Button>
                      )}
                      {!!(owner && task.status !== "done") && (
                        <Button
                          variant="outline"
                          icon={<Users size={15} color={palette.primary} />}
                          disabled={blocked}
                          onPress={() => setEditor({ mode: "staff", task })}
                        >
                          Choose people
                        </Button>
                      )}
                    </Row>
                  )}
                  <View
                    style={[
                      styles.secondaryBar,
                      { borderTopColor: palette.border },
                    ]}
                  >
                    <Row>
                      <Button
                        variant="ghost"
                        icon={<FolderOpen size={15} color={palette.primary} />}
                        onPress={() =>
                          setFileTask(
                            fileTask === task.id ? undefined : task.id,
                          )
                        }
                      >
                        Task files
                      </Button>
                      <Button
                        variant="ghost"
                        icon={
                          expanded.has(task.id) ? (
                            <ChevronUp size={15} color={palette.primary} />
                          ) : (
                            <ChevronDown size={15} color={palette.primary} />
                          )
                        }
                        onPress={() =>
                          setExpanded((previous) => {
                            const next = new Set(previous);
                            next.has(task.id)
                              ? next.delete(task.id)
                              : next.add(task.id);
                            return next;
                          })
                        }
                      >
                        {expanded.has(task.id) ? "Hide" : "Show"} subtasks
                      </Button>
                    </Row>
                  </View>
                  {!!(fileTask === task.id) && (
                    <ProjectFiles
                      projectId={id}
                      taskId={task.id}
                      readOnly={!active || facts.loading || !!facts.error}
                      embedded
                    />
                  )}
                  {!!expanded.has(task.id) && (
                    <PersonalNestedWork
                      tree={tree}
                      navigate={navigate}
                      readOnly={!active || !eligible || facts.loading}
                    />
                  )}
                </Card>
              )}
            </>
          )}
          {!!(view === "members") && (
            <Card
              title="Project people"
              icon={<Users size={16} color={palette.primary} />}
              badge={`${data.members.length}`}
              style={{ gap: 8 }}
            >
              {data.members.map((member) => (
                <View
                  key={member.user_id}
                  style={[
                    styles.memberCard,
                    {
                      backgroundColor: insetSurface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <AvatarBadge name={member.name || "Member"} size={36} />
                  <View style={styles.memberBody}>
                    <Text style={[styles.memberName, { color: palette.text }]}>
                      {member.name}
                    </Text>
                    <View style={styles.memberBadges}>
                      <Status value={member.state} variant="pill" />
                      <View
                        style={[
                          styles.rolePill,
                          {
                            backgroundColor: palette.primarySoft,
                            borderColor: withOpacity(palette.primary, 0.24),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rolePillText,
                            { color: palette.primaryDark },
                          ]}
                        >
                          {member.user_id === data.owner
                            ? "Owner"
                            : member.access}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          )}
          {!!(view === "files") && (
            <ProjectFiles
              projectId={id}
              contextTitle={data.project.title}
              eyebrow="Project attachments"
              readOnly={!active || facts.loading || !!facts.error}
            />
          )}
          {view === "activity" && (
            <ProjectActivity ids={[id, ...data.tasks.map((t) => t.id)]} />
          )}
          {!!editor && (
            <PersonalTaskSheet
              key={editor.mode + ":" + (editor.task?.id || "new")}
              {...editor}
              actor={profile!.id}
              members={data.members}
              busy={action.busy}
              run={async (command, payload) => {
                const saved = await action.run(command, payload);
                setEditor(undefined);
                return saved;
              }}
              onClose={() => setEditor(undefined)}
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
  },
  metaText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
    flexShrink: 1,
  },
  searchHeader: {
    gap: 8,
  },
  countText: {
    fontSize: 12.5,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
  taskRowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 8,
    gap: 8,
  },
  cardShadow: {
    shadowColor: "#00004f",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  taskRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  taskRowTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  taskRowMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  noteBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  noteLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  secondaryBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  memberName: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "700",
  },
  memberBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "700",
  },
});
