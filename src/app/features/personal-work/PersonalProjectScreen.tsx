import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  Status,
  Tabs,
} from "../../components/ui";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { ProjectFiles, ProjectActivity } from "../projects";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import { fetchPersonalProject } from "../../../core/web/app/features/workspaces/services/workspaceService";
import type { PersonalTask } from "../../../core/web/app/features/workspaces/types";
import { usePersonalActions } from "./usePersonalActions";
import { PersonalTaskSheet } from "./PersonalTaskSheet";
import { PersonalNestedWork } from "./PersonalNestedWork";
import { nativeWindow } from "../../../platform/webRuntime";
export function PersonalProjectScreen({
  id,
  navigate,
  initialTaskId,
}: {
  id: string;
  navigate: Navigate;
  initialTaskId?: string;
}) {
  const { profile } = useAuth(),
    workspace = useWorkspace(),
    facts = useFacts("personal-project:" + profile?.id + ":" + id, () =>
      fetchPersonalProject(id),
    );
  const action = usePersonalActions(profile?.id || "", id, async () => {
    nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
    await Promise.all([facts.refresh(), workspace.refresh()]);
  });
  useEffect(() => {
    const poll = setInterval(() => void facts.refresh(), 15000),
      app = AppState.addEventListener("change", (state) => {
        if (state === "active") void facts.refresh();
      });
    return () => {
      clearInterval(poll);
      app.remove();
    };
  }, [facts.refresh]);
  const [view, setView] = useState("tasks"),
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
  const manageFiles = () =>
    navigate({
      name: "personal_project",
      id,
      view: "file_management",
      title: "File management",
    });
  const name = (id: string | null) =>
    data?.members.find((member) => member.user_id === id)?.name || "Unassigned";
  return (
    <Screen
      compact
      title={
        data?.tasks.find((task) => task.id === initialTaskId)?.title ||
        data?.project.title ||
        "Personal project"
      }
      description="Personal workspace"
      onRefresh={() => facts.refresh()}

      actions={
        owner && active && !initialTaskId ? (
          <Button
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
          <Row>
            <Status value={data.project.status} />
            <Text>Owner: {name(data.owner)}</Text>
          </Row>
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
            <Card title="Saved request needs verification">
              <Text>
                A previous attempt still needs to be checked. Retry original
                request checks that attempt before you make another change.
              </Text>
              <Button busy={action.busy} onPress={() => void action.retry()}>
                Retry original request
              </Button>
              {!!action.canDiscard && (
                <Button variant="outline" onPress={() => void action.discard()}>
                  Discard rejected request
                </Button>
              )}
              <Button variant="outline" onPress={() => void facts.refresh()}>
                Refresh current work
              </Button>
            </Card>
          )}
          {!!(view === "tasks") && (
            <>
              {!data.tasks.length && (
                <Empty kind="work" title="No personal tasks yet" />
              )}
              {initialTaskId &&
                !data.tasks.some((task) => task.id === initialTaskId) && (
                  <Empty title="This personal task is no longer available" />
                )}
              {data.tasks
                .filter((task) => !initialTaskId || task.id === initialTaskId)
                .map((task) =>
                  !initialTaskId ? (
                    <NavigationRow
                      key={task.id}
                      title={task.title}
                      description={`${task.status.replaceAll("_", " ")} · ${name(task.lead_id)} · ${task.progress}%`}
                      onPress={() =>
                        navigate({
                          name: "personal_project",
                          id,
                          taskId: task.id,
                          title: task.title,
                        })
                      }
                    />
                  ) : (
                    <Card key={task.id} title={task.title}>
                      <Row>
                        <Status value={task.status} />
                        <Text>{task.progress}%</Text>
                      </Row>
                      <LabelValue label="Lead" value={name(task.lead_id)} />
                      <LabelValue
                        label="Review"
                        value={
                          task.reviewer_id
                            ? name(task.reviewer_id)
                            : "No review required"
                        }
                      />
                      {!!task.note && <Text selectable>{task.note}</Text>}
                      {!!task.review_note && (
                        <Notice>{task.review_note}</Notice>
                      )}
                      {!!(active && eligible) && (
                        <Row>
                          {!!(
                            task.lead_id === profile?.id &&
                            ["todo", "in_progress"].includes(task.status)
                          ) && (
                            <>
                              <Button
                                variant="outline"
                                disabled={blocked}
                                onPress={() =>
                                  setEditor({ mode: "progress", task })
                                }
                              >
                                Record progress
                              </Button>
                              <Button
                                disabled={blocked}
                                onPress={() =>
                                  setEditor({ mode: "submit", task })
                                }
                              >
                                {task.reviewer_id
                                  ? "Submit for review"
                                  : "Mark done"}
                              </Button>
                            </>
                          )}
                          {!!(
                            task.reviewer_id === profile?.id &&
                            task.lead_id !== profile?.id &&
                            task.status === "submitted"
                          ) && (
                            <Button
                              disabled={blocked}
                              onPress={() =>
                                setEditor({ mode: "review", task })
                              }
                            >
                              Review work
                            </Button>
                          )}
                          {!!(owner && task.status !== "done") && (
                            <Button
                              variant="outline"
                              disabled={blocked}
                              onPress={() => setEditor({ mode: "staff", task })}
                            >
                              Choose people
                            </Button>
                          )}
                        </Row>
                      )}
                      <Row>
                        <Button
                          variant="ghost"
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
                          {expanded.has(task.id) ? "Hide" : "Show"} subitems
                        </Button>
                      </Row>
                      {!!(fileTask === task.id) && (
                        <ProjectFiles
                          projectId={id}
                          taskId={task.id}
                          onManage={manageFiles}
                        />
                      )}
                      {!!expanded.has(task.id) && (
                        <PersonalNestedWork
                          root={task.id}
                          navigate={navigate}
                          readOnly={!active || !eligible || facts.loading}
                        />
                      )}
                    </Card>
                  ),
                )}
              {owner && !initialTaskId && (
                <NavigationRow
                  title="Project closeout on eFlow Web"
                  onPress={() =>
                    navigate({
                      name: "personal_project",
                      id,
                      view: "closeout",
                      title: "Project closeout",
                    })
                  }
                />
              )}
            </>
          )}
          {!!(view === "members") && (
            <>
              {data.members.map((member) => (
                <Row key={member.user_id}>
                  <Text style={{ flex: 1 }}>{member.name}</Text>
                  <Status value={member.state} />
                  <Text>
                    {member.user_id === data.owner ? "Owner" : member.access}
                  </Text>
                </Row>
              ))}
              {owner && (
                <NavigationRow
                  title="Manage access on eFlow Web"
                  onPress={() =>
                    navigate({
                      name: "personal_project",
                      id,
                      view: "access_management",
                      title: "Project access",
                    })
                  }
                />
              )}
            </>
          )}
          {!!(view === "files") && (
            <ProjectFiles projectId={id} onManage={manageFiles} />
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
