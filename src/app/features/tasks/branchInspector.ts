import { nodeSchedule, workScheduleToday } from "./subtaskSchedule";
import { buildWorkDisplayTree } from "../../../core/web/app/features/nested-work/selectors/displayTree";
import { selectNodeWorkCapability } from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import type { AppRoute } from "../../shared/routes";
import { completionPercent } from "../../shared/completion";

export function branchCompletion(
  tree: WorkTreeSnapshot,
  status: string,
  nodeId: string | null = null,
) {
  const children = tree.nodes.filter(
    (node) =>
      node.task_id === tree.root.id && node.parent_subtask_id === nodeId,
  );
  const completed = children.filter(
    (node) => node.status === "completed",
  ).length;
  return {
    completed,
    total: children.length,
    percent: completionPercent(completed, children.length, status),
  };
}

export function defaultSubtaskLead(tree: WorkTreeSnapshot) {
  return (
    tree.people.find(
      (person) => person.id === tree.root.lead && person.eligible !== false,
    )?.id || ""
  );
}

export function isSubtaskContributor(
  tree: WorkTreeSnapshot,
  nodeId: string,
  actorId: string | null,
) {
  const node = tree.nodes.find(
    (item) => item.id === nodeId && item.task_id === tree.root.id,
  );
  return (
    !!actorId &&
    !!node &&
    node.lead_id !== actorId &&
    (!Array.isArray(node.assigned_to_ids) ||
      node.assigned_to_ids.includes(actorId))
  );
}

export function officeSubtaskPublished(
  rootStatus: string | undefined,
  rootLead: string | null | undefined,
  actorId: string | null | undefined,
) {
  return (
    (!!actorId && rootLead === actorId) ||
    (rootStatus !== "todo" && rootStatus !== "pending_assignment")
  );
}

export function branchRows(tree: WorkTreeSnapshot, focus?: string) {
  const display = buildWorkDisplayTree(
    tree.nodes.filter((node) => node.task_id === tree.root.id),
  );
  return {
    focused: display.find((row) => row.id === focus),
    children: display.filter((row) => row.displayParentId === (focus ?? null)),
  };
}

export function workNodeRoute(
  tree: WorkTreeSnapshot,
  nodeId: string,
  title: string,
): AppRoute {
  return tree.root.kind === "personal"
    ? {
        name: "personal_project",
        id: tree.root.project,
        taskId: tree.root.id,
        nodeId,
        title,
      }
    : {
        name: "task",
        id: tree.root.id,
        projectId: tree.root.project,
        nodeId,
        title,
      };
}

export function workScope(
  tree: WorkTreeSnapshot,
  actorId: string | null,
  readOnly = false,
) {
  return {
    actorId,
    rootId: tree.root.id,
    projectId: tree.root.project,
    officeId: tree.root.office,
    kind: tree.root.kind,
    revision: tree.revision,
    readOnly,
  };
}

export function completionMode(
  tree: WorkTreeSnapshot,
  nodeId: string,
  actorId: string | null,
  readOnly = false,
) {
  const node = tree.nodes.find(
    (item) => item.id === nodeId && item.task_id === tree.root.id,
  );
  if (
    !node ||
    !actorId ||
    isSubtaskContributor(tree, nodeId, actorId) ||
    !["todo", "in_progress", "changes_requested"].includes(node.status)
  )
    return;
  const scope = workScope(tree, actorId, readOnly);
  if (tree.root.kind === "personal") {
    if (
      workScheduleToday(tree) &&
      (tree.root.lead !== actorId || node.lead_id !== actorId)
    )
      return;
    if (selectNodeWorkCapability(tree, nodeId, "submit", scope).allowed)
      return "review";
  } else if (
    tree.root.lead === actorId &&
    (!workScheduleToday(tree) ||
      (node.lead_id === actorId &&
        (!nodeSchedule(node)?.start_date ||
          !!nodeSchedule(node)?.started_at))) &&
    selectNodeWorkCapability(tree, nodeId, "submit", scope).allowed
  )
    return "direct";
}

export function personalReviewAllowed(
  tree: WorkTreeSnapshot,
  nodeId: string,
  actorId: string | null,
  readOnly = false,
) {
  const node = tree.nodes.find(
    (item) => item.id === nodeId && item.task_id === tree.root.id,
  );
  return (
    !!actorId &&
    tree.root.kind === "personal" &&
    node?.status === "for_review" &&
    node.current_reviewer === actorId &&
    selectNodeWorkCapability(
      tree,
      nodeId,
      "review",
      workScope(tree, actorId, readOnly),
    ).allowed
  );
}
