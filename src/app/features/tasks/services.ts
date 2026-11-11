import { supabase } from "../../../platform/supabase";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { rowToTask } from "../../../core/web/app/features/tasks/services/taskMapper";
export async function fetchVisibleTasks(office?: string) {
  return (
    await readAllRows<Record<string, unknown>>((from, to) => {
      const query = supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .is("deleted_at", null);
      if (office) query.eq("org_id", office);
      return query
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to);
    })
  ).map(rowToTask);
}
