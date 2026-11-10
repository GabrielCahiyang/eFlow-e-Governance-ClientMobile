import type { WorkspaceProject } from "../../../core/web/app/features/workspaces/types";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import type { ProjectGroup } from "../../../core/web/app/features/project-table/types";

export function projectSections(
  authorized: WorkspaceProject[],
  favorites: ReadonlySet<string>,
  recent: readonly string[],
  search: string,
  status: string,
) {
  const query = search.trim().toLowerCase();
  const matches = [
    ...new Map(authorized.map((p) => [p.id, p])).values(),
  ].filter(
    (project) =>
      project.title.toLowerCase().includes(query) &&
      (status === "all" ||
        (status === "current"
          ? project.status !== "archived"
          : project.status === status)),
  );
  const starred = matches.filter((p) => favorites.has(p.id));
  const remaining = new Map(
    matches.filter((p) => !favorites.has(p.id)).map((p) => [p.id, p]),
  );
  const opened = [];
  for (const id of recent) {
    const project = remaining.get(id);
    if (project) {
      opened.push(project);
      remaining.delete(id);
    }
  }
  return [
    { key: "favorites", title: "Favorites", data: starred },
    { key: "recent", title: "Recently opened", data: opened },
    { key: "projects", title: "Projects", data: [...remaining.values()] },
  ].filter((section) => section.data.length);
}

export type ProjectWorkView = "tasks" | "board" | "calendar";
export const workStatuses = [
  ["pending_assignment", "Needs assignment"],
  ["todo", "To do"],
  ["in_progress", "In progress"],
  ["for_review", "For review"],
  ["changes_requested", "Changes requested"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;
export const agendaDay = (deadline?: string, dueDate?: string) =>
  (deadline || dueDate)?.slice(0, 10) || "";
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
      ? workStatuses.map(([id, label]) => [id, label])
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
    if (!labels.has(key)) labels.set(key, key.replaceAll("_", " "));
  return [...labels].flatMap(([key, title]) => {
    const data = buckets.get(key);
    return data?.length ? [{ key, title, data }] : [];
  });
}
