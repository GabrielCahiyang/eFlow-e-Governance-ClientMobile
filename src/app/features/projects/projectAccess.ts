import { supabase } from "../../../platform/supabase";
import { fetchProjectOffices } from "../../../core/web/app/features/project-offices/services/projectOfficeService";
import { PublicMessageError } from "../../shared/userMessages";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";

export async function readProjectSetup(projectId: string) {
  const { data, error } = await supabase.rpc("project_flow_snapshot", {
    p_project: projectId,
  });
  if (error) throw error;
  if (data?.project?.id !== projectId || typeof data.ready !== "boolean")
    throw new Error("Could not verify project setup.");
  return { ready: data.ready, canAuthorize: data.canAuthorize === true };
}

export async function projectEditorAccess(
  project: string,
  office: string,
  actor: string,
  task: Task,
) {
  if (
    task.proposedOfficeIdentityId ||
    task.archivedAt ||
    ["for_review", "completed", "cancelled"].includes(task.status)
  )
    return false;
  const { offices, members } = await fetchProjectOffices(project);
  const team = offices.find(
    (entry) =>
      entry.office_id === office &&
      entry.invitation_status === "joined" &&
      ["lead", "collaborating"].includes(entry.relationship_type),
  );
  return (
    !!team &&
    members.some(
      (member) =>
        member.project_office_id === team.id &&
        member.user_id === actor &&
        member.can_edit === true,
    )
  );
}

export async function requireProjectSetup(project: string) {
  if (!(await readProjectSetup(project)).ready)
    throw new PublicMessageError(
      "Finish project setup on eFlow Web before adding or editing work.",
    );
}
