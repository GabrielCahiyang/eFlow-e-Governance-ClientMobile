import { useEffect, type ReactNode } from "react";
import { AppState } from "react-native";
import type { StatusDefinition } from "../../../core/web/app/features/work-status/statusDefinitions";
import { supabase } from "../../../platform/supabase";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useFacts } from "../../shared/useFacts";
import {
  emptyWorkStatusCatalog,
  WorkStatusCatalog,
} from "../../shared/workStatusPresentation";

export function WorkStatusProvider({
  actor,
  children,
}: {
  actor?: string;
  children: ReactNode;
}) {
  const facts = useFacts(
    "work-status:" + actor,
    async () => {
      const { data, error } = await supabase
        .from("work_status_definitions")
        .select("id,label,color,position,scope,retired");
      if (error) throw error;
      return (data ?? []) as StatusDefinition[];
    },
    !!actor,
  );
  const { refresh } = facts;
  useEffect(() => {
    if (!actor) return;
    const update = () => void refresh();
    const channel = createPostgresChannel("native-work-status:" + actor)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_status_definitions" },
        update,
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") update();
      });
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") update();
    });
    const fallback = setInterval(() => {
      if (AppState.currentState === "active") update();
    }, 60_000);
    return () => {
      app.remove();
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [actor, refresh]);
  return (
    <WorkStatusCatalog.Provider
      value={
        facts.data
          ? { definitions: facts.data, ready: !facts.error }
          : emptyWorkStatusCatalog
      }
    >
      {children}
    </WorkStatusCatalog.Provider>
  );
}
