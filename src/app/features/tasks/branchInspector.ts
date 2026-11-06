import { buildWorkDisplayTree } from "../../../core/web/app/features/nested-work/selectors/displayTree";
import { selectNodeWorkCapability } from "../../../core/web/app/features/nested-work/selectors/capabilities";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import type { AppRoute } from "../../shared/routes";

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
    !["todo", "in_progress", "changes_requested"].includes(node.status)
  )
    return;
  const scope = workScope(tree, actorId, readOnly);
  if (tree.root.kind === "personal") {
    if (selectNodeWorkCapability(tree, nodeId, "submit", scope).allowed)
      return "review";
  } else if (
    (node.lead_id === actorId || tree.root.lead === actorId) &&
    selectNodeWorkCapability(tree, nodeId, "execute", scope).allowed
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
