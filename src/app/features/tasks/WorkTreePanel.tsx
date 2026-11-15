import { CustomWorkStatusControl } from "../work-status";
import { useWorkStatus } from "../../shared/workStatusPresentation";
import { workDisplayStatus } from "../../shared/statusLabels";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { nodeSchedule, plannedStartReached, subtaskDisplayStatus, workScheduleToday } from "./subtaskSchedule";
import { subtaskDependencies } from "./subtaskDependencies";
import { WorkProposalReview, WorkProposalSheet } from "./WorkProposalSheet";
import { useAction } from "../../shared/useAction";
import { PublicMessageError } from "../../shared/userMessages";
import { sharedWorkRpc } from "../../shared/sharedWorkRequest";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { useToast } from "../../components/ui/Toast";
import {
  Button,
  EditorialMetadataStrip,
  ErrorState,
  Notice,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import type { AppRoute, Navigate } from "../../shared/routes";
import { OfficeSubitemUpdateSheet } from "./OfficeSubitemUpdateSheet";
import { SubtaskCompletionSheet } from "./SubtaskCompletionSheet";
import { WorkEditorSheet } from "./WorkEditorSheet";
import {
  branchCompletion,
  branchRows,
  completionMode,
  personalReviewAllowed,
  workNodeRoute,
  workScope,
} from "./branchInspector";
import {
  canDecideSubtaskProposals,
  isProjectLeadSubtaskPlanningBlocked,
  isSubtaskLeadOrContributor,
} from "./workPermissions";
import {
  isCurrentWorkSnapshot,
  selectNodeWorkCapability,
  selectRootWorkCapability,
} from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type {
  WorkTreeSnapshot,
  NodeWorkAction,
  WorkPerson,
} from "../../../core/web/app/features/nested-work/types";
import type { WorkEdit } from "../../../core/web/app/features/nested-work/types/editor";
import { nativeWindow } from "../../../platform/webRuntime";
import {
  BentoActionButtons,
  BentoBlockerCard,
  BentoDependenciesCard,
  BentoEditButton,
  BentoScheduleCards,
  BentoAssignedTeamCard,
  BentoSubtasksCard,
  BentoSubtaskSupportingGrid,
  BentoProjectOnHoldCard,
  priorityLabel,
  type BentoAction,
  type SubtaskItemData,
} from "./TaskBentoComponents";

function subtaskViewRoute(
  data: WorkTreeSnapshot,
  nodeId: string,
  view: string,
  title: string,
): AppRoute {
  return data.root.kind === "personal"
    ? {
        name: "personal_project",
        id: data.root.project,
        taskId: data.root.id,
        nodeId,
        view,
        title,
      }
    : {
        name: "task",
        id: data.root.id,
        projectId: data.root.project,
        nodeId,
        view,
        title,
      };
}

export function WorkTreePanel({
  data,
  onSaved,
  readOnly = false,
  projectStatus,
  projectLeadId,
  projectOnHold = false,
  focusNodeId,
  proposalId,
  navigate,
  funding,
  parentTitle,
  taskDescription,
  taskDefinitionOfDone,
  taskAcceptanceCriteria,
}: {
  data: WorkTreeSnapshot;
  onSaved: (data: WorkTreeSnapshot) => Promise<void>;
  readOnly?: boolean;
  projectStatus?: string;
  projectLeadId?: string;
  projectOnHold?: boolean;
  focusNodeId?: string;
  proposalId?: string;
  navigate: Navigate;
  funding?: ReactNode;
  parentTitle?: string;
  taskDescription?: string | null;
  taskDefinitionOfDone?: string | null;
  taskAcceptanceCriteria?: readonly string[] | null;
}) {
  const { profile } = useAuth();
  const actor = profile?.id ?? null;
  const resolve = useWorkStatus();
  const palette = useTheme();
  const { toast } = useToast();
  const { fontScale } = useWindowDimensions();
  const [edit, setEdit] = useState<WorkEdit>();
  const [completion, setCompletion] = useState<{ id: string; title: string }>();
  const [menu, setMenu] = useState(false);
  const [officeUpdate, setOfficeUpdate] = useState<string>();
  const [proposal, setProposal] = useState<"progress" | "completion">();
  const startAction = useAction();

  const resolvedProjectStatus =
    projectStatus ??
    (data.root as unknown as { project_status?: string }).project_status;
  const resolvedProjectLeadId =
    projectLeadId ??
    (data.root as unknown as { project_lead_id?: string }).project_lead_id;
  const subtaskPlanningBlocked = isProjectLeadSubtaskPlanningBlocked(
    data,
    actor,
    {
      projectStatus: resolvedProjectStatus,
      projectLeadId: resolvedProjectLeadId,
      actorRole: profile?.role,
    },
  );
  const isHold =
    projectOnHold ||
    resolvedProjectStatus === "on_hold";
  const effectiveReadOnly = readOnly || isHold;

  const { focused, children } = branchRows(data, focusNodeId);
  const node =
    focused &&
    data.nodes.find(
      (item) => item.id === focused.id && item.task_id === data.root.id,
    );
  const schedule = nodeSchedule(node);
  const startScope = JSON.stringify([actor, data.root.kind, data.root.id, focusNodeId]);
  const [confirmedStart, setConfirmedStart] = useState<{ scope: string; startedAt: string }>();
  const recordedStatus = node && subtaskDisplayStatus(node);
  useEffect(() => {
    if (confirmedStart && (confirmedStart.scope !== startScope || recordedStatus !== "todo"))
      setConfirmedStart(undefined);
  }, [confirmedStart, startScope, recordedStatus]);
  const confirmedStartedAt = confirmedStart?.scope === startScope ? confirmedStart.startedAt : undefined;
  const waitingForTask = ["todo", "pending_assignment"].includes(data.root.status ?? "");
  const showWaitingNotice = waitingForTask && !!actor && (
    data.root.lead === actor || node?.lead_id === actor || !!node?.assigned_to_ids?.includes(actor)
  );
  const notStarted =
    node?.status === "todo" && !schedule?.started_at && !confirmedStartedAt;
  const executionBlocked = isHold || waitingForTask || notStarted;
  const context = workScope(data, actor, readOnly, executionBlocked);
  const can = (action: NodeWorkAction) =>
    !!node && selectNodeWorkCapability(data, node.id, action, context).allowed;
  const actions: { id: string; title: string; edit: WorkEdit }[] = [];
  const finish = node && completionMode(data, node.id, actor, readOnly, executionBlocked);
  const subtaskLead = !!actor && node?.lead_id === actor;
  const contributor = !!actor && !subtaskLead && !!node?.assigned_to_ids?.includes(actor);
  const isNodeWorkerOrLead = !!node && isSubtaskLeadOrContributor(data, node, actor);
  const canExecuteNode = isNodeWorkerOrLead && can("execute") && !effectiveReadOnly;
  const canReviewProposals = !!node && canDecideSubtaskProposals(data, node, actor);
  const requiresCompletionReview = (subtaskLead || contributor) &&
    (actor !== data.root.lead || !subtaskLead);
  if (node) {
    if (!subtaskPlanningBlocked && (can("appoint_lead") || can("manage_contributors")))
      actions.push({
        id: "staff",
        title: "Choose people",
        edit: { command: "staff", node },
      });
    if (!subtaskPlanningBlocked && can("edit_details"))
      actions.push({
        id: "edit",
        title: "Edit subtask",
        edit: { command: "edit", node },
      });
    if (!subtaskPlanningBlocked && can("create_child"))
      actions.push({
        id: "create",
        title: "Add child subtask",
        edit: { command: "create", parent: node.id },
      });
    if (personalReviewAllowed(data, node.id, actor, effectiveReadOnly)) {
      actions.push({
        id: "review",
        title: "Review subtask",
        edit: { command: "review", node },
      });
    }
  } else if (!focusNodeId) {
    if (!subtaskPlanningBlocked && selectRootWorkCapability(data, "create_child", context).allowed)
      actions.push({
        id: "create",
        title: "Add subtask",
        edit: { command: "create" },
      });
  }

  const saved = async (receipt: WorkTreeSnapshot) => {
    nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
    await onSaved(receipt);
  };

  if (focusNodeId && !node)
    return (
      <Notice>This subtask is no longer available in this work tree.</Notice>
    );

  // Focus node present: Render Subtask Details
  if (node) {
    const parentNode = node.parent_subtask_id
      ? data.nodes.find((item) => item.id === node.parent_subtask_id)
      : undefined;
    const resolvedParentTitle =
      parentNode?.title || parentTitle || "Parent task";

    const leadPerson = data.people.find((p) => p.id === node.lead_id);
    const nodeContributors: { id?: string; name: string; office?: string }[] = (
      node.assigned_to_ids || []
    )
      .filter((id) => id !== node.lead_id)
      .map(
        (id) =>
          data.people.find((p) => p.id === id) || {
            id,
            name: "Project person",
          },
      );

    const childSubtaskItems: SubtaskItemData[] = children.map((child) => {
      const record = data.nodes.find((item) => item.id === child.id);
      const effectiveStatus = record
        ? workDisplayStatus(subtaskDisplayStatus(record), record.blocker)
        : "todo";
      const memberIds = [
        ...new Set([
          ...(record?.lead_id ? [record.lead_id] : []),
          ...(record?.assigned_to_ids || []),
        ]),
      ];
      const members = memberIds
        .map((mId) => data.people.find((p) => p.id === mId))
        .filter((p): p is WorkPerson => !!p);

      return {
        id: child.id,
        title: child.title,
        status: effectiveStatus,
        customStatusId: record?.custom_status_id,
        percent: record
          ? branchCompletion(data, record.status, record.id).percent
          : undefined,
        members,
      };
    });

    const displayStatus = subtaskDisplayStatus(node, confirmedStartedAt);
    const visualStatus = workDisplayStatus(displayStatus, node.blocker);
    const status = resolve(visualStatus, node.custom_status_id);
    const nodePriority = schedule?.priority;

    const canStaff = !subtaskPlanningBlocked && (can("appoint_lead") || can("manage_contributors"));
    const canCreateChild = !subtaskPlanningBlocked && can("create_child");
    const canEditSubtask = !subtaskPlanningBlocked && can("edit_details");
    const dependencies = subtaskDependencies(data, node);
    const childNodes = data.nodes.filter(
      (item) =>
        item.task_id === data.root.id && item.parent_subtask_id === node.id,
    );
    const childrenComplete = childNodes.every(
      (child) => child.status === "completed",
    );
    const dependenciesReady = dependencies.pendingCount === 0;
    const readyToComplete = childrenComplete && dependenciesReady;
    const parent = data.nodes.find((item) => item.id === node.parent_subtask_id);
    const parentWaiting = parent?.status === "todo" && !nodeSchedule(parent)?.started_at;
    const canStart = subtaskLead && !confirmedStartedAt && recordedStatus === "todo" &&
      !effectiveReadOnly && data.root.open &&
      isCurrentWorkSnapshot(data, context) && notStarted &&
      data.root.status === "in_progress" && dependencies.known &&
      dependencies.pendingCount === 0 && !parentWaiting &&
      plannedStartReached(schedule?.start_date, workScheduleToday(data));
    const workSubmissions = actor && (
      <WorkProposalReview key={"proposals:" + node.id} actor={actor} root={data.root.id} node={node.id}
        proposalId={proposalId} people={data.people} readOnly={effectiveReadOnly || executionBlocked}
        canDecideProposals={canReviewProposals}
        canParticipate={isNodeWorkerOrLead}
        officeSubtask={data.root.kind === "office"}
        onOpenCash={funding ? (recordId) => navigate({
          ...workNodeRoute(data, node.id, "Cash request"), view: "budget", recordId,
        }) : undefined}
        onSaved={async () => saved(await fetchWorkTree(data.root.id))} />
    );

    return (
      <>
        {/* 1. Subtask Header */}
        <View style={{ gap: 4, marginBottom: 4 }}>
          <View
            style={{
              flexDirection: fontScale > 1.8 ? "column" : "row",
              alignItems: "flex-start",
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
              {node.title}
            </Text>
            {canEditSubtask && (
              <BentoEditButton
                accessibilityLabel="Edit subtask"
                onPress={() => setEdit({ command: "edit", node })}
              />
            )}
          </View>

          {/* Navigable parent task */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Back to parent task: ${resolvedParentTitle}`}
            onPress={() => {
              if (parentNode) {
                navigate(workNodeRoute(data, parentNode.id, parentNode.title));
              } else {
                navigate({
                  name: "task",
                  id: data.root.id,
                  projectId: data.root.project,
                  title: "Task details",
                });
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingVertical: 2,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ fontSize: 14, color: palette.mutedLabel }}>
              {resolvedParentTitle}
            </Text>
            <ChevronRight size={14} color={palette.mutedLabel} />
          </Pressable>

          {/* Authorized work-action buttons immediately below parent task link */}
          {(() => {
            const rawExecutionActions: (BentoAction | null)[] = [
              canStart
                ? {
                    label: "Start work",
                    variant: "secondary",
                    icon: "pencil",
                    busy: startAction.busy,
                    onPress: () =>
                      void startAction.run(async () => {
                        const latest = await fetchWorkTree(data.root.id);
                        const current = latest.nodes.find((item) => item.id === node.id);
                        const scope = workScope(latest, actor);
                        if (!current || !isCurrentWorkSnapshot(latest, scope) ||
                            latest.root.project !== data.root.project ||
                            latest.root.office !== data.root.office ||
                            latest.root.kind !== data.root.kind ||
                            !latest.root.open || scope.executionBlocked ||
                            latest.root.status !== "in_progress" || current.lead_id !== actor ||
                            !plannedStartReached(current.start_date, workScheduleToday(latest))) {
                          throw new PublicMessageError("Current work access or scheduling could not be verified. Refresh this subtask.");
                        }
                        const receipt = await sharedWorkRpc<{ id?: string; started_at?: string }>(
                          "m7_start_subtask", { p_root: data.root.id, p_node: node.id },
                        );
                        if (receipt?.id !== node.id || typeof receipt.started_at !== "string" ||
                            !Number.isFinite(Date.parse(receipt.started_at)))
                          throw new PublicMessageError("The start could not be confirmed. Refresh this subtask.");
                        setConfirmedStart({ scope: startScope, startedAt: receipt.started_at });
                        toast("Subtask started.", "success");
                        await saved(await fetchWorkTree(data.root.id));
                      }),
                  }
                : null,
              canExecuteNode
                ? {
                    label: "Update work",
                    variant: "secondary",
                    icon: "pencil",
                    onPress: () => {
                      if (contributor && actor !== data.root.lead)
                        setProposal("progress");
                      else if (data.root.kind === "office")
                        setOfficeUpdate(node.id);
                      else setEdit({ command: "progress", node });
                    },
                  }
                : null,
              !effectiveReadOnly &&
              readyToComplete &&
              (finish === "direct" || finish === "review" || (requiresCompletionReview && canExecuteNode))
                ? {
                    label:
                      finish === "review" || requiresCompletionReview
                        ? "Submit for review"
                        : "Mark as complete",
                    variant: "primary",
                    icon: "check",
                    onPress: () => {
                      if (requiresCompletionReview) setProposal("completion");
                      else if (finish === "direct") setCompletion(node);
                      else setEdit({ command: "submit", node });
                    },
                  }
                : null,
            ];
            const executionActions = rawExecutionActions.filter(
              (item): item is BentoAction => Boolean(item),
            );

            const branchAction: BentoAction | null = actions.length
              ? {
                  label: "Branch actions",
                  variant: "secondary",
                  icon: "sliders",
                  onPress: () => setMenu(true),
                }
              : null;

            if (isHold || showWaitingNotice) {
              return (
                <>
                  <BentoProjectOnHoldCard
                    projectId={data.root.project}
                    waitingForTask={!isHold && waitingForTask}
                    isTaskLead={!isHold && waitingForTask && !!actor && data.root.lead === actor}
                    onNavigateParentTask={
                      !isHold && waitingForTask && !!actor && data.root.lead === actor
                        ? () =>
                            navigate({
                              name: "task",
                              id: data.root.id,
                              projectId: data.root.project,
                              title: "Task details",
                            })
                        : undefined
                    }
                    style={{ marginTop: 8, marginBottom: 8 }}
                  />
                  {branchAction && (
                    <BentoActionButtons
                      actions={[branchAction]}
                      style={{ marginTop: 0, marginBottom: 8 }}
                    />
                  )}
                </>
              );
            }

            if (branchAction && executionActions.length <= 1) {
              return (
                <BentoActionButtons
                  actions={[...executionActions, branchAction]}
                  style={{ marginTop: 8, marginBottom: 8 }}
                />
              );
            }

            return (
              <>
                <BentoActionButtons
                  actions={executionActions}
                  style={{ marginTop: 8, marginBottom: 8 }}
                />
                {branchAction && (
                  <BentoActionButtons
                    actions={[branchAction]}
                    style={{ marginTop: 0, marginBottom: 8 }}
                  />
                )}
              </>
            );
          })()}
          {!isHold && !showWaitingNotice && readOnly && (
            <Notice>
              Work actions are unavailable while access is being refreshed or this
              work is closed.
            </Notice>
          )}
          {!!startAction.error && <ErrorState context="action" error={startAction.error} />}
          {displayStatus === "todo" && notStarted && !waitingForTask && !isHold && (subtaskLead || contributor) && (
            <Notice>
              {subtaskLead
                ? !schedule?.start_date
                  ? "Set a planned start date before starting this subtask."
                  : parentWaiting
                    ? "Start the parent subtask first."
                    : "Start work is available on or after the planned start date once prerequisites are complete."
                : "The Subtask Lead must start work before you can submit progress or completion."}
            </Notice>
          )}
          {!effectiveReadOnly &&
            !notStarted &&
            !waitingForTask &&
            !isHold &&
            !readyToComplete &&
            ["todo", "in_progress", "changes_requested"].includes(node.status) &&
            (subtaskLead || contributor || actor === data.root.lead) && (
              <Notice>
                {!childrenComplete
                  ? "Complete all child subtasks before marking or submitting this subtask as complete."
                  : "Complete all prerequisite subtasks before marking or submitting this subtask as complete."}
              </Notice>
            )}

          {/* Editorial Status / Priority metadata strip */}
          <EditorialMetadataStrip
            variant="card"
            items={[
              {
                label: "Status",
                value: status.label,
                status: visualStatus,
                accent: status.color,
              },
              {
                label: "Priority",
                value: nodePriority ? priorityLabel(nodePriority) : "—",
                accent:
                  nodePriority === "high" || nodePriority === "urgent"
                    ? palette.danger
                    : palette.text,
              },
            ]}
            style={{ marginTop: 2, marginBottom: 10 }}
          />
        </View>

        {!!proposalId && workSubmissions}
        {/* Schedule */}
        <BentoScheduleCards
          startDate={schedule?.start_date}
          dueDate={node.due_date}
          workTimezone="Asia/Manila"
        />

        {/* Conditional Dependencies card */}
        {!dependencies.known && <Notice>Subtask dependencies are unavailable.</Notice>}
        <BentoDependenciesCard
          items={dependencies.items}
          missingCount={dependencies.missingCount}
          pendingCount={dependencies.pendingCount}
          onPressItem={(dep) =>
            navigate(workNodeRoute(data, dep.id, dep.title))
          }
        />

        {/* Conditional Blocker card */}
        {!!node.blocker && <BentoBlockerCard blocker={node.blocker} />}

        {/* 3. Assigned team bento card */}
        <BentoAssignedTeamCard
          leadName={leadPerson?.name || "Needs assignment"}
          leadRoleLabel="Subtask Lead"
          contributors={nodeContributors}
          onChoosePeople={
            canStaff ? () => setEdit({ command: "staff", node }) : undefined
          }
        />

        {/* 4. Child subtasks card (when applicable) */}
        {(children.length > 0 || canCreateChild) && (
          <BentoSubtasksCard
            title="Child subtasks"
            subtasks={childSubtaskItems}
            canAdd={canCreateChild}
            onAddSubtask={() => setEdit({ command: "create", parent: node.id })}
            onPressSubtask={(item) =>
              navigate(workNodeRoute(data, item.id, item.title))
            }
          />
        )}

        {actor &&
          data.root.kind === "office" &&
          node.status === "in_progress" &&
          !node.blocker &&
          canExecuteNode && (
            <CustomWorkStatusControl
              actor={actor}
              taskId={data.root.id}
              nodeId={node.id}
              customId={node.custom_status_id}
            />
          )}

        {/* 5. Supporting navigation boxes */}
        <BentoSubtaskSupportingGrid
          showFunding={data.root.kind === "office"}
          onPressActivity={() =>
            navigate(subtaskViewRoute(data, node.id, "activity", "Activity"))
          }
          onPressReview={() =>
            navigate(
              subtaskViewRoute(data, node.id, "review", "Evidence & review"),
            )
          }
          onPressFunding={
            data.root.kind === "office"
              ? () =>
                  navigate(subtaskViewRoute(data, node.id, "budget", "Funding"))
              : undefined
          }
          onPressFiles={() =>
            navigate(subtaskViewRoute(data, node.id, "files", "Files"))
          }
          onPressPlanning={() =>
            navigate(
              subtaskViewRoute(data, node.id, "planning", "Planning details"),
            )
          }
        />

        {proposal && actor && isNodeWorkerOrLead && (
          <WorkProposalSheet actor={actor} root={data.root.id} node={node.id} kind={proposal}
            initialBlocker={node.blocker}
            canParticipate={isNodeWorkerOrLead}
            onClose={() => setProposal(undefined)}
            onSaved={async () => saved(await fetchWorkTree(data.root.id))} />
        )}

        {/* Selection sheet for extra branch actions if any */}
        <SelectionSheet
          open={menu && !!actions.length}
          title="Branch actions"
          options={actions}
          onClose={() => setMenu(false)}
          onSelect={(id) => {
            setMenu(false);
            setEdit(actions.find((action) => action.id === id)?.edit);
          }}
        />

        {/* Sheets for update, completion, editor */}
        {!!officeUpdate && !!actor && (
          <OfficeSubitemUpdateSheet
            key={officeUpdate + actor}
            tree={data}
            readOnly={effectiveReadOnly}
            actorId={actor}
            nodeId={officeUpdate}
            onClose={() => setOfficeUpdate(undefined)}
            onSaved={saved}
          />
        )}
        {!!completion && !!actor && (
          <SubtaskCompletionSheet
            key={completion.id + actor}
            node={completion}
            actorId={actor}
            rootId={data.root.id}
            projectId={data.root.project}
            officeId={data.root.office}
            onClose={() => setCompletion(undefined)}
            onSaved={saved}
          />
        )}
        {!!edit && (
          <WorkEditorSheet
            key={`${data.root.id}:${edit.command}:${edit.node?.id || edit.parent || "root"}`}
            data={data}
            edit={edit}
            projectStatus={resolvedProjectStatus}
            projectLeadId={resolvedProjectLeadId}
            readOnly={
              readOnly ||
              (isHold &&
                ["progress", "submit", "review"].includes(edit.command))
            }
            onClose={() => setEdit(undefined)}
            onSaved={saved}
          />
        )}
      </>
    );
  }

  // No focusNodeId: Render general subtasks list view
  const canAddRootSubtask =
    !subtaskPlanningBlocked &&
    selectRootWorkCapability(
      data,
      "create_child",
      context,
    ).allowed;

  const rootSubtaskItems: SubtaskItemData[] = children.map((child) => {
    const record = data.nodes.find((item) => item.id === child.id);
    const effectiveStatus = record
      ? workDisplayStatus(subtaskDisplayStatus(record), record.blocker)
      : "todo";
    const memberIds = [
      ...new Set([
        ...(record?.lead_id ? [record.lead_id] : []),
        ...(record?.assigned_to_ids || []),
      ]),
    ];
    const members = memberIds
      .map((mId) => data.people.find((p) => p.id === mId))
      .filter((p): p is WorkPerson => !!p);

    return {
      id: child.id,
      title: child.title,
      status: effectiveStatus,
      customStatusId: record?.custom_status_id,
      percent: record
        ? branchCompletion(data, record.status, record.id).percent
        : undefined,
      members,
    };
  });

  return (
    <>
      <BentoSubtasksCard
        title="Subtasks"
        subtasks={rootSubtaskItems}
        canAdd={canAddRootSubtask}
        onAddSubtask={() => setEdit({ command: "create" })}
        onPressSubtask={(item) =>
          navigate(workNodeRoute(data, item.id, item.title))
        }
      />

      <SelectionSheet
        open={menu && !!actions.length}
        title="Subtask actions"
        options={actions}
        onClose={() => setMenu(false)}
        onSelect={(id) => {
          setMenu(false);
          setEdit(actions.find((action) => action.id === id)?.edit);
        }}
      />
      {!!officeUpdate && !!actor && (
        <OfficeSubitemUpdateSheet
          key={officeUpdate + actor}
          tree={data}
          readOnly={effectiveReadOnly}
          actorId={actor}
          nodeId={officeUpdate}
          onClose={() => setOfficeUpdate(undefined)}
          onSaved={saved}
        />
      )}
      {!!completion && !!actor && (
        <SubtaskCompletionSheet
          key={completion.id + actor}
          node={completion}
          actorId={actor}
          rootId={data.root.id}
          projectId={data.root.project}
          officeId={data.root.office}
          onClose={() => setCompletion(undefined)}
          onSaved={saved}
        />
      )}
      {!!edit && (
        <WorkEditorSheet
          key={`${data.root.id}:${edit.command}:${edit.node?.id || edit.parent || "root"}`}
          data={data}
          edit={edit}
          projectStatus={resolvedProjectStatus}
          projectLeadId={resolvedProjectLeadId}
          readOnly={
            readOnly ||
            (isHold &&
              ["progress", "submit", "review"].includes(edit.command))
          }
          onClose={() => setEdit(undefined)}
          onSaved={saved}
        />
      )}
    </>
  );
}
