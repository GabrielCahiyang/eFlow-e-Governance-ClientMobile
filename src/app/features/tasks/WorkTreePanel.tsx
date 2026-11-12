import { nodeSchedule } from "./subtaskSchedule";
import { CustomWorkStatusControl } from "../work-status";
import { useWorkStatus } from "../../shared/workStatusPresentation";
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
  const resolve = useWorkStatus();
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
  const context = workScope(data, actor, readOnly);
  const can = (action: NodeWorkAction) =>
    !!node && selectNodeWorkCapability(data, node.id, action, context).allowed;
  const actions: { id: string; title: string; edit: WorkEdit }[] = [];
  const finish = node && completionMode(data, node.id, actor, readOnly);
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
  if (focusNodeId && !node)
    return (
      <Notice>This subtask is no longer available in this work tree.</Notice>
    );
  return (
    <>
      {node && (
        <Card>
          <Row>
            <Status
              work
              customId={node.custom_status_id}
              value={node.status}
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
          {(data.root.scheduleBounds || !!schedule?.start_date) && (
            <LabelValue
              label="Start date"
              value={schedule?.start_date ? workDateLabel(schedule.start_date, "Asia/Manila") : "No start date"}
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
            {actor && data.root.kind === "office" && node.status === "in_progress" && !node.blocker && can("execute") && (
              <CustomWorkStatusControl actor={actor} taskId={data.root.id} nodeId={node.id} customId={node.custom_status_id} />
            )}
            {can("execute") && (
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
                Submit for review
              </Button>
            )}
          </Row>
        </Card>
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
      {(!node || actions.length > 0 || children.length > 0) && (
        <Card title={node ? "Child subtasks" : "Subtasks"}>
          {!!actions.length && (
            <Button variant="outline" onPress={() => setMenu(true)}>
              {node ? "Branch actions" : "Subtask actions"}
            </Button>
          )}
          {children.length ? (
            children.map((child) => {
              const record = data.nodes.find((item) => item.id === child.id)!;
              return (
                <NavigationRow
                  key={child.id}
                  title={child.title}
                  description={[
                    resolve(record.status, record.custom_status_id).label,
                    branchCompletion(data, record.status, record.id).percent + "%",
                    data.root.scheduleBounds && [
                      record.start_date ? workDateLabel(record.start_date, "Asia/Manila") : "No start date",
                      record.due_date ? workDateLabel(record.due_date, "Asia/Manila") : "No due date",
                    ].join(" – "),
                  ].filter(Boolean).join(" · ")}
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
