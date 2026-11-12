import { ProjectTaskEditor, useTaskStructure } from "../projects/ProjectTaskEditor";
import { DeadlineBadge } from "../../components/ui/DeadlineBadge";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { Text } from "../../components/ui/Typography";
import { useCallback, useState } from "react";
import { CustomWorkStatusControl } from "../work-status";
import { useWorkRecordUpdates } from "./useWorkRecordUpdates";
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
import {
  fetchWorkTree,
  WorkTreeUnavailable,
} from "../../../core/web/app/features/nested-work/services/workTreeService";
import {
  getTaskLeadId,
  getTaskTeamMemberIds,
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
function canPostTaskUpdate(task: ReturnType<typeof rowToTask>, actorId: string) {
  return getTaskTeamMemberIds(task).includes(actorId) &&
    (task.status === "todo" ||
      task.status === "in_progress" ||
      (task.status === "changes_requested" && getTaskLeadId(task) === actorId));
}

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
    if (projectStatus === "unavailable")
      throw new Error("Task unavailable.");
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
  const legacyBranch = useFacts(
    JSON.stringify(["legacy-funding-branch", profile?.id, id, nodeId]),
    async () => {
      const result = await supabase
        .from("subtasks")
        .select("id,title")
        .eq("task_id", id)
        .eq("id", nodeId!)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
    !!nodeId &&
      view === "budget" &&
      tree.error instanceof WorkTreeUnavailable &&
      !!facts.data &&
      !facts.error,
  );
  const overview = view === "details";
  const [execution, setExecution] = useState<"progress" | "submit">();
  const [taskActions, setTaskActions] = useState(false);
  const [editingTask, setEditingTask] = useState(false);
  const loadedTask = facts.data?.task;
  const taskScope = {
    actor: profile?.id || "",
    project: loadedTask?.linkedProjectId || "",
    office: loadedTask?.orgId || "",
    task: loadedTask,
    canDelegateEdit: !!profile?.org_id && profile.org_id === loadedTask?.orgId,
  };
  const editAccess = useTaskStructure(
    taskScope,
    overview && !!taskScope.project && !!taskScope.office && !!taskScope.actor && (profile?.role === "head" || taskScope.canDelegateEdit) &&
      !facts.error && ["active", "on_hold"].includes(facts.data?.projectStatus ?? "") && !loadedTask?.archivedAt &&
      !["completed", "cancelled"].includes(loadedTask?.status || ""),
  );
  const [staff, setStaff] = useState(false);
  const refresh = useCallback(async () => {
    await Promise.all([facts.refresh(), tree.refresh(), editAccess.refresh()]);
  }, [facts.refresh, tree.refresh, editAccess.refresh]);
  useWorkRecordUpdates(id, refresh);
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
  const canEditTask = !facts.loading && !editAccess.loading && !editAccess.error && !!editAccess.data;
  const readOnly =
      ["completed", "archived", "unavailable"].includes(projectStatus) ||
      !!task.archivedAt,
    executionBlocked = readOnly || !!task.proposedOfficeIdentityId,
    head =
      isAppointedOfficeHead(profile, organization ? [organization] : []) &&
      profile?.org_id === task.orgId,
    participant = getTaskTeamMemberIds(task).includes(profile?.id || ""),
    lead = !!profile?.id && task.assigneeId === profile.id;
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
    const allowed = !latest.proposedOfficeIdentityId &&
      (mode === "progress"
        ? canPostTaskUpdate(latest, actorId)
        : latest.assigneeId === actorId &&
          (mode === "submit"
            ? ["todo", "in_progress", "changes_requested"].includes(status)
            : ["todo", "changes_requested"].includes(status)));
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
      showWebSetup={nodeId ? lead : head || lead}
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
        title={
          branch?.title ||
          (!legacyBranch.error && legacyBranch.data?.title) ||
          (nodeId ? "Subtask funding" : task.title)
        }
        description={nodeId ? task.title : "Cash request details"}
      >
        {nodeId &&
        (!branch || tree.error) &&
        (!legacyBranch.data || legacyBranch.error) ? (
          tree.loading || legacyBranch.loading ? (
            <Loading label="Verifying subtask access" layout="task" />
          ) : (
            <ErrorState
              error={
                legacyBranch.error ||
                tree.error ||
                "Subtask funding is unavailable."
              }
              retry={() =>
                void Promise.all([tree.refresh(), legacyBranch.refresh()])
              }
            />
          )
        ) : (
          funding
        )}
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
          <Status value={task.status} work customId={task.customStatusId} />
          <Status value={task.priority || "normal"} />
          <DeadlineBadge
            value={task.deadline || task.dueDate}
            status={task.status}
          />
        </Row>
      )}
      {overview && profile?.id && (lead || task.teamMemberIds?.includes(profile.id)) && !facts.loading && !readOnly &&
          task.linkedProjectId && projectStatus === "active" && task.status === "in_progress" && !tree.data?.root.blocker && (
            <CustomWorkStatusControl actor={profile.id} taskId={id} customId={task.customStatusId} />
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
      {overview && canEditTask && (
        <Button variant="outline" onPress={() => setEditingTask(true)}>Edit task</Button>
      )}
      {editingTask && (
        <ProjectTaskEditor scope={taskScope} groups={[]} onClose={() => setEditingTask(false)} onSaved={refresh} />
      )}
      {!!(view === "details") && (
        <>
          <Row>
            {!!(
              !executionBlocked &&
              lead &&
              !facts.loading &&
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
            {!!(!executionBlocked && !facts.loading && profile?.id && canPostTaskUpdate(task, profile.id)) && (
              <Button
                variant="outline"
                onPress={() => setExecution("progress")}
              >
                Update progress
              </Button>
            )}
            {!!(
              !executionBlocked &&
              lead &&
              ["todo", "in_progress", "changes_requested"].includes(task.status)
            ) && (
              <Button
                variant={task.status === "in_progress" ? "primary" : "outline"}
                disabled={facts.loading || evidence.loading || !!evidence.error}
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
            funding={branch ? funding : undefined}
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
            variant="ghost"
            style={{ alignSelf: "flex-start" }}
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
