import type { WorkRow } from "../../../core/web/app/features/personal-work/types";
import { workDay } from "../../../core/web/app/shared/workCalendar";

export const workGroups = [
  "Overdue",
  "Today",
  "Upcoming",
  "Unscheduled",
  "Completed",
  "Other history",
] as const;
export type WorkGroup = (typeof workGroups)[number];

export function workGroup(row: WorkRow, now: Date): WorkGroup {
  if (["completed", "done"].includes(row.status)) return "Completed";
  if (row.history || row.status === "cancelled") return "Other history";
  const due = workDay(row.due, row.timezone);
  const today = workDay(now, row.timezone);
  if (due === null || today === null) return "Unscheduled";
  return due < today ? "Overdue" : due === today ? "Today" : "Upcoming";
}

export function groupAssignedWork(
  rows: WorkRow[],
  query = "",
  workspace = "",
  now = new Date(),
) {
  const needle = query.trim().toLocaleLowerCase();
  const groups = new Map(workGroups.map((group) => [group, [] as WorkRow[]]));
  for (const row of rows) {
    if (!row.mine || (workspace && workspace !== row.workspaceId)) continue;
    const group = workGroup(row, now);
    if (
      !row.actionable &&
      !row.history &&
      !["Completed", "Other history"].includes(group) &&
      !["for_review", "submitted"].includes(row.status)
    )
      continue;
    if (
      needle &&
      ![
        row.title,
        row.projectTitle,
        row.workspaceName,
        row.officeName,
        row.rootTitle,
        row.workContext?.pathLabel,
        row.relation,
      ].some((value) => value?.toLocaleLowerCase().includes(needle))
    )
      continue;
    groups.get(group)!.push(row);
  }
  return [...groups].map(([title, data]) => ({
    title,
    data: data.sort((a, b) => {
      if (title === "Completed" || title === "Other history")
        return (
          (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.key.localeCompare(b.key)
        );
      const aDue = workDay(a.due, a.timezone) ?? Number.MAX_SAFE_INTEGER;
      const bDue = workDay(b.due, b.timezone) ?? Number.MAX_SAFE_INTEGER;
      return (
        aDue - bDue ||
        a.title.localeCompare(b.title) ||
        a.key.localeCompare(b.key)
      );
    }),
  }));
}
