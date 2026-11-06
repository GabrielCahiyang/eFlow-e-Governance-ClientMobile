import { useWorkspace } from "../workspaces";
import { useWorkspaceNavigation } from "../workspaces/WorkspaceNavigation";
import { useWorkspaceFavorites } from "../workspaces/useWorkspaceFavorites";
import { HomeWorkspaceContent } from "./HomeWorkspaceContent";
import type { Navigate } from "../../shared/routes";

export function OverviewScreen({ navigate }: { navigate: Navigate }) {
  const workspace = useWorkspace(),
    navigation = useWorkspaceNavigation();
  const favorites = useWorkspaceFavorites();
  const current = workspace.selected;
  return (
    <HomeWorkspaceContent
      workspaceName={current?.workspace.name}
      projects={(current?.projects || []).slice(0, 3)}
      loading={workspace.loading && !current}
      pinned={favorites.pinned}
      error={workspace.error}
      onRefresh={workspace.refresh}
      onFavorites={navigation.openFavorites}
      onWorkspaces={navigation.openWorkspace}
      onOpenWorkspace={(id) => {
        void navigation.chooseWorkspace(id);
      }}
      onProjects={() => navigate({ name: "projects" })}
      onProject={(id) => {
        const project = current?.projects.find((item) => item.id === id);
        if (project)
          navigate({
            name: project.kind === "personal" ? "personal_project" : "project",
            id,
          });
      }}
    />
  );
}
