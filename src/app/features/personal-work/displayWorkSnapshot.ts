import type { WorkSnapshot } from "../../../core/web/app/features/personal-work/types";

/** A cached feed may describe work, but never supply a decision or mutation capability. */
export function displayWorkSnapshot(data: WorkSnapshot): WorkSnapshot {
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
