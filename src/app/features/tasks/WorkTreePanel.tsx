import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { useState } from "react";
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
}: {
  data: WorkTreeSnapshot;
  onSaved: (data: WorkTreeSnapshot) => Promise<void>;
  readOnly?: boolean;
  focusNodeId?: string;
  navigate: Navigate;
}) {
  const actor = useAuth().profile?.id ?? null;
  const [edit, setEdit] = useState<WorkEdit>();
  const [completion, setCompletion] = useState<{ id: string; title: string }>();
  const [menu, setMenu] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
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
        title: "Add child",
        edit: { command: "create", parent: node.id },
      });
    if (personalReviewAllowed(data, node.id, actor, readOnly)) {
      actions.push({
        id: "review",
        title: "Review subitem",
        edit: { command: "review", node },
      });
    }
  } else if (!focusNodeId) {
    if (selectRootWorkCapability(data, "create_child", context).allowed)
      actions.push({
        id: "create",
        title: "Add subitem",
        edit: { command: "create" },
      });
  }
  const saved = async (receipt: WorkTreeSnapshot) => {
    nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
    await onSaved(receipt);
  };
  if (focusNodeId && (!node || !focused))
    return (
      <Notice>This subitem is no longer available in this work tree.</Notice>
    );
  return (
    <>
      {node && focused && (
        <Card title="Subitem details">
          <Text>{`Level ${node.depth || focused.depth} · ${focused.pathLabel}`}</Text>
          <Row>
            <Status value={node.status} />
          </Row>
          <LabelValue label="Progress" value={`${node.percent_complete}%`} />
          <LabelValue
            label="Due date"
            value={dateLabel(node.due_date || undefined)}
          />
          <LabelValue
            label="Subitem Lead"
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
                Mark complete
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
      {node && data.root.kind === "office" && (
        <>
          <Button
            variant="outline"
            onPress={() =>
              navigate({
                ...workNodeRoute(data, node.id, node.title),
                view: "budget",
              })
            }
          >
            Open subitem funding
          </Button>
          <Button
            variant="outline"
            onPress={() => setShowActivity(!showActivity)}
          >
            {showActivity ? "Hide subitem activity" : "Show subitem activity"}
          </Button>
          {showActivity && (
            <OfficeSubitemActivity
              tree={data}
              nodeId={node.id}
              actorId={actor}
            />
          )}
        </>
      )}
      <Card title={node ? "Child subitems" : "Subitems"}>
        {!!actions.length && (
          <Button variant="outline" onPress={() => setMenu(true)}>
            {node ? "Branch actions" : "Subitem actions"}
          </Button>
        )}
        {children.length ? (
          children.map((child) => {
            const record = data.nodes.find((item) => item.id === child.id)!;
            return (
              <NavigationRow
                key={child.id}
                title={child.title}
                description={`Level ${record.depth || child.depth} · ${record.status.replaceAll("_", " ")} · ${record.percent_complete}%`}
                onPress={() =>
                  navigate(workNodeRoute(data, child.id, child.title))
                }
              />
            );
          })
        ) : (
          <Text>No child subitems.</Text>
        )}
      </Card>
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
        title={node ? "Branch actions" : "Subitem actions"}
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
