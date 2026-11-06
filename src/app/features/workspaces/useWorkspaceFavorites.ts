import { useNavigationFavorites } from "../../../core/web/app/shared/navigationPreferences";
import { useAuth } from "../authentication";
import { useWorkspace } from ".";

/** Local actor-scoped preference; a star never confers workspace access. */
export function useWorkspaceFavorites() {
  const { profile } = useAuth(),
    workspace = useWorkspace();
  const available = (workspace.workspaces || []).filter(
    (item) => item.state === "active",
  );
  const preferences = useNavigationFavorites(
    profile?.id || "",
    "mobile-workspaces",
    available.map((item) => item.id),
    !workspace.loading && !workspace.error,
  );
  return {
    ...preferences,
    available,
    pinned: available.filter((item) => preferences.favorites.has(item.id)),
  };
}
