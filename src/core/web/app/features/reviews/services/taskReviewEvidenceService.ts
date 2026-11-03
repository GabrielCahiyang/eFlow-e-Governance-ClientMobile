import {
  fetchSubtaskProgressUpdates,
  fetchSubtaskSubmissions,
  fetchTaskSubtasks,
} from "../../subtasks";
import type { TaskSubtaskReviewEvidence } from "../types";

export async function fetchTaskSubtaskReviewEvidence(
  taskId: string,
): Promise<TaskSubtaskReviewEvidence[]> {
  const subtasks = await fetchTaskSubtasks(taskId);

  return Promise.all(
    subtasks.map(async (subtask) => {
      const [progressUpdates, submissions] = await Promise.all([
        fetchSubtaskProgressUpdates(subtask.id),
        fetchSubtaskSubmissions(subtask.id),
      ]);

      return { subtask, progressUpdates, submissions };
    }),
  );
}
