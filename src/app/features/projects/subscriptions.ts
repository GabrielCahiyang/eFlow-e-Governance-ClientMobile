import { createPostgresChannel } from "../../shared/postgresChannel";
import { AppState } from "react-native";
import { supabase } from "../../../platform/supabase";
export function netProjectUpdates(project: string, onChange: () => void) {
  const channel = createPostgresChannel("native-project:" + project)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "projects",
        filter: "id=eq." + project,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: "linked_project_id=eq." + project,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_groups",
        filter: "project_id=eq." + project,
      },
      onChange,
    )
    .subscribe();
  const app = AppState.addEventListener("change", (state) => {
    if (state === "active") onChange();
  });
  return () => {
    app.remove();
    void supabase.removeChannel(channel);
  };
}
