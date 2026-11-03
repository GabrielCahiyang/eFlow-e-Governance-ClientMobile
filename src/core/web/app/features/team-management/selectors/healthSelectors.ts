import type { Task } from "../../tasks";
import { isActive } from "../../tasks";
import type { TeamAttentionItem, TeamHealthSummary, TeamWorkflowFacts, WorkflowSubmissionFact } from "../types";
import { submissionWorkKey } from "./analyticsHelpers";

export function buildTeamHealthSummary(tasks: Task[], facts: TeamWorkflowFacts, attention: TeamAttentionItem[]): TeamHealthSummary {
  const activeTasks = tasks.filter(isActive);
  const activeSubtasks = facts.subtasks.filter((subtask) => subtask.status !== "completed" && activeTasks.some((task) => task.id === subtask.taskId));
  const approvedWork = new Map<string, WorkflowSubmissionFact[]>();
  facts.submissions.forEach((submission) => {
    const key = submissionWorkKey(submission);
    approvedWork.set(key, [...(approvedWork.get(key) || []), submission]);
  });
  const approvedAttempts = Array.from(approvedWork.values()).filter((attempts) => attempts.some((attempt) => attempt.status === "approved"));
  const firstPass = approvedAttempts.filter((attempts) => attempts.some((attempt) => attempt.version === 1 && attempt.status === "approved")).length;
  const decided = facts.submissions.filter((submission) => submission.decidedAt && submission.decidedAt >= submission.submittedAt);
  const averageReviewHours = decided.length
    ? Math.round((decided.reduce((sum, submission) => sum + ((submission.decidedAt || submission.submittedAt) - submission.submittedAt), 0) / decided.length / 3_600_000) * 10) / 10
    : null;
  const uniqueKind = (kind: TeamAttentionItem["kind"]) => new Set(attention.filter((item) => item.kind === kind).map((item) => `${item.taskId}:${item.subtaskId || "task"}`)).size;
  return {
    activeTasks: activeTasks.length,
    activeSubtasks: activeSubtasks.length,
    completedTasks: tasks.filter((task) => task.status === "completed" && !task.archivedAt).length,
    overdue: uniqueKind("overdue"),
    blocked: uniqueKind("blocked"),
    stalled: uniqueKind("stalled"),
    awaitingReview: uniqueKind("awaiting_review"),
    changesRequested: uniqueKind("changes_requested"),
    vagueSchedules: uniqueKind("vague_schedule"),
    firstPassApprovalRate: approvedAttempts.length ? Math.round((firstPass / approvedAttempts.length) * 100) : null,
    averageReviewHours,
  };
}

