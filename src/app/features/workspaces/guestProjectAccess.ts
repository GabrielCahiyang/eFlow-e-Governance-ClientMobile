import type { WorkspaceSnapshot } from "../../../core/web/app/features/workspaces/types";

export function isProjectGuest(
  profile?: { id: string; employee_id?: string | null } | null,
) {
  return !!profile && profile.employee_id === `GUEST-${profile.id}`;
}

export function guestProjectAccessChanged(
  previous: WorkspaceSnapshot,
  current: WorkspaceSnapshot,
) {
  const previousProjects = new Map(
    previous.projects.map((project) => [project.id, project]),
  );
  return (
    previousProjects.size !== current.projects.length ||
    current.projects.some((project) => {
      const saved = previousProjects.get(project.id);
      return (
        !saved ||
        saved.status !== project.status ||
        saved.title !== project.title
      );
    })
  );
}
