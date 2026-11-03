import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
import { fetchVisibleTasks } from "./services";
export function useTaskFacts(scope: string) {
  const { profile } = useAuth();
  const facts = useFacts(
    `tasks:${scope}:${profile?.id}`,
    fetchVisibleTasks,
    !!profile,
  );
  useEffect(() => {
    if (!profile) return;
    const channel = createPostgresChannel(
      "native-task-facts:" + scope + ":" + profile.id,
    )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => void facts.refresh(),
      )
      .subscribe();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void facts.refresh();
    });
    return () => {
      app.remove();
      void supabase.removeChannel(channel);
    };
  }, [scope, profile?.id]);
  return facts;
}
