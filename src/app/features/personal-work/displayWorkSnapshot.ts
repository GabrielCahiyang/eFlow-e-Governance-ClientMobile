import { nodeSchedule } from "../tasks/subtaskSchedule";
import { officeSubtaskPublished } from "../tasks/branchInspector";
import type {
  WorkRow,
  WorkSnapshot,
} from "../../../core/web/app/features/personal-work/types";

export type MobileWorkRow = WorkRow & { start?: string };

type MobileWorkSnapshot = Omit<WorkSnapshot, "rows"> & {
  rows: MobileWorkRow[];
};

export function mobileWorkSnapshot(
  data: WorkSnapshot,
  actor: string,
): MobileWorkSnapshot {
  const visibleProjects = new Set(
    data.projects
      .filter((project) => project.status !== "planning")
      .map((project) => project.id),
  );
  return {
    ...data,
    projects: data.projects.filter((project) =>
      visibleProjects.has(project.id),
    ),
    rows: data.rows
      .filter((row) => !row.projectId || visibleProjects.has(row.projectId))
      .filter(
        (row) =>
          row.kind !== "office-node" ||
          !row.mine ||
          officeSubtaskPublished(
            row.tree?.root.status || row.task?.status,
            row.tree?.root.lead ?? row.task?.assigneeId,
            actor,
          ),
      )
      .map((row) => ({
        ...row,
        status: nodeSchedule(row.node)?.effective_status ?? row.status,
        mine:
          row.mine &&
          row.relation !== "Recommended lead" &&
          (row.kind !== "office-task" ||
            !row.task ||
            row.task.assigneeId === actor ||
            !!row.task.teamMemberIds?.includes(actor)),
        start:
          row.kind === "office-task"
            ? row.task?.startDate
            : nodeSchedule(row.node)?.start_date || undefined,
        due: row.due || row.subtask?.dueDate,
        relation:
          row.relation === "Subitem Lead"
            ? "Subtask Lead"
            : row.kind === "office-task" &&
                row.task?.assigneeId !== actor &&
                row.task?.teamMemberIds?.includes(actor)
              ? "Contributor"
              : row.relation,
      })),
  };
}

/** A cached feed may describe work, but never supply a decision or mutation capability. */
export function displayWorkSnapshot(
  data: MobileWorkSnapshot,
): MobileWorkSnapshot {
  return {
    ...data,
    rows: data.rows.map((row) => ({
      key: row.key,
      id: row.id,
      rootId: row.rootId,
      title: row.title,
      rootTitle: row.rootTitle,
      kind: row.kind,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      workspaceId: row.workspaceId,
      workspaceName: row.workspaceName,
      officeName: row.officeName,
      timezone: row.timezone,
      blocker: row.blocker,
      status: row.status,
      due: row.due,
      start: row.start,
      progress: row.progress,
      updatedAt: row.updatedAt,
      mine: row.mine,
      leading: row.leading,
      history: row.history,
      relation: row.relation,
      actionable: false,
    })),
  };
}
