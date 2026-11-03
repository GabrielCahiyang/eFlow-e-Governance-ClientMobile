export interface ReviewAttachment {
  id: string;
  submissionId?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
}

export type SubmissionDecision = "pending" | "approved" | "changes_requested";

export interface ReviewSubmission {
  id: string;
  taskId: string;
  version: number;
  submitterId: string;
  submitterName: string;
  note: string;
  status: SubmissionDecision;
  decidedBy?: string;
  decidedByName?: string;
  decisionFeedback?: string;
  decidedAt?: number;
  submittedAt: number;
}

export interface TaskSubtaskReviewEvidence {
  subtask: Subtask;
  progressUpdates: SubtaskProgressUpdate[];
  submissions: SubtaskSubmission[];
}
import type {
  Subtask,
  SubtaskProgressUpdate,
  SubtaskSubmission,
} from "../subtasks";
