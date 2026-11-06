import type { AppRoute } from "../../shared/routes";
import type { WorkRow } from "../../../core/web/app/features/personal-work/types";
export function workDestination(row: WorkRow): AppRoute {
  if (row.kind.startsWith("personal-")) {
    if (!row.projectId)
      throw new Error(
        "This personal work item has no current project context. Refresh your work.",
      );
    return {
      name: "personal_project",
      id: row.projectId,
      taskId: row.rootId,
      nodeId: row.kind === "personal-node" ? row.id : undefined,
      view: "tasks",
    };
  }
  return {
    name: "task",
    id: row.rootId,
    projectId: row.projectId,
    ...(row.projectId || !row.workspaceId
      ? {}
      : { workspaceId: row.workspaceId }),
    nodeId: row.kind === "office-node" ? row.id : undefined,
    view: row.kind === "office-node" ? "subitems" : "details",
  };
}
