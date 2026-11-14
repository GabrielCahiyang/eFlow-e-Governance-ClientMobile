import { CustomWorkStatusControl } from "../work-status";
import { useWorkStatus } from "../../shared/workStatusPresentation";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { nodeSchedule, workScheduleToday } from "./subtaskSchedule";
import { WorkProposalReview, WorkProposalSheet } from "./WorkProposalSheet";
import { useAction } from "../../shared/useAction";
import { sharedWorkRpc } from "../../shared/sharedWorkRequest";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import {
  Button,
  Card,
  EditorialMetadataStrip,
  ErrorState,
  Notice,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import type { Navigate } from "../../shared/routes";
import { OfficeSubitemActivity } from "./OfficeSubitemActivity";
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
  PlanningDetailsSheet,
  type DependencyItemData,
  type SubtaskItemData,
} from "./TaskBentoComponents";
import { priorityLabel } from "./TaskDetailsScreen";

export function WorkTreePanel({
  data,
  onSaved,
  readOnly = false,
  projectStatus,
  projectOnHold = false,
  focusNodeId,
  navigate,
  funding,
  parentTitle,
  rootPriority,
  taskDescription,
  taskDefinitionOfDone,
  taskAcceptanceCriteria,
}: {
  data: WorkTreeSnapshot;
  onSaved: (data: WorkTreeSnapshot) => Promise<void>;
  readOnly?: boolean;
  projectStatus?: string;
  projectOnHold?: boolean;
  focusNodeId?: string;
  navigate: Navigate;
  funding?: ReactNode;
  parentTitle?: string;
  rootPriority?: string;
  taskDescription?: string | null;
  taskDefinitionOfDone?: string | null;
  taskAcceptanceCriteria?: readonly string[] | null;
}) {
  const actor = useAuth().profile?.id ?? null;
  const resolve = useWorkStatus();
  const palette = useTheme();
  const { fontScale } = useWindowDimensions();
  const [edit, setEdit] = useState<WorkEdit>();
  const [completion, setCompletion] = useState<{ id: string; title: string }>();
  const [menu, setMenu] = useState(false);
  const [officeUpdate, setOfficeUpdate] = useState<string>();
  const [planningOpen, setPlanningOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [fundingOpen, setFundingOpen] = useState(false);
  const [proposal, setProposal] = useState<"progress" | "completion">();
  const startAction = useAction();

  const isHold =
    projectOnHold ||
    projectStatus === "on_hold" ||
    (data.root as unknown as { project_status?: string }).project_status ===
      "on_hold";
  const effectiveReadOnly = readOnly || isHold;

  const { focused, children } = branchRows(data, focusNodeId);
  const node =
    focused &&
    data.nodes.find(
      (item) => item.id === focused.id && item.task_id === data.root.id,
    );
  const schedule = nodeSchedule(node);
  const waitingForTask = ["todo", "pending_assignment"].includes(data.root.status ?? "");
  const showWaitingNotice = waitingForTask && !!actor && (
    data.root.lead === actor || node?.lead_id === actor || !!node?.assigned_to_ids?.includes(actor)
  );
  const notStarted = node?.status === "todo" && !schedule?.started_at;
  const executionBlocked = isHold || waitingForTask || notStarted;
  const context = workScope(data, actor, readOnly, executionBlocked);
  const can = (action: NodeWorkAction) =>
    !!node && selectNodeWorkCapability(data, node.id, action, context).allowed;
  const actions: { id: string; title: string; edit: WorkEdit }[] = [];
  const finish = node && completionMode(data, node.id, actor, readOnly, executionBlocked);
  const subtaskLead = !!actor && node?.lead_id === actor;
  const contributor = !!actor && !subtaskLead && !!node?.assigned_to_ids?.includes(actor);
  const requiresCompletionReview = (subtaskLead || contributor) &&
    (actor !== data.root.lead || !subtaskLead);
  if (node) {
    if (can("appoint_lead") || can("manage_contributors"))
      actions.push({
        id: "staff",
        title: "Choose people",
        edit: { command: "staff", node },
      });
    if (can("edit_details"))
      actions.push({
        id: "edit",
        title: "Edit subtask",
        edit: { command: "edit", node },
      });
    if (can("create_child"))
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
    if (selectRootWorkCapability(data, "create_child", context).allowed)
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
      const effectiveStatus = record ? record.status : "todo";
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

    const status = resolve(node.status, node.custom_status_id);
    const nodePriority =
      (node as unknown as { priority?: string }).priority ||
      rootPriority ||
      "medium";

    const canStaff = can("appoint_lead") || can("manage_contributors");
    const canCreateChild = can("create_child");
    const canEditSubtask = can("edit_details");
    const prerequisiteItems: DependencyItemData[] = !node.is_standalone
      ? data.nodes
          .filter(
            (item) =>
              item.id !== node.id &&
              item.parent_subtask_id === node.parent_subtask_id &&
              !item.is_standalone &&
              (item.position ?? item.sibling_order) <
                (node.position ?? node.sibling_order),
          )
          .sort(
            (a, b) =>
              (a.position ?? a.sibling_order) -
              (b.position ?? b.sibling_order),
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            completed: item.status === "completed",
          }))
      : [];

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
          {isHold || showWaitingNotice ? (
            <BentoProjectOnHoldCard
              projectId={data.root.project}
              waitingForTask={!isHold && waitingForTask}
              style={{ marginTop: 8, marginBottom: 8 }}
            />
          ) : (
            <BentoActionButtons
              actions={[
                node && subtaskLead && !effectiveReadOnly && notStarted &&
                data.root.status === "in_progress" && !!schedule?.start_date &&
                schedule.start_date === workScheduleToday(data)
                  ? {
                      label: "Start work",
                      variant: "secondary",
                      icon: "pencil",
                      busy: startAction.busy,
                      onPress: () => void startAction.run(async () => {
                        await sharedWorkRpc("m7_start_subtask", { p_root: data.root.id, p_node: node.id });
                        await saved(await fetchWorkTree(data.root.id));
                      }),
                    }
                  : null,
                can("execute") && !effectiveReadOnly
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
                (finish === "direct" || finish === "review" || (requiresCompletionReview && can("execute")))
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
              ]}
              style={{ marginTop: 8, marginBottom: 8 }}
            />
          )}
          {!!startAction.error && <ErrorState context="action" error={startAction.error} />}
          {notStarted && !waitingForTask && !isHold && (subtaskLead || contributor) && (
            <Notice>
              {subtaskLead
                ? "Start work is available on the planned start date."
                : "The Subtask Lead must start work before you can submit progress or completion."}
            </Notice>
          )}

          {/* Editorial Status / Priority metadata strip */}
          <EditorialMetadataStrip
            variant="card"
            items={[
              {
                label: "Status",
                value: status.label,
                status: node.status,
                accent: status.color,
              },
              {
                label: "Priority",
                value: priorityLabel(nodePriority),
                accent:
                  nodePriority === "high" || nodePriority === "urgent"
                    ? palette.danger
                    : palette.text,
              },
            ]}
            style={{ marginTop: 2, marginBottom: 10 }}
          />
        </View>

        {/* Schedule */}
        <BentoScheduleCards
          startDate={schedule?.start_date}
          dueDate={node.due_date}
        />

        {/* Conditional Dependencies card */}
        <BentoDependenciesCard
          items={prerequisiteItems}
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

        {/* 4. Inline chronological Activity card */}
        <OfficeSubitemActivity tree={data} nodeId={node.id} actorId={actor} />

        {/* 5. Child subtasks card (when applicable) */}
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

        {/* 6. Supporting features 2x2 bento grid */}
        <BentoSubtaskSupportingGrid
          onPressReview={() => setReviewOpen(true)}
          onPressFunding={() => {
            if (funding) setFundingOpen(true);
            else {
              navigate({
                name: "task",
                id: data.root.id,
                projectId: data.root.project,
                nodeId: node.id,
                view: "budget",
                title: "Funding",
              });
            }
          }}
          onPressFiles={() =>
            navigate({
              name: "task",
              id: data.root.id,
              projectId: data.root.project,
              view: "files",
              title: "Files",
            })
          }
          onPressPlanning={() => setPlanningOpen(true)}
        />

        {actor &&
          data.root.kind === "office" &&
          node.status === "in_progress" &&
          !node.blocker &&
          can("execute") && (
            <CustomWorkStatusControl
              actor={actor}
              taskId={data.root.id}
              nodeId={node.id}
              customId={node.custom_status_id}
            />
          )}

        {/* Inline funding */}
        {actor && !executionBlocked && !effectiveReadOnly && (actor === data.root.lead || subtaskLead) && (
          <WorkProposalReview actor={actor} root={data.root.id} node={node.id}
            onSaved={async () => saved(await fetchWorkTree(data.root.id))} />
        )}
        {proposal && actor && (
          <WorkProposalSheet actor={actor} root={data.root.id} node={node.id} kind={proposal}
            onClose={() => setProposal(undefined)}
            onSaved={async () => saved(await fetchWorkTree(data.root.id))} />
        )}
        {data.root.kind === "office" && funding}

        {isHold ? (
          <Notice>
            Project is on hold. Work actions, subtask execution, and reviews are
            unavailable.
          </Notice>
        ) : readOnly ? (
          <Notice>
            Work actions are unavailable while access is being refreshed or this
            work is closed.
          </Notice>
        ) : null}

        {/* Planning details sheet */}
        <PlanningDetailsSheet
          open={planningOpen}
          onClose={() => setPlanningOpen(false)}
          description={taskDescription}
          definitionOfDone={taskDefinitionOfDone}
          acceptanceCriteria={taskAcceptanceCriteria}
        />

        {/* Evidence & review sheet */}
        <Sheet
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          title="Evidence & review"
          description="Submissions, attachments, and approvals"
        >
          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingVertical: 8, gap: 12 }}
          >
            <OfficeSubitemActivity
              tree={data}
              nodeId={node.id}
              actorId={actor}
            />
          </ScrollView>
        </Sheet>

        {/* Funding sheet */}
        {fundingOpen && funding && (
          <Sheet
            open={fundingOpen}
            onClose={() => setFundingOpen(false)}
            title="Funding"
            description="Financial records and cash requests"
          >
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              {funding}
            </ScrollView>
          </Sheet>
        )}

        {(can("move") || can("order_children")) && (
          <Button
            variant="outline"
            onPress={() =>
              navigate({
                ...workNodeRoute(data, node.id, "Work planning"),
                view: "planning",
              })
            }
          >
            Planning on eFlow Web
          </Button>
        )}
        {!!actions.length && (
          <Button variant="outline" onPress={() => setMenu(true)}>
            Branch actions
          </Button>
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
  const canAddRootSubtask = selectRootWorkCapability(
    data,
    "create_child",
    context,
  ).allowed;

  const rootSubtaskItems: SubtaskItemData[] = children.map((child) => {
    const record = data.nodes.find((item) => item.id === child.id);
    const effectiveStatus = record ? record.status : "todo";
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

      {selectRootWorkCapability(data, "order_children", context).allowed && (
        <Button
          variant="outline"
          onPress={() =>
            navigate({
              ...workNodeRoute(data, "", "Work planning"),
              nodeId: undefined,
              view: "planning",
            })
          }
        >
          Planning on eFlow Web
        </Button>
      )}
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
