import { nodeSchedule } from "../tasks/subtaskSchedule";
import type {
  WorkRow,
  WorkSnapshot,
} from "../../../core/web/app/features/personal-work/types";

export type MobileWorkRow = WorkRow & {
  start?: string;
  customStatusId?: string | null;
  listedAsOpen?: boolean;
};

type MobileWorkSnapshot = Omit<WorkSnapshot, "rows"> & {
  rows: MobileWorkRow[];
};

export function mobileWorkSnapshot(data: WorkSnapshot): MobileWorkSnapshot {
  return {
    ...data,
    rows: data.rows.map((row) => ({
      ...row,
      listedAsOpen: row.actionable,
      customStatusId: row.kind === "office-task" ? row.task?.customStatusId : row.node?.custom_status_id,
      start: row.kind === "office-task" ? row.task?.startDate : nodeSchedule(row.node)?.start_date || undefined,
      due: row.due || row.subtask?.dueDate,
      relation: row.relation === "Subitem Lead" ? "Subtask Lead" : row.relation,
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
      customStatusId: row.customStatusId,
      due: row.due,
      start: row.start,
      progress: row.progress,
      updatedAt: row.updatedAt,
      mine: row.mine,
      leading: row.leading,
      history: row.history,
      relation: row.relation,
      listedAsOpen: row.listedAsOpen ?? row.actionable,
      actionable: false,
    })),
  };
}
