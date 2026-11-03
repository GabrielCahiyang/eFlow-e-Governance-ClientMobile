import { supabase } from "../../../../lib/supabase";

let maintenancePromise: Promise<void> | null = null;

export function runTaskMaintenance(): Promise<void> {
  if (maintenancePromise) return maintenancePromise;
  maintenancePromise = Promise.all([
    supabase.rpc("dispatch_task_reminders"),
    supabase.rpc("materialize_due_task_templates"),
  ])
    .then((results) => {
      const failure = results.find((result) => result.error);
      if (failure?.error) throw new Error(failure.error.message);
    })
    .finally(() => { maintenancePromise = null; });
  return maintenancePromise;
}
