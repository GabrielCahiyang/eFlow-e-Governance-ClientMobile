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
          setSelected(snapshot);
          return snapshot;
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
    [],
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
