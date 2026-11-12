import { createContext, useContext, useEffect, type ReactNode } from "react";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import { loadWorkFeed } from "../../../core/web/app/features/personal-work/services/workFeedService";
import { ACCESS_CHANGED_EVENT } from "../../../core/web/app/features/project-access/services/accessService";
import { useFacts } from "../../shared/useFacts";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useAuth } from "../authentication";
import { clearDisplayCache } from "../../shared/displayCache";
import { workScheduleToday } from "../tasks/subtaskSchedule";
import { displayWorkSnapshot, mobileWorkSnapshot } from "./displayWorkSnapshot";

const Context = createContext<ReturnType<typeof useFeed> | null>(null);
function useFeed(actor: string) {
  return useFacts(
    "mobile-work:v3:" + actor,
    async () => {
      const snapshot = mobileWorkSnapshot(await loadWorkFeed(actor), actor);
      if (
        !snapshot.rows.some(
          (row) =>
            row.kind.startsWith("office-") &&
            row.tree &&
            workScheduleToday(row.tree),
        )
      )
        return snapshot;

      const { data, error } = await supabase.rpc("m7_office_assignments", {
        p_workspace: null,
      });
      if (error?.code === "PGRST202" || error?.code === "42883")
        return snapshot;
      if (error) throw error;
      if (
        !Array.isArray(data) ||
        data.some(
          (row) =>
            typeof row?.key !== "string" ||
            typeof row?.workspace_id !== "string",
        )
      )
        throw new Error("Could not verify current Office assignments.");
      const assignments = new Map<string, string>(
        data.map((row) => [row.key, row.workspace_id]),
      );
      const workspaceNames = new Map(
        snapshot.workspaces.map((workspace) => [workspace.id, workspace.name]),
      );
      return {
        ...snapshot,
        rows: snapshot.rows.map((row) => {
          if (!row.kind.startsWith("office-")) return row;
          const workspaceId = assignments.get(row.key);
          return {
            ...row,
            mine: !!workspaceId,
            workspaceId: workspaceId ?? row.workspaceId,
            workspaceName: workspaceId
              ? (workspaceNames.get(workspaceId) ?? row.workspaceName)
              : row.workspaceName,
          };
        }),
      };
    },
    !!actor,
    {
      actor,
      select: displayWorkSnapshot,
    },
  );
}

export function WorkFeedProvider({ children }: { children: ReactNode }) {
  const actor = useAuth().profile?.id || "";
  const facts = useFeed(actor);
  useEffect(() => {
    if (!actor) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void facts.refresh(), 150);
    };
    const channel = createPostgresChannel("mobile-work:" + actor)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        schedule,
      )
      .subscribe();
    const poll = setInterval(() => {
      if (AppState.currentState === "active") void facts.refreshIfStale();
    }, 30000);
    const focus = () => {
      void facts.refreshIfStale();
    };
    const workChanged = () => clearDisplayCache("data");
    const accessChanged = () => clearDisplayCache("access");
    nativeWindow.addEventListener("focus", focus);
    nativeWindow.addEventListener("eflow:work-updated", workChanged);
    nativeWindow.addEventListener(ACCESS_CHANGED_EVENT, accessChanged);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      void supabase.removeChannel(channel);
      nativeWindow.removeEventListener("focus", focus);
      nativeWindow.removeEventListener("eflow:work-updated", workChanged);
      nativeWindow.removeEventListener(ACCESS_CHANGED_EVENT, accessChanged);
    };
  }, [actor, facts.refresh, facts.refreshIfStale]);
  return <Context.Provider value={facts}>{children}</Context.Provider>;
}

export function useMobileWorkFeed() {
  const facts = useContext(Context);
  if (!facts) throw new Error("WorkFeedProvider is missing");
  return facts;
}
