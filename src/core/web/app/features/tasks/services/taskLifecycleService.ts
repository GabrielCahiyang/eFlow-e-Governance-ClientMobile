import { supabase } from "../../../../lib/supabase";

export async function cancelTask(taskId: string, reason: string): Promise<void> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new Error("A cancellation reason is required.");

  const { error } = await supabase.rpc("cancel_task", {
    p_task_id: taskId,
    p_reason: normalizedReason,
  });
  if (error) throw new Error(error.message);
}
