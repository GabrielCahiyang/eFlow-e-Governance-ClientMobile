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
  executionBlocked = false,
) {
  const isHold =
    executionBlocked ||
    (tree.root as unknown as { project_status?: string }).project_status ===
      "on_hold";
  return {
    actorId,
    rootId: tree.root.id,
    projectId: tree.root.project,
    officeId: tree.root.office,
    kind: tree.root.kind,
    revision: tree.revision,
    readOnly,
    executionBlocked: isHold,
  };
}

export function completionMode(
  tree: WorkTreeSnapshot,
  nodeId: string,
  actorId: string | null,
  readOnly = false,
  executionBlocked = false,
) {
  const isHold =
    executionBlocked ||
    (tree.root as unknown as { project_status?: string }).project_status ===
      "on_hold";
  if (isHold || readOnly) return;
  const node = tree.nodes.find(
    (item) => item.id === nodeId && item.task_id === tree.root.id,
  );
  if (
    !node ||
    !actorId ||
    !["todo", "in_progress", "changes_requested"].includes(node.status)
  )
    return;
  const scope = workScope(tree, actorId, readOnly);
  if (!selectNodeWorkCapability(tree, nodeId, "submit", scope).allowed) return;
  if (tree.root.kind === "personal") return "review";
  if (tree.root.lead === actorId || node.lead_id === actorId) return "direct";
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
