import { LeadWorkReviewCard } from "./LeadWorkReviewCard";
import { nodeSchedule, workScheduleToday } from "./subtaskSchedule";
import { statusLabel } from "../../shared/statusLabels";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useState, type ReactNode } from "react";
import {
  Button,
  Card,
  LabelValue,
  Notice,
  Row,
  Status,
} from "../../components/ui";
import { workDateLabel } from "../../../core/web/app/shared/workCalendar";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import type { Navigate } from "../../shared/routes";
import { OfficeSubitemActivity } from "./OfficeSubitemActivity";
import { OfficeSubitemUpdateSheet } from "./OfficeSubitemUpdateSheet";
import { SubtaskCompletionSheet } from "./SubtaskCompletionSheet";
import { WorkEditorSheet } from "./WorkEditorSheet";
import {
  branchRows,
  branchCompletion,
  completionMode,
  isSubtaskContributor,
  officeSubtaskPublished,
  personalReviewAllowed,
  workNodeRoute,
  workScope,
} from "./branchInspector";
import { contributorReviewUnavailable } from "../../shared/userMessages";
import {
  selectNodeWorkCapability,
  selectRootWorkCapability,
} from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type {
  WorkTreeSnapshot,
  NodeWorkAction,
} from "../../../core/web/app/features/nested-work/types";
import type { WorkEdit } from "../../../core/web/app/features/nested-work/types/editor";
import { nativeWindow } from "../../../platform/webRuntime";

export function WorkTreePanel({
  data,
  onSaved,
  readOnly = false,
  focusNodeId,
  navigate,
  funding,
}: {
  data: WorkTreeSnapshot;
  onSaved: (data: WorkTreeSnapshot) => Promise<void>;
  readOnly?: boolean;
  focusNodeId?: string;
  navigate: Navigate;
  funding?: ReactNode;
}) {
  const actor = useAuth().profile?.id ?? null;
  const [edit, setEdit] = useState<WorkEdit>();
  const [completion, setCompletion] = useState<{ id: string; title: string }>();
  const [menu, setMenu] = useState(false);
  const [officeUpdate, setOfficeUpdate] = useState<string>();
  const { focused, children } = branchRows(data, focusNodeId);
  const node =
    focused &&
    data.nodes.find(
      (item) => item.id === focused.id && item.task_id === data.root.id,
    );
  const schedule = nodeSchedule(node);
  const scheduled = !!workScheduleToday(data);
  const canExecuteSchedule =
    !scheduled || !schedule?.start_date || !!schedule.started_at;
  const context = workScope(data, actor, readOnly);
  const can = (action: NodeWorkAction) =>
    !!node && selectNodeWorkCapability(data, node.id, action, context).allowed;
  const actions: { id: string; title: string; edit: WorkEdit }[] = [];
  const finish =
    node &&
    canExecuteSchedule &&
    completionMode(data, node.id, actor, readOnly);
  const contributor = !!node && isSubtaskContributor(data, node.id, actor);
  const waitingToStart =
    data.root.kind === "office" &&
    !officeSubtaskPublished(data.root.status, data.root.lead, actor);
  const visibleChildren = waitingToStart
    ? children.filter((child) => {
        const item = data.nodes.find((entry) => entry.id === child.id);
        return (
          item?.lead_id !== actor &&
          !item?.assigned_to_ids.includes(actor || "")
        );
      })
    : children;
  const completionSummary =
    node && branchCompletion(data, node.status, node.id);
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
    if (personalReviewAllowed(data, node.id, actor, readOnly)) {
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
  if (
    focusNodeId &&
    (!node || (waitingToStart && (node.lead_id === actor || contributor)))
  )
    return (
      <Notice>This subtask is no longer available in this work tree.</Notice>
    );
  return (
    <>
      {node && (
        <Card>
          <Row>
            <Status
              value={
                schedule?.started_at && node.status === "todo"
                  ? "in_progress"
                  : node.status
              }
            />
          </Row>
          <LabelValue
            label="Progress"
            value={
              completionSummary?.total
                ? `${completionSummary.completed}/${completionSummary.total} complete · ${completionSummary.percent}%`
                : `${completionSummary?.percent}%`
            }
          />
          {!!schedule?.start_date && (
            <LabelValue
              label="Planned start"
              value={workDateLabel(schedule.start_date, "Asia/Manila")}
            />
          )}
          {!!schedule?.started_at && (
            <LabelValue
              label="Started"
              value={new Date(schedule.started_at).toLocaleString()}
            />
          )}
          <LabelValue
            label="Due date"
            value={workDateLabel(node.due_date, "Asia/Manila")}
          />
          <LabelValue
            label="Subtask Lead"
            value={
              data.people.find((p) => p.id === node.lead_id)?.name ||
              "Needs assignment"
            }
          />
          <LabelValue
            label="Contributors"
            value={
              node.assigned_to_ids
                .filter((id) => id !== node.lead_id)
                .map(
                  (id) =>
                    data.people.find((p) => p.id === id)?.name ||
                    "Project person",
                )
                .join(", ") || "None"
            }
          />
          {!!node.blocker && <Notice>{node.blocker}</Notice>}
          {readOnly && (
            <Notice>
              Work actions are unavailable while access is being refreshed or
              this work is closed.
            </Notice>
          )}
          <Row>
            {!contributor && canExecuteSchedule && can("execute") && (
              <Button
                variant="outline"
                onPress={() => {
                  if (data.root.kind === "office") setOfficeUpdate(node.id);
                  else setEdit({ command: "progress", node });
                }}
              >
                Update work
              </Button>
            )}
            {finish === "direct" && (
              <Button variant="outline" onPress={() => setCompletion(node)}>
                Mark as complete
              </Button>
            )}
            {finish === "review" && (
              <Button
                variant="outline"
                onPress={() => setEdit({ command: "submit", node })}
              >
                {scheduled ? "Mark as complete" : "Submit for review"}
              </Button>
            )}
          </Row>
        </Card>
      )}
      {node && (
        <LeadWorkReviewCard
          root={data.root.id}
          node={node.id}
          readOnly={readOnly}
          onSaved={() => saved(data)}
          fallback={
            !readOnly &&
            node.status !== "completed" &&
            (contributor ? (
              <Notice>{contributorReviewUnavailable}</Notice>
            ) : node.lead_id === actor && actor !== data.root.lead ? (
              <Notice>
                Submitting this subtask to the Task Lead for review is currently
                unavailable.
              </Notice>
            ) : undefined)
          }
        />
      )}
      {node && data.root.kind === "office" && funding}
      {node && (
        <OfficeSubitemActivity
          key={node.id}
          tree={data}
          nodeId={node.id}
          actorId={actor}
        />
      )}
      {(!node || actions.length > 0 || visibleChildren.length > 0) && (
        <Card title={node ? "Child subtasks" : "Subtasks"}>
          {!!actions.length && (
            <Button variant="outline" onPress={() => setMenu(true)}>
              {node ? "Branch actions" : "Subtask actions"}
            </Button>
          )}
          {visibleChildren.length ? (
            visibleChildren.map((child) => {
              const record = data.nodes.find((item) => item.id === child.id)!;
              return (
                <NavigationRow
                  key={child.id}
                  title={child.title}
                  description={`${statusLabel(nodeSchedule(record)?.effective_status ?? record.status)} · ${branchCompletion(data, record.status, record.id).percent}%`}
                  onPress={() =>
                    navigate(workNodeRoute(data, child.id, child.title))
                  }
                />
              );
            })
          ) : (
            <Text>No child subtasks.</Text>
          )}
        </Card>
      )}
      {(can("move") ||
        can("order_children") ||
        (!node &&
          selectRootWorkCapability(data, "order_children", context)
            .allowed)) && (
        <NavigationRow
          title="Planning on eFlow Web"
          onPress={() =>
            navigate({
              ...workNodeRoute(data, node?.id || "", "Work planning"),
              nodeId: node?.id,
              view: "planning",
            })
          }
        />
      )}
      <SelectionSheet
        open={menu && !!actions.length}
        title={node ? "Branch actions" : "Subtask actions"}
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
          readOnly={readOnly}
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
          readOnly={readOnly}
          onClose={() => setEdit(undefined)}
          onSaved={saved}
        />
      )}
    </>
  );
}
