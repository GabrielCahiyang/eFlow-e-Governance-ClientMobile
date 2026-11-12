import { statusLabel } from "../../shared/statusLabels";
import { workDay } from "../../../core/web/app/shared/workCalendar";
import type { WorkspaceProject } from "../../../core/web/app/features/workspaces/types";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import type { ProjectGroup } from "../../../core/web/app/features/project-table/types";

export function projectSections(
  authorized: WorkspaceProject[],
  favorites: ReadonlySet<string>,
  search: string,
  status: string,
  showPlanning = false,
) {
  const query = search.trim().toLowerCase();
  const matches = [
    ...new Map(authorized.map((p) => [p.id, p])).values(),
  ].filter(
    (project) =>
      (showPlanning || project.status !== "planning") &&
      project.title.toLowerCase().includes(query) &&
      (status === "all" ||
        (status === "current"
          ? project.status !== "archived"
          : project.status === status)),
  );
  const starred = matches.filter((p) => favorites.has(p.id));
  return [
    { key: "favorites", title: "Favorites", data: starred },
    {
      key: "projects",
      title: "Projects",
      data: matches.filter((p) => !favorites.has(p.id)),
    },
  ].filter((section) => section.data.length);
}

export type ProjectWorkView = "tasks" | "board" | "calendar";
export const workStatuses = [
  "pending_assignment",
  "todo",
  "in_progress",
  "for_review",
  "changes_requested",
  "completed",
  "cancelled",
] as const;
export function agendaDay(deadline?: string, dueDate?: string) {
  const value = deadline || dueDate;
  const day = workDay(value);
  return day === null
    ? value || ""
    : new Date(day * 86400000).toISOString().slice(0, 10);
}
export const compareAgendaDays = (a: string, b: string) =>
  a === b ? 0 : !a ? 1 : !b ? -1 : a.localeCompare(b);

export function taskSections(
  tasks: Task[],
  groups: ProjectGroup[],
  view: ProjectWorkView,
) {
  const buckets = new Map<string, Task[]>();
  const groupIds = new Set(groups.map((group) => group.id));
  const defaultGroup = groups.find((group) => group.isDefault);
  for (const task of tasks) {
    const key =
      view === "board"
        ? task.status
        : view === "calendar"
          ? agendaDay(task.deadline, task.dueDate)
          : task.groupId && groupIds.has(task.groupId)
            ? task.groupId
            : !task.groupId && defaultGroup
              ? defaultGroup.id
              : "";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(task);
    else buckets.set(key, [task]);
  }
  const order: [string, string][] =
    view === "board"
      ? workStatuses.map((id) => [id, statusLabel(id)])
      : view === "calendar"
        ? [...buckets.keys()]
            .sort(compareAgendaDays)
            .map((day) => [day, day || "No due date"])
        : [
            ...groups.map((group): [string, string] => [group.id, group.title]),
            ["", "Ungrouped"],
          ];
  const labels = new Map(order);
  for (const key of buckets.keys())
    if (!labels.has(key)) labels.set(key, statusLabel(key));
  return [...labels].flatMap(([key, title]) => {
    const data = buckets.get(key);
    return data?.length ? [{ key, title, data }] : [];
  });
}
