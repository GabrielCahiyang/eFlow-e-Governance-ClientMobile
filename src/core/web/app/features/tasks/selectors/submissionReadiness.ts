import type { Task } from "../taskTypes";

export interface SubtaskReadinessRecord {
  isCompleted?: boolean;
  status?: string;
}

export interface TaskSubmissionReadiness {
  ready: boolean;
  totalSubtasks: number;
  approvedSubtasks: number;
  remainingSubtasks: number;
  awaitingReviewSubtasks: number;
}

/**
 * Parent work is review-ready only after every subtask has passed its own
 * Team Leader review. A subtask at 100% or `for_review` is intentionally not
 * counted as approved until its workflow status becomes `completed`.
 */
export function getTaskSubmissionReadiness(
  task: Pick<Task, "subtaskCount" | "subtaskCompletedCount">,
  liveSubtasks: SubtaskReadinessRecord[] = [],
): TaskSubmissionReadiness {
  const hasLiveRows = liveSubtasks.length > 0;
  const totalSubtasks = hasLiveRows
    ? liveSubtasks.length
    : Math.max(0, Number(task.subtaskCount || 0));
  const approvedSubtasks = Math.min(
    totalSubtasks,
    hasLiveRows
      ? liveSubtasks.filter(
          (subtask) => subtask.isCompleted || subtask.status === "completed",
        ).length
      : Math.max(0, Number(task.subtaskCompletedCount || 0)),
  );
  const awaitingReviewSubtasks = hasLiveRows
    ? liveSubtasks.filter(
        (subtask) =>
          !subtask.isCompleted && subtask.status === "for_review",
      ).length
    : 0;
  const remainingSubtasks = Math.max(0, totalSubtasks - approvedSubtasks);

  return {
    ready: remainingSubtasks === 0,
    totalSubtasks,
    approvedSubtasks,
    remainingSubtasks,
    awaitingReviewSubtasks,
  };
}
