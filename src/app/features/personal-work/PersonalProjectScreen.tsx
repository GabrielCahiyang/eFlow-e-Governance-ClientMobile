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
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { ProjectFiles, ProjectAccess, ProjectActivity } from "../projects";
import { PersonalMembers } from "./PersonalMembers";
import { useFacts } from "../../shared/useFacts";
import { confirmAction } from "../../shared/confirm";
import type { Navigate } from "../../shared/routes";
import { fetchPersonalProject } from "../../../core/web/app/features/workspaces/services/workspaceService";
import type { PersonalTask } from "../../../core/web/app/features/workspaces/types";
import { usePersonalActions } from "./usePersonalActions";
import { PersonalTaskSheet } from "./PersonalTaskSheet";
import { PersonalNestedWork } from "./PersonalNestedWork";
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
  const name = (id: string | null) =>
    data?.members.find((member) => member.user_id === id)?.name || "Unassigned";
  return (
    <Screen
      title={data?.project.title || "Personal project"}
      description="Personal work uses its own review and closeout process. Office evidence and finance remain in Office projects."
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
      actions={
        owner && active ? (
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
        <Loading />
      ) : (
        <>
          <Row>
            <Status value={data.project.status} />
            <Text>Owner: {name(data.owner)}</Text>
          </Row>
          <Tabs
            value={view}
            onChange={setView}
            items={[
              { id: "tasks", label: "Tasks" },
              { id: "members", label: "Members & access terms" },
              { id: "files", label: "Project files" },
              { id: "activity", label: "Activity history" },
            ]}
          />
          {!!action.error && <ErrorState error={action.error} />}
          {!!action.notice && <Notice>{action.notice}</Notice>}
          {!!(active && owner && !availablePeople.length) && (
            <Notice>
              No eligible project members are available for assignment. Check
              Members &amp; access terms and refresh the project before creating
              a task.
            </Notice>
          )}
          {!!action.pending && (
            <Card title="Saved request needs verification">
              <Text>
                {action.pending.command.replace(/_/g, " ")}. Retry sends the
                original request once; it does not create another task or
                decision.
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
              {!data.tasks.length && <Empty title="No personal tasks yet" />}
              {[...data.tasks]
                .sort(
                  (a, b) =>
                    Number(b.id === initialTaskId) -
                    Number(a.id === initialTaskId),
                )
                .map((task) => (
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
                    {!!task.review_note && <Notice>{task.review_note}</Notice>}
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
                          task.status === "submitted"
                        ) && (
                          <Button
                            disabled={blocked}
                            onPress={() => setEditor({ mode: "review", task })}
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
                      <ProjectFiles projectId={id} taskId={task.id} />
                    )}
                    {!!expanded.has(task.id) && (
                      <PersonalNestedWork root={task.id} readOnly={!active} />
                    )}
                  </Card>
                ))}
              {!!owner && (
                <Card title="Personal closeout">
                  <Notice>
                    All tasks and required independent reviews must be finished.
                    This does not finalize Office work or settle cash.
                  </Notice>
                  {!!active && (
                    <Button
                      disabled={
                        blocked ||
                        data.tasks.some((task) => task.status !== "done")
                      }
                      onPress={() =>
                        void confirmAction(
                          "Complete personal project?",
                          "The server checks all work and required reviews before closing.",
                          "Complete project",
                        ).then((confirmed) => {
                          if (confirmed)
                            void action.run("complete_project", {});
                        })
                      }
                    >
                      Complete personal project
                    </Button>
                  )}
                  {!!(data.project.status === "completed") && (
                    <Button
                      variant="outline"
                      disabled={blocked}
                      onPress={() =>
                        void confirmAction(
                          "Archive personal project?",
                          "This moves the completed project to archived work.",
                          "Archive project",
                        ).then((confirmed) => {
                          if (confirmed) void action.run("archive_project", {});
                        })
                      }
                    >
                      Archive personal project
                    </Button>
                  )}
                </Card>
              )}
            </>
          )}
          {!!(view === "members") && (
            <>
              <ProjectAccess project={id} onSaved={facts.refresh} />
              {!!(owner && active) && (
                <PersonalMembers
                  data={data}
                  onSaved={facts.refresh}
                  busy={blocked}
                  run={action.run}
                  officeWorkspace={
                    workspace.workspaces.find(
                      (w) =>
                        w.kind === "office" && w.office_id === profile?.org_id,
                    )?.id
                  }
                />
              )}
              {data.members.map((member) => (
                <Card key={member.user_id} title={member.name}>
                  <LabelValue
                    label="Project access"
                    value={
                      member.user_id === data.owner
                        ? "Workspace owner"
                        : member.access
                    }
                  />
                  <LabelValue label="Participation" value={member.state} />
                  <LabelValue
                    label="Eligible for assigned work"
                    value={member.eligible ? "Yes" : "No"}
                  />
                </Card>
              ))}
              <Notice>
                Membership grants access to this project. It does not change
                Office roles, workspace administration or financial permissions.
              </Notice>
            </>
          )}
          {!!(view === "files") && <ProjectFiles projectId={id} />}
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
