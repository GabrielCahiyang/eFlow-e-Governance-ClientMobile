// Type declarations extracted from the web presentation module.

import type { Task } from "../../../services/taskService";
import type { ReviewAttachment, ReviewSubmission } from "../types";
export interface TaskReviewPanelProps {
    task: Task;
    onDone?: () => void;
    compact?: boolean;
    canReview?: boolean;
    showDecision?: boolean;
}