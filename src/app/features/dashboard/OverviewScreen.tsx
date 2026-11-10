import { useEffect } from "react";
import { words } from "../../components/ui/theme";
import { completionPercent } from "../../shared/completion";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
import { nativeWindow } from "../../../platform/webRuntime";
import { fetchPersonalProject } from "../../../core/web/app/features/workspaces/services/workspaceService";
import { useAuth } from "../authentication";
import { groupAssignedWork } from "../personal-work/mobileWork";
import { useMobileWorkFeed } from "../personal-work/WorkFeedProvider";
import { workDestination } from "../personal-work/workDestination";
import { fetchProjectCompletion } from "../projects/services";
import { netProjectUpdates } from "../projects/subscriptions";
import { useWorkspace } from "../workspaces";
import { useWorkspaceNavigation } from "../workspaces/WorkspaceNavigation";
import { useWorkspaceFavorites } from "../workspaces/useWorkspaceFavorites";
import { HomeWorkspaceContent } from "./HomeWorkspaceContent";
import type { HomeAttention } from "./HomeAttentionCard";

export function OverviewScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const navigation = useWorkspaceNavigation();
  const favorites = useWorkspaceFavorites();
  const work = useMobileWorkFeed();
  const current = workspace.selected;
  const workspaceId = current?.workspace.id;
  const head = profile?.role === "head";
  const projects = (current?.projects || [])
    .filter((project) => !["completed", "archived"].includes(project.status))
    .sort(
      (a, b) =>
        Number(b.status === "on_hold") - Number(a.status === "on_hold") ||
        Number(b.status === "active") - Number(a.status === "active"),
    )
    .slice(0, 3);
  const projectScope = JSON.stringify([
    profile?.id,
    workspaceId,
    projects.map(({ id, kind }) => [id, kind]),
  ]);
  const progress = useFacts(
    "home-project-progress:" + projectScope,
    () =>
      Promise.all(
        projects.map(async (project) => {
          try {
            if (project.kind === "personal") {
              const { tasks } = await fetchPersonalProject(project.id);
              return completionPercent(
                tasks.filter(({ status }) => status === "done").length,
                tasks.length,
              );
            }
            const { completed, required } = await fetchProjectCompletion(
              project.id,
              false,
            );
            return completionPercent(completed, required);
          } catch {
            return undefined;
          }
        }),
      ),
    head && !!projects.length,
  );
  useEffect(() => {
    if (!head || !projects.length) return;
    const refresh = () => void progress.refresh();
    const cleanup = projects
      .filter((project) => project.kind === "office")
      .map((project) => netProjectUpdates(project.id, refresh));
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    return () => {
      cleanup.forEach((dispose) => dispose());
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
    };
  }, [head, projectScope, progress.refresh]);

  const attention: HomeAttention = head
    ? {
        title: "Project progress",
        empty: "No current projects in this workspace.",
        browseLabel: "View all projects",
        browse: { name: "projects" },
        rows: projects.map((project, index) => ({
          key: project.id,
          title: project.title,
          description: [
            words(project.status),
            progress.data?.[index] != null
              ? `${progress.data[index]}%`
              : progress.loading
                ? "Loading progress…"
                : "Progress unavailable",
          ].join(" · "),
          route: {
            name: project.kind === "personal" ? "personal_project" : "project",
            id: project.id,
          },
        })),
      }
    : {
        title: "My work priorities",
        empty: "No open assignments in this workspace.",
        error: work.error ? "Could not refresh your assignments." : undefined,
        browseLabel: "Browse My Work",
        browse: { name: "personal_work" },
        rows: workspaceId
          ? groupAssignedWork(work.data?.rows || [], "", workspaceId)
              .filter(
                ({ title }) =>
                  title !== "Completed" && title !== "Other history",
              )
              .flatMap(({ title, data }) =>
                data.map((row) => ({
                  key: row.key,
                  title: row.title,
                  description: [title, row.projectTitle]
                    .filter(Boolean)
                    .join(" · "),
                  route: workDestination(row),
                })),
              )
              .slice(0, 3)
          : [],
      };

  return (
    <HomeWorkspaceContent
      attention={attention}
      navigate={navigate}
      attentionLoading={
        (workspace.loading && !current) || (!head && work.loading)
      }
      loading={workspace.loading && !current}
      pinned={favorites.pinned}
      error={workspace.error}
      onRefresh={async () =>
        Promise.all([
          workspace.refresh(),
          head ? progress.refresh() : work.refresh(),
        ])
      }
      onFavorites={navigation.openFavorites}
      onWorkspaces={navigation.openWorkspace}
      onOpenWorkspace={(id) => {
        void navigation.chooseWorkspace(id);
      }}
    />
  );
}
