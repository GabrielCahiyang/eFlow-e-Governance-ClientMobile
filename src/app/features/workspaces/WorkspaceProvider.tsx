import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  listWorkspaces,
  selectWorkspace,
} from "../../../core/web/app/features/workspaces/services/workspaceService";
import type {
  Workspace,
  WorkspaceSnapshot,
} from "../../../core/web/app/features/workspaces/types";
import { useAuth } from "../authentication";
import { isMobileRole } from "../../shared/mobileRoles";
import { AppState } from "react-native";
import { readWithTimeout } from "../../shared/readTimeout";
import { clearDisplayCache } from "../../shared/displayCache";
import { isProjectGuest, guestProjectAccessChanged } from "./guestProjectAccess";
type Context = {
  workspaces: Workspace[];
  selected?: WorkspaceSnapshot;
  loading: boolean;
  error?: Error;
  select: (id: string) => Promise<WorkspaceSnapshot | undefined>;
  refresh: () => Promise<void>;
};
const WorkspaceContext = createContext<Context | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<WorkspaceSnapshot>(),
    [error, setError] = useState<Error>(),
    [loading, setLoading] = useState(true);
  const generation = useRef(0),
    currentSelection = useRef<string | undefined>(undefined),
    authorized = useRef<Workspace[]>([]);
  const maySeePlanning = profile?.role === "head";
  const loadSelection = useCallback(
    async (id: string, token: number, list: Workspace[]) => {
      try {
        if (
          !list.some(
            (workspace) => workspace.id === id && workspace.state === "active",
          )
        )
          throw new Error(
            "This workspace is not in your current authorized workspace list.",
          );
        const snapshot = await selectWorkspace(id);
        if (token === generation.current) {
          if (
            snapshot.workspace.id !== id ||
            !list.some(
              (workspace) =>
                workspace.id === id &&
                workspace.kind === snapshot.workspace.kind,
            )
          )
            throw new Error("Could not verify the selected workspace context.");
          const visible = {
            ...snapshot,
            projects: snapshot.projects.filter(
              (project) => project.status !== "planning" ||
                (maySeePlanning && project.kind === "office" &&
                  snapshot.workspace.office_id === profile?.org_id),
            ),
          };
          setSelected(visible);
          return visible;
        }
      } catch (e) {
        if (token === generation.current)
          setError(
            e instanceof Error
              ? e
              : new Error("Could not verify workspace access."),
          );
      } finally {
        if (token === generation.current) setLoading(false);
      }
    },
    [maySeePlanning, profile?.org_id],
  );
  const select = async (id: string) => {
    const token = ++generation.current;
    currentSelection.current = id;
    setLoading(true);
    setError(undefined);
    setSelected(undefined);
    return loadSelection(id, token, authorized.current);
  };
  const refresh = useCallback(async () => {
    const token = ++generation.current;
    setLoading(true);
    setError(undefined);
    setSelected(undefined);
    authorized.current = [];
    setWorkspaces([]);
    if (!profile || !isMobileRole(profile.role)) {
      setLoading(false);
      return;
    }
    try {
      const list = (await listWorkspaces()).filter(
        (workspace) => workspace.state === "active",
      );
      if (token !== generation.current) return;
      authorized.current = list;
      setWorkspaces(list);
      const id =
        currentSelection.current ||
        list.find((workspace) => workspace.office_id === profile.org_id)?.id ||
        list[0]?.id;
      if (!id) {
        setLoading(false);
        return;
      }
      currentSelection.current = id;
      await loadSelection(id, token, list);
    } catch (e) {
      if (token === generation.current) {
        setError(
          e instanceof Error
            ? e
            : new Error("Could not verify workspace access."),
        );
        setLoading(false);
      }
    }
  }, [profile?.id, profile?.role, profile?.org_id, loadSelection]);
  useEffect(() => {
    void refresh();
    return () => {
      ++generation.current;
    };
  }, [refresh]);
  const guest = isProjectGuest(profile);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    if (!guest || !selected) return;
    const workspaceId = selected.workspace.id;
    let stopped = false;
    let checking = false;
    const check = async () => {
      if (checking || AppState.currentState === "background") return;
      const previous = selectedRef.current;
      if (previous?.workspace.id !== workspaceId) return;
      const token = generation.current;
      checking = true;
      try {
        const current = await readWithTimeout(() => selectWorkspace(workspaceId));
        if (stopped || token !== generation.current) return;
        if (current.workspace.id !== workspaceId || current.workspace.state !== "active")
          throw new Error("Workspace access ended.");
        const visible = { ...current, projects: current.projects.filter(project => project.status !== "planning") };
        if (guestProjectAccessChanged(previous, visible)) {
          clearDisplayCache("access");
          setSelected(visible);
        }
      } catch {
        if (!stopped && token === generation.current) {
          clearDisplayCache("access");
          setSelected(undefined);
          setError(new Error("Could not verify your current project access."));
        }
      } finally {
        checking = false;
      }
    };
    // Expiry can occur without a row update and revoked rows may be hidden by RLS.
    const fallback = setInterval(() => void check(), 30_000);
    const app = AppState.addEventListener("change", state => {
      if (state === "active") void check();
    });
    return () => {
      stopped = true;
      clearInterval(fallback);
      app.remove();
    };
  }, [guest, selected?.workspace.id]);
  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        selected,
        loading,
        error,
        select,
        refresh,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is missing");
  return value;
}
