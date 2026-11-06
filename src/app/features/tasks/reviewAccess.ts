import { canUserReviewTask } from "../../../core/web/app/features/reviews/selectors";
import type { ReviewSubmission } from "../../../core/web/app/features/reviews/types";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";

export function independentReviewAllowed(
  task: Task,
  submission: ReviewSubmission | undefined,
  actor?: string,
  role?: string,
) {
  return (
    !!actor &&
    !!submission?.submitterId &&
    submission.submitterId !== actor &&
    submission.taskId === task.id &&
    submission.status === "pending" &&
    (!task.latestSubmission?.id ||
      task.latestSubmission.id === submission.id) &&
    !task.archivedAt &&
    task.status === "for_review" &&
    canUserReviewTask(task, actor, role)
  );
}
