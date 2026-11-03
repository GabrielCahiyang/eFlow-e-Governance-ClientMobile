import {
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
import { useFacts } from "../../shared/useFacts";
type Context = {
  workspaces: Workspace[];
  selected?: WorkspaceSnapshot;
  loading: boolean;
  error?: Error;
  select: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};
const WorkspaceContext = createContext<Context | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const data = useFacts(
    "workspace-list:" + profile?.id,
    listWorkspaces,
    !!profile && profile.role !== "admin",
  );
  const [selected, setSelected] = useState<WorkspaceSnapshot>(),
    [error, setError] = useState<Error>(),
    [loading, setLoading] = useState(false);
  const generation = useRef(0),
    currentSelection = useRef<string | undefined>(undefined);
  const select = async (id: string) => {
    const switching = currentSelection.current !== id;
    const token = ++generation.current;
    currentSelection.current = id;
    setLoading(true);
    setError(undefined);
    if (switching) setSelected(undefined);
    try {
      const snapshot = await selectWorkspace(id);
      if (token === generation.current) setSelected(snapshot);
    } catch (e) {
      if (token === generation.current) setError(e as Error);
    } finally {
      if (token === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (!selected && data.data?.length) {
      const initial =
        data.data.find((w) => w.office_id === profile?.org_id) || data.data[0];
      void select(initial.id);
    }
  }, [data.data, profile?.id]);
  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: data.data || [],
        selected,
        loading: loading || data.loading,
        error: error || data.error,
        select,
        refresh: async () => {
          await data.refresh();
          if (currentSelection.current) await select(currentSelection.current);
        },
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
