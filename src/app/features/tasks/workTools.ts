import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { isActive } from "../../../core/web/app/features/tasks/selectors/lifecycle";
/** Mirrors useCurrentUserTasks, the shared web personal-work scope. */
export function myNativeTasks(tasks: Task[], actorId: string) {
  return actorId
    ? tasks.filter(
        (task) =>
          task.assigneeId === actorId ||
          task.recommendationLeadId === actorId ||
          (task.teamMemberIds || []).includes(actorId),
      )
    : [];
}
export function nativeDeadlineGroups(tasks: Task[], now = new Date()) {
  const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime(),
    end = start + 86400000;
  const groups = {
    overdue: [] as Task[],
    today: [] as Task[],
    upcoming: [] as Task[],
    awaiting: [] as Task[],
  };
  for (const task of tasks.filter(isActive)) {
    if (task.status === "for_review") {
      groups.awaiting.push(task);
      continue;
    }
    const value = task.deadline || task.dueDate;
    if (!value || /month|phase|week|quarter|ongoing|tbd|q[1-4]/i.test(value)) {
      groups.upcoming.push(task);
      continue;
    }
    const at = new Date(value).getTime();
    if (!Number.isFinite(at)) groups.upcoming.push(task);
    else if (at < start) groups.overdue.push(task);
    else if (at < end) groups.today.push(task);
    else groups.upcoming.push(task);
  }
  for (const key of ["overdue", "today", "upcoming"] as const)
    groups[key].sort(
      (a, b) =>
        new Date(a.deadline || a.dueDate || 0).getTime() -
        new Date(b.deadline || b.dueDate || 0).getTime(),
    );
  return groups;
}
export function nativeHistoryGroups(tasks: Task[]) {
  return {
    completed: tasks.filter((t) => t.status === "completed" && !t.archivedAt),
    rejected: tasks.filter(
      (t) => t.status === "changes_requested" && !t.archivedAt,
    ),
    reopened: tasks.filter((t) => t.reopenReason && !t.archivedAt),
    archived: tasks.filter((t) => !!t.archivedAt),
  };
}
