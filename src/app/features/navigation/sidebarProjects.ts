import type { WorkspaceProject } from "../../../core/web/app/features/workspaces/types";
export function sidebarProjectGroups(
  projects: WorkspaceProject[],
  favorites: ReadonlySet<string>,
) {
  const unique = [
    ...new Map(projects.map((project) => [project.id, project])).values(),
  ];
  return {
    favorites: unique.filter((project) => favorites.has(project.id)),
    projects: unique.filter(
      (project) => !favorites.has(project.id) && project.status !== "archived",
    ),
    archived: unique.filter(
      (project) => !favorites.has(project.id) && project.status === "archived",
    ),
  };
}
