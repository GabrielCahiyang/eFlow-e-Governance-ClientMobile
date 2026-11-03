import { DeadlineBadge } from "../../components/ui/DeadlineBadge";
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
  Tabs,
  colors,
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
import { TaskExecutionSheet } from "./TaskExecutionSheet";
import { TaskReviewPanel } from "./TaskReviewPanel";
import { TaskActivity } from "./TaskActivity";
import { WorkTreePanel } from "./WorkTreePanel";
import { WorkEditorSheet } from "./WorkEditorSheet";
import { AutoAssignButton } from "./AutoAssignButton";
import { TaskEditSheet } from "./TaskEditSheet";
import { TaskScheduleSheet } from "./TaskScheduleSheet";
export function TaskDetailsScreen({
  id,
  initialView,
  nodeId,
  navigate,
}: {
  id: string;
  initialView?: string;
  nodeId?: string;
  navigate: Navigate;
}) {
  const { profile, organization } = useAuth(),
    action = useAction();
  const facts = useFacts("task:" + profile?.id + ":" + id, async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    const task = rowToTask(data);
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
  });
  const tree = useFacts("work-tree:" + profile?.id + ":" + id, () =>
    fetchWorkTree(id),
  );
  const [view, setView] = useState(initialView || "details"),
    [execution, setExecution] = useState<"progress" | "submit">(),
    [staff, setStaff] = useState(false),
    [edit, setEdit] = useState(false),
    [planning, setPlanning] = useState(initialView === "planning");
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
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, profile?.id]);
  if (facts.loading && !facts.data)
    return (
      <Screen>
        <Loading />
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
    lead = getTaskLeadId(task) === profile?.id;
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
    !!tree.data &&
    !!context &&
    (selectRootWorkCapability(tree.data, "appoint_lead", context).allowed ||
      selectRootWorkCapability(tree.data, "manage_contributors", context)
        .allowed);
  const savedTree = async (_receipt: WorkTreeSnapshot) => {
    await refresh();
  };
  return (
    <Screen
      title={task.title}
      description={task.projectTitle || task.department || "Task details"}
      onRefresh={() => void refresh()}
      refreshing={facts.loading}
    >
      <Card title={task.department || "Task overview"}>
        <Row>
          <Status value={task.status} />
          <Status value={task.priority || "normal"} />
        </Row>
        <DeadlineBadge
          value={task.deadline || task.dueDate}
          status={task.status}
        />
        <LabelValue label="Start date" value={dateLabel(task.startDate)} />
        {!!task.projectTitle && (
          <LabelValue label="Project" value={task.projectTitle} />
        )}
      </Card>
      {!!readOnly && (
        <Notice>
          This task is read-only in the current project or record scope.
        </Notice>
      )}
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: "details", label: "Details" },
          { id: "subitems", label: "Subtasks" },
          { id: "activity", label: "Activity" },
          { id: "review", label: "Evidence & review" },
          { id: "budget", label: "Budget" },
          { id: "files", label: "Files" },
        ]}
      />
      {!!(view === "details") && (
        <>
          <Card title="Task details">
            <Text style={{ color: colors.text, lineHeight: 23 }}>
              {task.description || "No description yet"}
            </Text>
            <LabelValue
              label="Lead"
              value={task.assigneeName || "Needs assignment"}
            />
            <LabelValue
              label="Contributors"
              value={
                (task.teamMemberNames || [])
                  .filter((n) => n !== task.assigneeName)
                  .join(", ") || "None"
              }
            />
            <LabelValue label="Start date" value={dateLabel(task.startDate)} />
            <LabelValue
              label="Due date"
              value={dateLabel(task.deadline || task.dueDate)}
            />
            <LabelValue label="Priority" value={task.priority || "medium"} />
            <LabelValue
              label="Estimated hours"
              value={`${task.estimatedHours || 0}h`}
            />
            <LabelValue
              label="Dependency count"
              value={task.dependencyIds?.length || 0}
            />
            {!!task.definitionOfDone && (
              <LabelValue
                label="Definition of done"
                value={task.definitionOfDone}
              />
            )}
            {task.acceptanceCriteria?.map((c, i) => (
              <Text key={i} style={{ color: colors.text }}>
                • {c}
              </Text>
            ))}
            {!!task.feedback && <Notice>{task.feedback}</Notice>}
            <Row>
              {!!(
                !readOnly &&
                participant &&
                ["todo", "changes_requested"].includes(task.status)
              ) && (
                <Button
                  busy={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await updateTaskStatus(id, "in_progress");
                      await refresh();
                    })
                  }
                >
                  {task.status === "todo" ? "Start work" : "Resume work"}
                </Button>
              )}
              {!!(
                !readOnly &&
                participant &&
                task.status === "in_progress"
              ) && (
                <Button
                  variant="outline"
                  onPress={() => setExecution("progress")}
                >
                  Update progress
                </Button>
              )}
              {!!(!readOnly && lead && ["todo","in_progress","changes_requested"].includes(task.status)) && (
                <Button onPress={() => setExecution("submit")}>
                  Submit finished work
                </Button>
              )}
              {!!(
                head &&
                !readOnly &&
                !["completed", "cancelled"].includes(task.status)
              ) && (
                <>
                  <Button variant="outline" onPress={() => setEdit(true)}>
                    Edit task
                  </Button>
                  <Button variant="outline" onPress={() => setPlanning(true)}>
                    Dates and prerequisites
                  </Button>
                </>
              )}
            </Row>
          </Card>
          <Card title="Task lead and contributors">
            {tree.error ? (
              <ErrorState
                error={tree.error}
                retry={() => void tree.refresh()}
              />
            ) : tree.loading && !tree.data ? (
              <Loading />
            ) : (
              <>
                <LabelValue
                  label="Lead"
                  value={
                    tree.data?.people.find((p) => p.id === tree.data!.root.lead)
                      ?.name ||
                    task.assigneeName ||
                    "Needs assignment"
                  }
                />
                {!!mayStaff && (
                  <Button variant="outline" onPress={() => setStaff(true)}>
                    Choose people
                  </Button>
                )}
                {!!mayStaff && (
                  <AutoAssignButton
                    rootId={id}
                    onSaved={savedTree}
                    disabled={tree.loading || readOnly}
                  />
                )}
              </>
            )}
          </Card>
        </>
      )}
      {!!(view === "subitems") &&
        (tree.error ? (
          <ErrorState error={tree.error} retry={() => void tree.refresh()} />
        ) : tree.data ? (
          <WorkTreePanel
            data={tree.data}
            onSaved={savedTree}
            readOnly={readOnly}
          />
        ) : (
          <Loading />
        ))}
      {!!(view === "activity") && (
        <TaskActivity taskId={id} canDiscuss={participant && !readOnly} />
      )}
      {!!(view === "review") && (
        <TaskReviewPanel task={task} onSaved={refresh} readOnly={readOnly} />
      )}
      {!!(view === "budget") && (
        <TaskFundingCard
          task={task}
          subtaskId={nodeId}
          canAuthorize={head}
          canManage={lead}
          readOnly={readOnly}
        />
      )}
      {!!(view === "files" && task.linkedProjectId) && (
        <ProjectFiles projectId={task.linkedProjectId} taskId={id} />
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {!!execution && (
        <TaskExecutionSheet
          taskId={id}
          mode={execution}
          onClose={() => setExecution(undefined)}
          onSaved={refresh}
        />
      )}
      {!!(staff && tree.data) && (
        <WorkEditorSheet
          data={tree.data}
          edit={{ command: "root_lead", root: true }}
          readOnly={readOnly}
          onClose={() => setStaff(false)}
          onSaved={savedTree}
        />
      )}
      {!!edit && (
        <TaskEditSheet
          task={task}
          onClose={() => setEdit(false)}
          onSaved={refresh}
          navigate={navigate}
        />
      )}
      {!!(planning && head && !readOnly) && (
        <TaskScheduleSheet
          task={task}
          onClose={() => setPlanning(false)}
          onSaved={refresh}
        />
      )}
    </Screen>
  );
}
