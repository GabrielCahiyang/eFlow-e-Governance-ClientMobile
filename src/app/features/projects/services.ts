import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { rowToProject } from "../../../core/web/app/features/projects/services/projectMappers";
import { rowToTask } from "../../../core/web/app/features/tasks/services/taskMapper";
export async function fetchProjects() {
  return (
    await readAllRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("projects")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    )
  ).map(rowToProject);
}
export async function fetchProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return rowToProject(data);
}
export async function fetchProjectTasks(project: string) {
  return (
    await readAllRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("linked_project_id", project)
        .is("deleted_at", null)
        .order("workspace_position")
        .order("id")
        .range(from, to),
    )
  ).map(rowToTask);
}
