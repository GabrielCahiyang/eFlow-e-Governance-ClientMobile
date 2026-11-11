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
  dateLabel,
} from "../../components/ui";
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
  const context = workScope(data, actor, readOnly);
  const can = (action: NodeWorkAction) =>
    !!node && selectNodeWorkCapability(data, node.id, action, context).allowed;
  const actions: { id: string; title: string; edit: WorkEdit }[] = [];
  const finish = node && completionMode(data, node.id, actor, readOnly);
  const contributor = !!node && isSubtaskContributor(data, node.id, actor);
  const completionSummary =
    node && branchCompletion(data, node.status, node.id);
  if (node) {
    if (can("appoint_lead") || can("manage_contributors"))
      actions.push({
        id: "staff",
        title: "Choose people",
        edit: { command: "staff", node },
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
            <Status value={node.status} />
          </Row>
          <LabelValue
            label="Progress"
            value={
              completionSummary?.total
                ? `${completionSummary.completed}/${completionSummary.total} complete · ${completionSummary.percent}%`
                : `${completionSummary?.percent}%`
            }
          />
          <LabelValue
            label="Due date"
            value={dateLabel(node.due_date || undefined)}
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
          {contributor && !readOnly && node.status !== "completed" && (
            <Notice>{contributorReviewUnavailable}</Notice>
          )}
          <Row>
            {!contributor && can("execute") && (
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
                  description={`${statusLabel(record.status)} · ${branchCompletion(data, record.status, record.id).percent}%`}
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
      {(can("edit_details") ||
        can("move") ||
        can("order_children") ||
        can("delete") ||
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
