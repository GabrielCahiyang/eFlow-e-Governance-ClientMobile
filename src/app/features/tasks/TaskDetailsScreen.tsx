import {
  ProjectTaskEditor,
  useTaskStructure,
} from "../projects/ProjectTaskEditor";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { Text } from "../../components/ui/Typography";
import { useCallback, useState } from "react";
import { CustomWorkStatusControl } from "../work-status";
import { useWorkRecordUpdates } from "./useWorkRecordUpdates";
import { View, useWindowDimensions } from "react-native";
import { useTheme } from "../../components/ui/Appearance";
import {
  Button,
  Card,
  EditorialMetadataStrip,
  ErrorState,
  Loading,
  Notice,
  Screen,
} from "../../components/ui";
import { useWorkStatus } from "../../shared/workStatusPresentation";
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
import { WorkProposalReview, WorkProposalSheet } from "./WorkProposalSheet";
import { workScheduleToday } from "./subtaskSchedule";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";
import { PublicMessageError } from "../../shared/userMessages";
function canPostTaskUpdate(
  task: ReturnType<typeof rowToTask>,
  actorId: string,
) {
  return (
    getTaskTeamMemberIds(task).includes(actorId) &&
    task.status === "in_progress"
  );
}

import { branchRows, branchCompletion, workNodeRoute } from "./branchInspector";
import {
  BentoActionButtons,
  BentoBlockerCard,
  BentoDependenciesCard,
  BentoEditButton,
  BentoProjectOnHoldCard,
  BentoScheduleCards,
  BentoAssignedTeamCard,
  BentoSubtasksCard,
  BentoSupportingGrid,
  CircularProgressRing,
  type DependencyItemData,
  type SubtaskItemData,
} from "./TaskBentoComponents";
import type { WorkPerson } from "../../../core/web/app/features/nested-work/types";

export function priorityLabel(priority?: string): string {
  if (!priority || priority === "normal" || priority === "medium")
    return "Medium priority";
  if (priority === "high") return "High priority";
  if (priority === "urgent") return "Urgent priority";
  if (priority === "low") return "Low priority";
  return priority.charAt(0).toUpperCase() + priority.slice(1) + " priority";
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
    if (projectStatus === "unavailable") throw new Error("Task unavailable.");
    const dependencyIds = Array.isArray(task.dependencyIds)
      ? task.dependencyIds
      : [];
    let dependencyItems: DependencyItemData[] = [];
    let missingDependencyCount = 0;
    if (dependencyIds.length > 0) {
      const depsResult = await supabase
        .from("tasks")
        .select("id,title,status,linked_project_id")
        .in("id", dependencyIds)
        .is("deleted_at", null);
      if (depsResult.error) {
        missingDependencyCount = dependencyIds.length;
      } else {
        const rows = (depsResult.data || []) as Array<{
          id: string;
          title: string;
          status: string;
          linked_project_id?: string | null;
        }>;
        const byId = new Map(rows.map((r) => [r.id, r]));
        dependencyItems = dependencyIds
          .map((depId) => byId.get(depId))
          .filter((row): row is NonNullable<typeof row> => Boolean(row))
          .map((row) => ({
            id: row.id,
            title: row.title,
            status: row.status,
            completed: row.status === "completed",
            projectId: row.linked_project_id || undefined,
          }));
        missingDependencyCount = Math.max(
          0,
          dependencyIds.length - dependencyItems.length,
        );
      }
    }
    return { task, projectStatus, dependencyItems, missingDependencyCount };
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
  const palette = useTheme();
  const { fontScale } = useWindowDimensions();
  const resolveStatus = useWorkStatus();
  const [execution, setExecution] = useState<"progress" | "submit">();
  const [proposal, setProposal] = useState<"progress" | "completion">();
  const [editingTask, setEditingTask] = useState(false);
  const [creatingSubtask, setCreatingSubtask] = useState(false);
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
    overview &&
      !!taskScope.project &&
      !!taskScope.office &&
      !!taskScope.actor &&
      (profile?.role === "head" || taskScope.canDelegateEdit) &&
      !facts.error &&
      ["active", "on_hold"].includes(facts.data?.projectStatus ?? "") &&
      !loadedTask?.archivedAt &&
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
  const today = (tree.data && workScheduleToday(tree.data)) ?? getPhilippineCalendarDate();
  const canStartToday = task.startDate?.slice(0, 10) === today;
  const isProjectOnHold = projectStatus === "on_hold";
  const canEditTask =
    !facts.loading &&
    !editAccess.loading &&
    !editAccess.error &&
    !!editAccess.data;
  const readOnly =
      ["completed", "archived", "unavailable"].includes(projectStatus) ||
      !!task.archivedAt,
    executionBlocked =
      readOnly || isProjectOnHold || !!task.proposedOfficeIdentityId,
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
    return {
      latest: latest.task,
      actorId: profile.id,
      projectStatus: latest.projectStatus,
    };
  };
  const verifyExecution = async (mode: "start" | "progress" | "submit") => {
    const {
      latest,
      actorId,
      projectStatus: currentProjectStatus,
    } = await verifyCurrentTask();
    const status = latest.status;
    if (currentProjectStatus === "on_hold")
      throw new PublicMessageError("This project is on hold. Work can continue once it resumes.");
    if (mode !== "start" && ["todo", "pending_assignment", "changes_requested"].includes(status))
      throw new PublicMessageError(
        status === "changes_requested"
          ? "The Task Lead must resume work before posting progress or submitting completion."
          : "The Task Lead must start work before posting progress or submitting completion.",
      );
    const allowed =
      !latest.proposedOfficeIdentityId &&
      (mode === "progress"
        ? canPostTaskUpdate(latest, actorId)
        : latest.assigneeId === actorId &&
          (mode === "submit"
            ? status === "in_progress"
            : ["todo", "changes_requested"].includes(status)));
    if (!allowed)
      throw new Error(
        "Current task status or responsibility no longer allows this action.",
      );
  };
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
  const isRootOverview = overview && !nodeId;

  const { children } = tree.data
    ? branchRows(tree.data, undefined)
    : { children: [] };
  const subtaskItems: SubtaskItemData[] = children.map((child) => {
    const record = tree.data?.nodes.find((item) => item.id === child.id);
    const effectiveStatus = record ? record.status : "todo";
    const subtaskComp =
      record && tree.data
        ? branchCompletion(tree.data, record.status, record.id)
        : { percent: 0 };
    const memberIds = [
      ...new Set([
        ...(record?.lead_id ? [record.lead_id] : []),
        ...(record?.assigned_to_ids || []),
      ]),
    ];
    const members = memberIds
      .map((mId) => tree.data?.people.find((p) => p.id === mId))
      .filter((p): p is WorkPerson => !!p);

    return {
      id: child.id,
      title: child.title,
      status: effectiveStatus,
      customStatusId: record?.custom_status_id,
      percent: isProjectOnHold ? undefined : subtaskComp.percent,
      members,
    };
  });

  const canCreateSubtask =
    !readOnly &&
    !tree.loading &&
    !facts.loading &&
    !!tree.data &&
    !!context &&
    selectRootWorkCapability(tree.data, "create_child", context).allowed;

  const contributorList: { id?: string; name: string; office?: string }[] = [];
  const seenContributorNames = new Set<string>();

  if (tree.data) {
    tree.data.root.people
      .filter((mId) => mId !== task.assigneeId)
      .forEach((mId) => {
        const p = tree.data!.people.find((person) => person.id === mId);
        if (p && !seenContributorNames.has(p.name)) {
          contributorList.push(p);
          seenContributorNames.add(p.name);
        }
      });
  }
  (task.teamMemberNames || [])
    .filter((name) => name !== task.assigneeName)
    .forEach((name) => {
      if (!seenContributorNames.has(name)) {
        contributorList.push({ id: name, name });
        seenContributorNames.add(name);
      }
    });

  const completionText = completion?.total
    ? `${completion.completed} of ${completion.total} ${completion.total === 1 ? "subtask" : "subtasks"} completed`
    : task.status === "completed"
      ? "Task completed"
      : `${completion?.percent ?? 0}% completed`;

  return (
    <Screen compact onRefresh={() => refresh()}>
      {isRootOverview ? (
        <>
          {/* 1. Task header */}
          <View style={{ gap: 4, marginBottom: 4 }}>
            <View
              style={{
                flexDirection: fontScale > 1.8 ? "column" : "row",
                alignItems: fontScale > 1.8 ? "flex-start" : "flex-start",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  flex: fontScale > 1.8 ? undefined : 1,
                  fontSize: 26,
                  fontWeight: "700",
                  color: palette.text,
                  lineHeight: 32,
                }}
              >
                {task.title}
              </Text>
              {canEditTask && (
                <BentoEditButton
                  accessibilityLabel="Edit task"
                  onPress={() => setEditingTask(true)}
                />
              )}
            </View>
            {!!(task.projectTitle || task.department) && (
              <Text
                style={{
                  fontSize: 14,
                  color: palette.mutedLabel,
                  lineHeight: 20,
                }}
              >
                {task.projectTitle || task.department}
              </Text>
            )}

            {/* Work action buttons immediately below project context */}
            {isProjectOnHold ? (
              <BentoProjectOnHoldCard
                projectId={task.linkedProjectId || tree.data?.root.project}
                style={{ marginTop: 8, marginBottom: 8 }}
              />
            ) : (
              <BentoActionButtons
                actions={[
                  !executionBlocked &&
                  lead &&
                  !facts.loading &&
                  ["todo", "changes_requested"].includes(task.status)
                  && (task.status === "changes_requested" || canStartToday)
                    ? {
                        label:
                          task.status === "todo" ? "Start work" : "Resume work",
                        variant: "secondary",
                        icon: "pencil",
                        busy: action.busy,
                        onPress: () =>
                          void action.run(async () => {
                            await verifyExecution("start");
                            await updateTaskStatus(id, "in_progress");
                            await refresh();
                          }),
                      }
                    : null,
                  !executionBlocked &&
                  !facts.loading &&
                  profile?.id &&
                  canPostTaskUpdate(task, profile.id)
                    ? {
                        label: "Update progress",
                        variant: "secondary",
                        icon: "pencil",
                        onPress: () => lead ? setExecution("progress") : setProposal("progress"),
                      }
                    : null,
                  !executionBlocked &&
                  participant &&
                  task.status === "in_progress"
                    ? {
                        label: lead ? "Mark as complete" : "Submit for review",
                        variant: "primary",
                        icon: "check",
                        disabled:
                          facts.loading || evidence.loading || !!evidence.error,
                        onPress: () => lead ? setExecution("submit") : setProposal("completion"),
                      }
                    : null,
                ]}
                style={{ marginTop: 8, marginBottom: 8 }}
              />
            )}

            {/* Editorial Status / Priority metadata strip */}
            <EditorialMetadataStrip
              variant="card"
              items={[
                {
                  label: "Status",
                  value: resolveStatus(task.status, task.customStatusId).label,
                  accent: resolveStatus(task.status, task.customStatusId).color,
                  status: task.status,
                },
                {
                  label: "Priority",
                  value: priorityLabel(task.priority),
                  accent:
                    task.priority === "high" ? palette.danger : palette.text,
                },
              ]}
              style={{ marginTop: 2, marginBottom: 10 }}
            />
          </View>

          {/* 2. Task completion */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginVertical: 12,
            }}
          >
            <View style={{ gap: 4, flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: palette.text,
                }}
              >
                Task completion
              </Text>
              <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
                {completionText}
              </Text>
            </View>
            <CircularProgressRing percent={completion?.percent ?? 0} />
          </View>

          {/* 3. Schedule bento cards */}
          <BentoScheduleCards
            startDate={task.startDate}
            dueDate={task.deadline || task.dueDate}
          />

          {/* Conditional Dependencies card */}
          <BentoDependenciesCard
            items={facts.data.dependencyItems}
            missingCount={facts.data.missingDependencyCount}
            onPressItem={(dep) =>
              navigate({
                name: "task",
                id: dep.id,
                projectId: dep.projectId || projectId || task.linkedProjectId,
                title: dep.title,
              })
            }
          />

          {/* Conditional Blocker card */}
          {!!(
            (task as unknown as { blocker?: string }).blocker ||
            tree.data?.root.blocker ||
            (task.status === "changes_requested" &&
              (task.feedback || task.rejectionNote))
          ) && (
            <BentoBlockerCard
              blocker={
                (task as unknown as { blocker?: string }).blocker ||
                tree.data?.root.blocker ||
                task.feedback ||
                task.rejectionNote
              }
            />
          )}

          {/* 4. Assigned team bento card */}
          <BentoAssignedTeamCard
            leadName={task.assigneeName}
            leadRoleLabel="Task Lead"
            contributors={contributorList}
            onChoosePeople={mayStaff ? () => setStaff(true) : undefined}
          />

          {/* 5. Subtasks bento card */}
          <BentoSubtasksCard
            subtasks={subtaskItems}
            canAdd={canCreateSubtask}
            onAddSubtask={() => setCreatingSubtask(true)}
            onPressSubtask={(item) =>
              navigate(workNodeRoute(tree.data!, item.id, item.title))
            }
          />

          {/* 6. Supporting features 2x2 bento grid */}
          <BentoSupportingGrid
            onPressActivity={() =>
              navigate({
                name: "task",
                id,
                projectId: task.linkedProjectId,
                view: "activity",
                title: "Activity",
              })
            }
            onPressReview={() =>
              navigate({
                name: "task",
                id,
                projectId: task.linkedProjectId,
                view: "review",
                title: "Evidence & review",
              })
            }
            onPressFunding={() =>
              navigate({
                name: "task",
                id,
                projectId: task.linkedProjectId,
                view: "budget",
                title: "Funding",
              })
            }
            onPressFiles={() =>
              navigate({
                name: "task",
                id,
                projectId: task.linkedProjectId,
                view: "files",
                title: "Files",
              })
            }
          />

          {profile?.id &&
            !executionBlocked &&
            !facts.loading &&
            (lead || task.teamMemberIds?.includes(profile.id)) &&
            task.linkedProjectId &&
            projectStatus === "active" &&
            task.status === "in_progress" &&
            !tree.data?.root.blocker && (
              <CustomWorkStatusControl
                actor={profile.id}
                taskId={id}
                customId={task.customStatusId}
              />
            )}

          {readOnly && <Notice>This work is read-only.</Notice>}
          {!!task.feedback && <Notice>{task.feedback}</Notice>}

          {editingTask && (
            <ProjectTaskEditor
              scope={taskScope}
              groups={[]}
              onClose={() => setEditingTask(false)}
              onSaved={refresh}
            />
          )}

          {!!task.description && (
            <View
              style={{
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 14,
                padding: 14,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: palette.mutedLabel,
                  marginBottom: 4,
                  fontWeight: "600",
                }}
              >
                Description
              </Text>
              <Text
                selectable
                style={{ color: palette.text, fontSize: 14, lineHeight: 20 }}
              >
                {task.description}
              </Text>
            </View>
          )}

          {(!!task.definitionOfDone || !!task.acceptanceCriteria?.length) && (
            <Card title="Definition of done">
              {!!task.definitionOfDone && (
                <Text selectable>{task.definitionOfDone}</Text>
              )}
              {task.acceptanceCriteria?.map((criterion, index) => (
                <Text key={index}>• {criterion}</Text>
              ))}
            </Card>
          )}
        </>
      ) : (
        /* When inspecting a subtask (nodeId) or view === "subitems" */
        <>
          {(overview || view === "subitems") &&
            (tree.error ? (
              <ErrorState
                error={tree.error}
                retry={() => void tree.refresh()}
              />
            ) : tree.data ? (
              <WorkTreePanel
                data={tree.data}
                navigate={navigate}
                onSaved={savedTree}
                readOnly={readOnly || tree.loading || facts.loading}
                projectStatus={projectStatus}
                projectOnHold={isProjectOnHold}
                focusNodeId={nodeId}
                funding={branch ? funding : undefined}
                parentTitle={task.title}
                rootPriority={task.priority}
                taskDescription={task.description}
                taskDefinitionOfDone={task.definitionOfDone}
                taskAcceptanceCriteria={task.acceptanceCriteria}
              />
            ) : (
              <Loading label="Loading subtasks" layout="tree" />
            ))}
        </>
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
      {overview && lead && !executionBlocked && task.status === "in_progress" && profile && (
        <WorkProposalReview actor={profile.id} root={id} onSaved={refresh} />
      )}
      {proposal && profile && (
        <WorkProposalSheet actor={profile.id} root={id} kind={proposal}
          onClose={() => setProposal(undefined)} onSaved={refresh} />
      )}
      {execution === "progress" && (
        <TaskExecutionSheet
          taskId={id}
          verifyAccess={() => verifyExecution("progress")}
          onClose={() => setExecution(undefined)}
          onSaved={refresh}
        />
      )}
      {!!(creatingSubtask && tree.data) && (
        <WorkEditorSheet
          data={tree.data}
          edit={{ command: "create" }}
          readOnly={readOnly || tree.loading || !!tree.error || facts.loading}
          onClose={() => setCreatingSubtask(false)}
          onSaved={savedTree}
        />
      )}
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
