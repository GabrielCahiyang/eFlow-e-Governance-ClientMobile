import type { ProjectActivityItem } from "../../../core/web/app/features/projects/components/project-command/types";

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const groupChange = new RegExp(
  `^Group Id: (${uuid}|None) → (${uuid}|None)[\\t ]*\\r?$`,
  "gim",
);

/** Format the known field-history row; never change the saved event or use current names as history. */
export function projectAuditDetail(event: ProjectActivityItem): string {
  if (
    event.kind !== "project" ||
    !event.id.startsWith("project-change:") ||
    !event.taskId ||
    !event.title.startsWith("Task details changed · ")
  )
    return event.detail;

  return event.detail.replace(
    groupChange,
    (_line, before: string, after: string) => {
      if (before.toLowerCase() === after.toLowerCase()) return _line;
      if (before.toLowerCase() === "none") return "Task assigned to a group";
      if (after.toLowerCase() === "none") return "Task removed from its group";
      return "Task moved to another group";
    },
  );
}
