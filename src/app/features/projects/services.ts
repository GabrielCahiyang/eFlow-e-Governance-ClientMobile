import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { rowToProject } from "../../../core/web/app/features/projects/services/projectMappers";
import { verifiedProjectStatus } from "./portfolioFacts";
import { PublicMessageError } from "../../shared/userMessages";
import {
  readString,
  rowToTask,
} from "../../../core/web/app/features/tasks/services/taskMapper";
import type { ProjectGroup } from "../../../core/web/app/features/project-table/types";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { agendaDay, compareAgendaDays, workStatuses } from "./mobileProjects";
export async function fetchProjects(office?: string) {
  return (
    await readAllRows<Record<string, unknown>>((from, to) => {
      const query = supabase.from("projects").select("*", { count: "exact" });
      if (office) query.eq("org_id", office);
      return query
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to);
    })
  ).filter((row) => row.status !== "planning").map(rowToProject);
}
export async function fetchProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status === "planning") throw new PublicMessageError("This project is unavailable here.");
  if (!verifiedProjectStatus(data.status))
    throw new Error("Project status is unavailable.");
  return rowToProject(data);
}
type TaskColumns = "*" | "id" | "id,deadline,due_date";
function visibleProjectTasks(
  project: string,
  includeArchived: boolean,
  columns: TaskColumns = "*",
  options?: { count: "exact"; head?: boolean },
) {
  const query = supabase
    .from("tasks")
    .select<TaskColumns, Record<string, unknown>>(columns, options)
    .eq("linked_project_id", project)
    .is("deleted_at", null);
  if (!includeArchived) query.is("archived_at", null);
  return query;
}

export async function fetchProjectCompletion(
  project: string,
  includeArchived: boolean,
) {
  const countTasks = () =>
    visibleProjectTasks(project, includeArchived, "id", {
      count: "exact",
      head: true,
    });
  const [required, completed] = await Promise.all([
    countTasks().or("status.neq.cancelled,status.is.null"),
    countTasks().eq("status", "completed"),
  ]);
  if (
    required.error ||
    completed.error ||
    required.count == null ||
    completed.count == null ||
    completed.count > required.count
  )
    throw new Error("Could not load project task totals.");
  return { required: required.count, completed: completed.count };
}

type TaskPosition = { position: number; id: string };
export type ProjectTaskCursor = { group: number; after?: TaskPosition };
export type ProjectTaskPage = { tasks: Task[]; next?: ProjectTaskCursor };
const taskPageSize = 50;

function searchProjectTasks(search: string) {
  // PostgREST interprets wildcard and filter punctuation. Use a quoted,
  // literal case-insensitive regex so even those characters can be searched.
  const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `"${literal.replace(/["\\]/g, "\\$&")}"`;
  return ["title", "description", "assignee_name"]
    .map((column) => `${column}.imatch.${pattern}`)
    .join(",");
}

export async function fetchProjectTaskPage(
  project: string,
  groups: ProjectGroup[],
  includeArchived: boolean,
  search: string,
  cursor?: ProjectTaskCursor,
  signal?: AbortSignal,
): Promise<ProjectTaskPage> {
  const defaultGroup = groups.find((group) => group.isDefault);
  return fetchGroupedTaskPage(
    project,
    includeArchived,
    search,
    groups.length + 1,
    (query, index) => {
      const group = groups[index];
      if (group && group === defaultGroup)
        query.or(`group_id.eq.${group.id},group_id.is.null`);
      else if (group) query.eq("group_id", group.id);
      else if (groups.length) {
        const unknownGroup = `group_id.not.in.(${groups.map((item) => item.id).join(",")})`;
        query.or(
          defaultGroup ? unknownGroup : `${unknownGroup},group_id.is.null`,
        );
      }
    },
    cursor,
    signal,
  );
}

const statuses = workStatuses;
export function fetchProjectBoardPage(
  project: string,
  includeArchived: boolean,
  search: string,
  cursor?: ProjectTaskCursor,
  signal?: AbortSignal,
) {
  return fetchGroupedTaskPage(
    project,
    includeArchived,
    search,
    statuses.length,
    (query, index) => {
      query.eq("status", statuses[index]);
    },
    cursor,
    signal,
  );
}

async function fetchGroupedTaskPage(
  project: string,
  includeArchived: boolean,
  search: string,
  groupCount: number,
  filterGroup: (
    query: ReturnType<typeof visibleProjectTasks>,
    index: number,
  ) => void,
  cursor?: ProjectTaskCursor,
  signal?: AbortSignal,
): Promise<ProjectTaskPage> {
  const tasks: Task[] = [];
  // Finish each displayed group before advancing so no rows are inserted
  // above the current viewport during a scroll.
  for (let index = cursor?.group ?? 0; index < groupCount; index++) {
    const query = visibleProjectTasks(project, includeArchived);
    if (signal) query.abortSignal(signal);
    filterGroup(query, index);
    if (search) query.or(searchProjectTasks(search));
    const after = cursor?.group === index ? cursor.after : undefined;
    if (after)
      query.or(
        `workspace_position.gt.${after.position},and(workspace_position.eq.${after.position},id.gt.${after.id})`,
      );

    const remaining = taskPageSize - tasks.length;
    const { data, error } = await query
      .order("workspace_position")
      .order("id")
      .limit(remaining + 1);
    if (error || !data) throw new Error("Could not load project tasks.");
    tasks.push(...data.slice(0, remaining).map(rowToTask));
    if (data.length > remaining) {
      const last = data[remaining - 1];
      return {
        tasks,
        next: {
          group: index,
          after: {
            position: Number(last.workspace_position),
            id: String(last.id),
          },
        },
      };
    }
    if (tasks.length === taskPageSize)
      return {
        tasks,
        next: index + 1 < groupCount ? { group: index + 1 } : undefined,
      };
  }
  return { tasks };
}

type AgendaIndexRow = { id: string; day: string };
export type AgendaTaskCursor = { index: AgendaIndexRow[]; offset: number };

export async function fetchProjectAgendaPage(
  project: string,
  includeArchived: boolean,
  search: string,
  cursor?: AgendaTaskCursor,
  signal?: AbortSignal,
): Promise<{ tasks: Task[]; next?: AgendaTaskCursor }> {
  const scoped = (columns: TaskColumns, count?: "exact") => {
    const query = visibleProjectTasks(
      project,
      includeArchived,
      columns,
      count ? { count } : undefined,
    );
    if (signal) query.abortSignal(signal);
    if (search) query.or(searchProjectTasks(search));
    return query;
  };
  const dayFor = (row: Record<string, unknown>) =>
    agendaDay(readString(row.deadline), readString(row.due_date));
  // These columns are legacy text, so SQL date casting could exclude fuzzy
  // dates. Load only the ordering index, then fetch details as needed.
  const index =
    cursor?.index ??
    (
      await readAllRows<Record<string, unknown>>((from, to) =>
        scoped("id,deadline,due_date", "exact")
          .order("workspace_position")
          .order("id")
          .range(from, to),
      )
    )
      .map((row) => ({ id: String(row.id), day: dayFor(row) }))
      .sort((a, b) => compareAgendaDays(a.day, b.day));

  for (let offset = cursor?.offset ?? 0; offset < index.length;) {
    const period = index[offset].day.slice(0, 7);
    let end = offset + 1;
    while (
      end < index.length &&
      end - offset < taskPageSize &&
      index[end].day.slice(0, 7) === period
    )
      end++;
    const window = index.slice(offset, end);
    const { data, error } = await scoped("*").in(
      "id",
      window.map(({ id }) => id),
    );
    if (error || !data) throw new Error("Could not load project tasks.");
    const byId = new Map(data.map((row) => [String(row.id), row]));
    const tasks = window.flatMap(({ id, day }) => {
      const row = byId.get(id);
      // A task that moved since indexing will be placed on the next refresh.
      return row && dayFor(row) === day ? [rowToTask(row)] : [];
    });
    if (tasks.length)
      return {
        tasks,
        next: end < index.length ? { index, offset: end } : undefined,
      };
    offset = end;
  }
  return { tasks: [] };
}
