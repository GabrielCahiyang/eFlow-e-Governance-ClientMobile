import { supabase } from "../../../../lib/supabase";
import type { TaskActor } from "../taskTypes";
import { notifyTaskListeners } from "./taskRealtimeService";

export const archiveTask = async (taskId: string, _actor?: TaskActor): Promise<void> => {
  const { error } = await supabase.rpc('set_task_archived', {
    p_task_id: taskId,
    p_archived: true,
  });
  if (error) throw new Error(error.message);

  await notifyTaskListeners();
};

export const unarchiveTask = async (taskId: string, _actor?: TaskActor): Promise<void> => {
  const { error } = await supabase.rpc('set_task_archived', {
    p_task_id: taskId,
    p_archived: false,
  });
  if (error) throw new Error(error.message);

  await notifyTaskListeners();
};
