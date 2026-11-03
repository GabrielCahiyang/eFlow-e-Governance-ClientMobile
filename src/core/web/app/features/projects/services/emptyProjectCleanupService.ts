import { supabase } from "../../../../lib/supabase";
import { deleteProject } from "./projectMutationService";

export interface EmptyProjectCleanupCandidate {
  id: string;
  title: string;
}

export type EmptyProjectCleanupOutcome =
  | { status: "not_empty" }
  | { status: "kept"; project: EmptyProjectCleanupCandidate }
  | { status: "deleted"; project: EmptyProjectCleanupCandidate };

interface EmptyProjectCleanupDependencies {
  find: typeof findEmptyProjectCleanupCandidate;
  remove: typeof deleteEmptyProjectAfterTaskCleanup;
}

/** Resolve a project only after confirming it has no non-deleted tasks. */
export async function findEmptyProjectCleanupCandidate(
  projectId: string,
): Promise<EmptyProjectCleanupCandidate | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw new Error(projectError.message);
  if (!project) return null;

  const { count, error: taskError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("linked_project_id", projectId)
    .is("deleted_at", null);
  if (taskError) throw new Error(taskError.message);
  if ((count || 0) > 0) return null;

  return { id: project.id as string, title: project.title as string };
}

export async function deleteEmptyProjectAfterTaskCleanup(
  project: EmptyProjectCleanupCandidate,
): Promise<void> {
  await deleteProject(
    project.id,
    project.title,
    "Empty project removed after its final task was deleted from the Task Board.",
  );
}

export async function offerEmptyProjectCleanup(
  projectId: string,
  confirmDelete: (project: EmptyProjectCleanupCandidate) => boolean | Promise<boolean>,
  dependencies: EmptyProjectCleanupDependencies = {
    find: findEmptyProjectCleanupCandidate,
    remove: deleteEmptyProjectAfterTaskCleanup,
  },
): Promise<EmptyProjectCleanupOutcome> {
  const project = await dependencies.find(projectId);
  if (!project) return { status: "not_empty" };
  if (!await confirmDelete(project)) return { status: "kept", project };
  await dependencies.remove(project);
  return { status: "deleted", project };
}
