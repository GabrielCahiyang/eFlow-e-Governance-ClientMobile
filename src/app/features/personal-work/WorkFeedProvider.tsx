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
import { displayWorkSnapshot } from "./displayWorkSnapshot";

const Context = createContext<ReturnType<typeof useFeed> | null>(null);
function useFeed(actor: string) {
  return useFacts("mobile-work:" + actor, () => loadWorkFeed(actor), !!actor, {
    actor,
    select: displayWorkSnapshot,
  });
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
