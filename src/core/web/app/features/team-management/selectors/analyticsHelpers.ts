import type { Task } from "../../tasks";
import type { WorkflowProgressFact, WorkflowSubmissionFact } from "../types";

export const DAY = 86_400_000;

export function taskParticipantIds(task: Task): string[] {
  return Array.from(new Set([task.assigneeId, ...(task.teamMemberIds || [])].filter((value): value is string => Boolean(value))));
}

export function latestProgressByWorkItem(progress: WorkflowProgressFact[]): Map<string, WorkflowProgressFact> {
  const map = new Map<string, WorkflowProgressFact>();
  progress.forEach((entry) => {
    const key = entry.kind === "subtask" ? `subtask:${entry.subtaskId}` : `task:${entry.taskId}`;
    if (!map.has(key)) map.set(key, entry);
  });
  return map;
}

export const hasBlocker = (progress?: WorkflowProgressFact) => Boolean(
  progress?.blocker?.trim()
  && progress.blockerCategory
  && progress.blockerCategory.toLowerCase() !== "none",
);

export const submissionWorkKey = (submission: WorkflowSubmissionFact) =>
  `${submission.kind}:${submission.kind === "subtask" ? submission.subtaskId : submission.taskId}`;

export function deliveryQuality(submissions: WorkflowSubmissionFact[], employeeId: string) {
  const own = submissions.filter((submission) => submission.submitterId === employeeId);
  const byWork = new Map<string, WorkflowSubmissionFact[]>();
  own.forEach((submission) => {
    const key = submissionWorkKey(submission);
    byWork.set(key, [...(byWork.get(key) || []), submission]);
  });
  const approvedWork = Array.from(byWork.values()).filter((attempts) => attempts.some((attempt) => attempt.status === "approved"));
  const firstPass = approvedWork.filter((attempts) => attempts.some((attempt) => attempt.version === 1 && attempt.status === "approved")).length;
  const decided = own.filter((submission) => submission.decidedAt && submission.decidedAt >= submission.submittedAt);
  const reviewHours = decided.length
    ? decided.reduce((sum, submission) => sum + ((submission.decidedAt || submission.submittedAt) - submission.submittedAt) / 3_600_000, 0) / decided.length
    : null;
  return {
    firstPassRate: approvedWork.length ? Math.round((firstPass / approvedWork.length) * 100) : null,
    revisionRequests: own.filter((submission) => submission.status === "changes_requested").length,
    averageReviewHours: reviewHours == null ? null : Math.round(reviewHours * 10) / 10,
  };
}

