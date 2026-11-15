import type {
  WorkNode,
  WorkTreeSnapshot,
} from "../../../core/web/app/features/nested-work/types";
import { nodeSchedule } from "./subtaskSchedule";

// The hosted snapshot projects these fields for Office subtasks.
export type DependencyNode = WorkNode & {
  can_edit_dependencies?: boolean;
  dependency_ids?: string[] | null;
  pending_dependency_count?: number | null;
  restricted_dependency_count?: number | null;
};

/** Returns true when the server snapshot includes Office subtask planning support. */
export function supportsSubtaskDependencies(tree: WorkTreeSnapshot) {
  return (
    tree.root.kind === "office" &&
    (tree as WorkTreeSnapshot & { supportsSubtaskDependencies?: boolean })
      .supportsSubtaskDependencies === true
  );
}

/** Lists active sibling subtasks under the same parent that can be chosen as prerequisites. */
export function subtaskPrerequisiteSiblings(
  tree: WorkTreeSnapshot,
  parentId: string | null,
  excludeId?: string | null,
): DependencyNode[] {
  return tree.nodes.filter(
    (item) =>
      item.id !== excludeId &&
      item.task_id === tree.root.id &&
      (item.parent_subtask_id ?? null) === (parentId ?? null) &&
      String(item.status) !== "cancelled",
  );
}

/** Maps legacy sequential subtasks to their implicit non-cancelled earlier siblings. */
export function legacySiblingDependencyIds(
  tree: WorkTreeSnapshot,
  node: DependencyNode,
): string[] {
  if (node.dependency_ids != null) return [];
  return subtaskDependencies(tree, node)
    .items.filter((item) => String(item.status) !== "cancelled")
    .map((item) => item.id);
}

/** Checks whether the actor has Office dependency planning access when adding a subtask. */
export function canCreateSubtaskDependencies(tree: WorkTreeSnapshot): boolean {
  if (!supportsSubtaskDependencies(tree)) return false;
  return !tree.nodes.some(
    (item) =>
      item.status === "todo" &&
      !nodeSchedule(item)?.started_at &&
      !item.percent_complete &&
      (item as DependencyNode).can_edit_dependencies === false,
  );
}

/** Checks whether explicit prerequisites can be edited on an existing subtask. */
export function canEditSubtaskDependencies(
  tree: WorkTreeSnapshot,
  node?: DependencyNode,
): boolean {
  return (
    supportsSubtaskDependencies(tree) &&
    node?.can_edit_dependencies === true &&
    node.status === "todo" &&
    !nodeSchedule(node)?.started_at &&
    !node.percent_complete &&
    subtaskDependencies(tree, node).missingCount === 0
  );
}

/** Detects circular chains across explicit dependencies and active legacy sequence edges. */
export function subtaskDependencyWouldCycle(
  nodes: readonly DependencyNode[],
  nodeId: string,
  candidateIds: readonly string[],
): boolean {
  const byId = new Map<string, readonly string[]>();
  for (const item of nodes) {
    if (item.id === nodeId) {
      byId.set(item.id, candidateIds);
      continue;
    }
    if (String(item.status) === "cancelled") {
      byId.set(item.id, []);
      continue;
    }
    if (Array.isArray(item.dependency_ids)) {
      byId.set(item.id, item.dependency_ids);
      continue;
    }
    if (item.is_standalone || item.status === "completed") {
      byId.set(item.id, []);
      continue;
    }
    byId.set(
      item.id,
      nodes
        .filter(
          (prerequisite) =>
            prerequisite.task_id === item.task_id &&
            prerequisite.parent_subtask_id === item.parent_subtask_id &&
            !prerequisite.is_standalone &&
            prerequisite.status !== "completed" &&
            String(prerequisite.status) !== "cancelled" &&
            prerequisite.sibling_order < item.sibling_order,
        )
        .map((prerequisite) => prerequisite.id),
    );
  }
  const visited = new Set<string>();
  const pending = [...candidateIds];
  while (pending.length) {
    const id = pending.pop()!;
    if (id === nodeId) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...(byId.get(id) ?? []));
  }
  return false;
}

/** Rejects schedules where the subtask starts before an incomplete prerequisite is due. */
export function subtaskDependencyScheduleError(
  siblings: readonly DependencyNode[],
  candidateIds: readonly string[],
  startDate?: string | null,
): string {
  if (!startDate) return "";
  const conflict = siblings.some(
    (item) =>
      candidateIds.includes(item.id) &&
      item.status !== "completed" &&
      !!item.due_date &&
      item.due_date > startDate,
  );
  return conflict
    ? "The subtask starts before a selected prerequisite is due. Adjust the schedule first."
    : "";
}

export function subtaskDependencies(
  tree: WorkTreeSnapshot,
  node: DependencyNode,
) {
  const siblings = tree.nodes.filter(
    (item) =>
      item.id !== node.id &&
      item.task_id === tree.root.id &&
      item.parent_subtask_id === node.parent_subtask_id,
  );
  if (Array.isArray(node.dependency_ids)) {
    const ids = new Set(node.dependency_ids);
    const items = siblings.filter((item) => ids.has(item.id));
    const missingCount =
      ids.size -
      items.length +
      Math.max(0, node.restricted_dependency_count ?? 0);
    const pendingCount = Math.max(
      items.filter((item) => item.status !== "completed").length,
      node.pending_dependency_count ?? missingCount,
    );
    return { items, missingCount, pendingCount, known: true };
  }
  if (node.dependency_ids === null || tree.root.kind === "personal") {
    const items = node.is_standalone
      ? []
      : siblings
          .filter(
            (item) =>
              !item.is_standalone && item.sibling_order < node.sibling_order,
          )
          .sort((left, right) => left.sibling_order - right.sibling_order);
    return {
      items,
      missingCount: 0,
      pendingCount: items.filter((item) => item.status !== "completed").length,
      known: true,
    };
  }
  return { items: [], missingCount: 0, pendingCount: 0, known: false };
}
