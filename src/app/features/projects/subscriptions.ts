import { createLiveRefreshController } from "../../shared/liveUpdates";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
export function netProjectUpdates(project: string, onChange: () => void) {
  const live = createLiveRefreshController({
    onRefresh: onChange,
    hasRealtime: true,
  });
  const channel = createPostgresChannel("native-project:" + project)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "projects",
        filter: "id=eq." + project,
      },
      live.schedule,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: "linked_project_id=eq." + project,
      },
      live.schedule,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_groups",
        filter: "project_id=eq." + project,
      },
      live.schedule,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_offices",
        filter: "project_id=eq." + project,
      },
      live.schedule,
    )
    .subscribe(live.onChannelStatus);
  return () => {
    live.dispose();
    void supabase.removeChannel(channel);
  };
}
