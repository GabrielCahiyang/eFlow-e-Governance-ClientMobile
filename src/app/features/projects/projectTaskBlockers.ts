import { readAllRows } from "../../../core/web/app/shared/readAllRows";
import { supabase } from "../../../platform/supabase";

type TaskBlockerRow = {
  task_id: string;
  blocker: string | null;
};

/** Loads the latest active progress-update blocker per task ID (null when cleared). */
export async function fetchProjectTaskBlockers(taskIds: string[]) {
  const blockers = new Map<string, string | null>();
  if (!taskIds.length || typeof supabase?.from !== "function") return blockers;
  for (let index = 0; index < taskIds.length; index += 25) {
    const ids = taskIds.slice(index, index + 25);
    const rows = await readAllRows<TaskBlockerRow>((from, to) =>
      supabase
        .from("task_progress_updates")
        .select("task_id,blocker", { count: "exact" })
        .in("task_id", ids)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    );
    for (const row of rows) {
      if (blockers.has(row.task_id)) continue;
      blockers.set(row.task_id, row.blocker?.trim() || null);
    }
  }
  return blockers;
}
