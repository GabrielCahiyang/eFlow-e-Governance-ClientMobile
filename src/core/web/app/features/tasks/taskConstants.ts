import type { TaskStatus } from "./taskTypes";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending_assignment: 'Pending Assignment',
  todo: 'To Do',
  in_progress: 'In Progress',
  for_review: 'For Review',
  changes_requested: 'Changes Requested',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// â”€â”€â”€ Local listener system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
