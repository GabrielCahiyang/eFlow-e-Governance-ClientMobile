import { DeadlineBadge } from "../../components/ui/DeadlineBadge";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { nativeWindow } from "../../../platform/webRuntime";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { Text } from "../../components/ui/Typography";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  Status,
  dateLabel,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { useAuth } from "../authentication";
import { TaskFundingCard } from "../budget";
import { ProjectFiles } from "../projects";
import type { Navigate } from "../../shared/routes";
import { supabase } from "../../../platform/supabase";
import { rowToTask } from "../../../core/web/app/features/tasks/services/taskMapper";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import {
  getTaskTeamMemberIds,
  getTaskLeadId,
} from "../../../core/web/app/features/tasks/selectors/teamMembership";
import { updateTaskStatus } from "../../../core/web/app/features/tasks/services/taskService";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { selectRootWorkCapability } from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import { TaskEvidenceSheet } from "./TaskEvidenceSheet";
import { evidenceScope, type EvidenceRequest } from "./taskEvidence";
import { draftStore } from "../../../platform/draftStore";
import { TaskExecutionSheet } from "./TaskExecutionSheet";
import { TaskReviewPanel } from "./TaskReviewPanel";
import { TaskActivity } from "./TaskActivity";
import { WorkTreePanel } from "./WorkTreePanel";
import { WorkEditorSheet } from "./WorkEditorSheet";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { branchCompletion } from "./branchInspector";
import { contributorReviewUnavailable } from "../../shared/userMessages";
export function TaskDetailsScreen({
  id,
  projectId,
  initialView,
  nodeId,
  submissionId,
  financialRecordId,
  navigate,
}: {
  id: string;
  projectId?: string;
  initialView?: string;
  nodeId?: string;
  submissionId?: string;
  financialRecordId?: string;
  navigate: Navigate;
}) {
  const { profile, organization } = useAuth(),
    action = useAction();
  const loadTask = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    const task = rowToTask(data);
    if (projectId && task.linkedProjectId !== projectId)
      throw new Error("This task is outside the linked project context.");
    let projectStatus = "active";
    if (task.linkedProjectId) {
      const project = await supabase
        .from("projects")
        .select("status")
        .eq("id", task.linkedProjectId)
        .maybeSingle();
      if (project.error) throw project.error;
      projectStatus = project.data?.status || "unavailable";
    }
    return { task, projectStatus };
  };
  const facts = useFacts(
    "task:" + [profile?.id, id, projectId].join(":"),
    loadTask,
  );
  const tree = useFacts("work-tree:" + profile?.id + ":" + id, () =>
    fetchWorkTree(id),
  );
  const evidence = useFacts(
    "evidence:" + profile?.id + ":" + id,
    () => draftStore.get<EvidenceRequest>(profile!.id, evidenceScope(id)),
    !!profile,
  );
  const view = initialView || "details";
  const overview = view === "details";
  const [execution, setExecution] = useState<"progress" | "submit">();
  const [taskActions, setTaskActions] = useState(false);
  const [staff, setStaff] = useState(false);
  const refresh = async () => {
    await Promise.all([facts.refresh(), tree.refresh()]);
  };
  useEffect(() => {
    const channel = createPostgresChannel("native-task-detail:" + id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: "id=eq." + id },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subtasks",
          filter: "task_id=eq." + id,
        },
        () => void tree.refresh(),
      )
      .subscribe();
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () => {
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
      void supabase.removeChannel(channel);
    };
  }, [id, facts.refresh, tree.refresh]);
  if (facts.loading && !facts.data)
    return (
      <Screen>
        <Loading label="Loading task inspector" layout="task" />
      </Screen>
    );
  if (facts.error || !facts.data)
    return (
      <Screen>
        <ErrorState
          error={facts.error || "Task unavailable"}
          retry={() => void refresh()}
        />
      </Screen>
    );
  const { task, projectStatus } = facts.data;
  const readOnly =
      ["completed", "archived", "unavailable"].includes(projectStatus) ||
      !!task.archivedAt,
    head =
      isAppointedOfficeHead(profile, organization ? [organization] : []) &&
      profile?.org_id === task.orgId,
    participant = getTaskTeamMemberIds(task).includes(profile?.id || ""),
    lead = !!profile?.id && getTaskLeadId(task) === profile.id;
  const completion =
    tree.data && !tree.error
      ? branchCompletion(tree.data, task.status)
      : undefined;
  const context = tree.data
    ? {
        actorId: profile?.id || null,
        rootId: id,
        projectId: tree.data.root.project,
        officeId: tree.data.root.office,
        kind: tree.data.root.kind,
        revision: tree.data.revision,
        readOnly,
      }
    : undefined;
  const mayStaff =
    !tree.loading &&
    !tree.error &&
    !facts.loading &&
    !!tree.data &&
    !!context &&
    (selectRootWorkCapability(tree.data, "appoint_lead", context).allowed ||
      selectRootWorkCapability(tree.data, "manage_contributors", context)
        .allowed);
  const verifyCurrentTask = async () => {
    const session = await supabase.auth.getSession();
    if (
      session.error ||
      !profile ||
      session.data.session?.user.id !== profile.id
    )
      throw new Error("Sign in again to verify task access.");
    const latest = await loadTask();
    if (
      latest.task.linkedProjectId !== task.linkedProjectId ||
      latest.task.orgId !== task.orgId ||
      latest.task.archivedAt ||
      ["completed", "archived", "unavailable"].includes(latest.projectStatus)
    )
      throw new Error("This task is no longer editable in the current scope.");
    return { latest: latest.task, actorId: profile.id };
  };
  const verifyExecution = async (mode: "start" | "progress" | "submit") => {
    const { latest, actorId } = await verifyCurrentTask();
    const status = latest.status;
    const allowed =
      getTaskLeadId(latest) === actorId &&
      (mode === "submit"
        ? ["todo", "in_progress", "changes_requested"].includes(status)
        : mode === "start"
          ? ["todo", "changes_requested"].includes(status)
          : status === "in_progress");
    if (!allowed)
      throw new Error(
        "Current task status or responsibility no longer allows this action.",
      );
  };
  const leadershipActions = [
    ...(mayStaff ? [{ id: "people", title: "Choose people" }] : []),
    ...(head &&
    !readOnly &&
    !facts.loading &&
    !["completed", "cancelled"].includes(task.status)
      ? [{ id: "planning", title: "Planning on eFlow Web" }]
      : []),
  ];
  const savedTree = async (_receipt: WorkTreeSnapshot) => {
    await refresh();
  };
  const branch = nodeId
    ? tree.data?.nodes.find((node) => node.id === nodeId && node.task_id === id)
    : undefined;
  const funding = (
    <TaskFundingCard
      task={task}
      subtaskId={nodeId}
      recordId={financialRecordId}
      onOpenLinkedSubitem={
        financialRecordId
          ? (linkedNodeId) =>
              navigate({
                name: "task",
                id,
                projectId: task.linkedProjectId,
                nodeId: linkedNodeId,
                recordId: financialRecordId,
                view: "budget",
                title: "Subtask funding",
              })
          : undefined
      }
      onManageFunding={
        head || lead
          ? () =>
              navigate({
                name: "task",
                id,
                projectId: task.linkedProjectId,
                nodeId,
                view: "funding_configuration",
                title: "Task funding setup",
              })
          : undefined
      }
      canManage={lead}
      readOnly={
        readOnly ||
        facts.loading ||
        !!(nodeId && (tree.loading || tree.error || !branch))
      }
    />
  );
  if (initialView === "budget" && (nodeId || financialRecordId))
    return (
      <Screen
        title={branch?.title || (nodeId ? "Subtask funding" : task.title)}
        description={nodeId ? task.title : "Cash request details"}
      >
        {funding}
      </Screen>
    );
  return (
    <Screen
      compact
      title={task.title}
      description={overview ? task.projectTitle || task.department : undefined}
      onRefresh={() => refresh()}

      actions={
        overview &&
        !!leadershipActions.length && (
          <Button variant="outline" onPress={() => setTaskActions(true)}>
            Task actions
          </Button>
        )
      }
    >
      {overview && (
        <Row>
          <Status value={task.status} />
          <Status value={task.priority || "normal"} />
          <DeadlineBadge
            value={task.deadline || task.dueDate}
            status={task.status}
          />
        </Row>
      )}
      {overview && (
        <>
          <LabelValue
            label="Start date"
            value={
              task.startDate ? dateLabel(task.startDate + "T12:00:00") : "—"
            }
          />
          <LabelValue
            label="Progress"
            value={
              completion
                ? completion.total
                  ? `${completion.completed}/${completion.total} complete · ${completion.percent}%`
                  : `${completion.percent}%`
                : tree.loading
                  ? "Loading…"
                  : "Unavailable"
            }
          />
        </>
      )}
      {readOnly && <Notice>This work is read-only.</Notice>}
      {!!(view === "details") && (
        <>
          {!readOnly &&
            participant &&
            !lead &&
            ["todo", "in_progress", "changes_requested"].includes(
              task.status,
            ) && <Notice>{contributorReviewUnavailable}</Notice>}
          <Row>
            {!!(
              !readOnly &&
              lead &&
              ["todo", "changes_requested"].includes(task.status)
            ) && (
              <Button
                busy={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await verifyExecution("start");
                    await updateTaskStatus(id, "in_progress");
                    await refresh();
                  })
                }
              >
                {task.status === "todo" ? "Start work" : "Resume work"}
              </Button>
            )}
            {!!(!readOnly && lead && task.status === "in_progress") && (
              <Button
                variant="outline"
                onPress={() => setExecution("progress")}
              >
                Update progress
              </Button>
            )}
            {!!(
              !readOnly &&
              lead &&
              ["todo", "in_progress", "changes_requested"].includes(task.status)
            ) && (
              <Button
                disabled={evidence.loading || !!evidence.error}
                onPress={() => setExecution("submit")}
              >
                Mark as complete
              </Button>
            )}
          </Row>
        </>
      )}
      {(overview || view === "subitems") &&
        (tree.error ? (
          <ErrorState error={tree.error} retry={() => void tree.refresh()} />
        ) : tree.data ? (
          <WorkTreePanel
            data={tree.data}
            navigate={navigate}
            onSaved={savedTree}
            readOnly={readOnly || tree.loading || facts.loading}
            focusNodeId={nodeId}
          />
        ) : (
          <Loading label="Loading subtasks" layout="tree" />
        ))}
      {overview && (
        <Card title="Details and records">
          {!!task.description && <Text selectable>{task.description}</Text>}
          <LabelValue
            label="Lead"
            value={task.assigneeName || "Needs assignment"}
          />
          <LabelValue
            label="Contributors"
            value={
              (task.teamMemberNames || [])
                .filter((name) => name !== task.assigneeName)
                .join(", ") || "None"
            }
          />
          {!!task.definitionOfDone && (
            <LabelValue
              label="Definition of done"
              value={task.definitionOfDone}
            />
          )}
          {task.acceptanceCriteria?.map((criterion, index) => (
            <Text key={index}>• {criterion}</Text>
          ))}
          {!!task.feedback && <Notice>{task.feedback}</Notice>}
          {[
            { view: "activity", title: "Activity" },
            { view: "review", title: "Evidence & review" },
            { view: "budget", title: "Funding" },
            ...(task.linkedProjectId
              ? [{ view: "files", title: "Files" }]
              : []),
          ].map((item) => (
            <NavigationRow
              key={item.view}
              title={item.title}
              onPress={() =>
                navigate({
                  name: "task",
                  id,
                  projectId: task.linkedProjectId,
                  view: item.view,
                  title: item.title,
                })
              }
            />
          ))}
        </Card>
      )}
      {!!(view === "activity") && (
        <>
          <Button
            variant="outline"
            onPress={() =>
              navigate({
                name: "messages",
                taskId: id,
                projectId: task.linkedProjectId,
                title: "Task conversation",
              })
            }
          >
            Open task conversation
          </Button>
          <TaskActivity
            taskId={id}
            canDiscuss={participant && !readOnly}
            verifyDiscussion={async () => {
              const { latest, actorId } = await verifyCurrentTask();
              if (!getTaskTeamMemberIds(latest).includes(actorId))
                throw new Error("Current task participation is required.");
            }}
          />
        </>
      )}
      {!!(view === "review") && (
        <>
          {!!evidence.error && (
            <ErrorState
              error={evidence.error}
              retry={() => void evidence.refresh()}
            />
          )}
          {!!evidence.data && (
            <Button variant="outline" onPress={() => setExecution("submit")}>
              Check saved evidence submission
            </Button>
          )}
          <TaskReviewPanel
            task={task}
            initialSubmissionId={submissionId}
            onSaved={refresh}
            readOnly={readOnly}
          />
        </>
      )}
      {view === "budget" && funding}
      {!!(view === "files" && task.linkedProjectId) && (
        <ProjectFiles
          projectId={task.linkedProjectId}
          taskId={id}
          onManage={() =>
            navigate({
              name: "task",
              id,
              projectId: task.linkedProjectId,
              view: "file_management",
              title: "File management",
            })
          }
        />
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {execution === "submit" && !!profile && (
        <TaskEvidenceSheet
          actor={profile.id}
          taskId={id}
          saved={evidence.data || null}
          verifyAccess={() => verifyExecution("submit")}
          onClose={() => {
            setExecution(undefined);
            void evidence.refresh();
          }}
          onSaved={async () => {
            await refresh();
            if (view !== "review")
              navigate({
                name: "task",
                id,
                projectId: task.linkedProjectId,
                view: "review",
                title: "Evidence & review",
              });
          }}
        />
      )}
      {execution === "progress" && (
        <TaskExecutionSheet
          taskId={id}
          verifyAccess={() => verifyExecution("progress")}
          onClose={() => setExecution(undefined)}
          onSaved={refresh}
        />
      )}
      <SelectionSheet
        open={taskActions && !!leadershipActions.length}
        title="Task actions"
        options={leadershipActions}
        onClose={() => setTaskActions(false)}
        onSelect={(choice) => {
          setTaskActions(false);
          if (choice === "people") setStaff(true);
          if (choice === "planning")
            navigate({
              name: "task",
              id,
              projectId: task.linkedProjectId,
              title: task.title,
              view: "planning",
            });
        }}
      />
      {!!(staff && tree.data) && (
        <WorkEditorSheet
          data={tree.data}
          edit={{ command: "root_lead", root: true }}
          readOnly={readOnly || tree.loading || !!tree.error || facts.loading}
          onClose={() => setStaff(false)}
          onSaved={savedTree}
        />
      )}
    </Screen>
  );
}
