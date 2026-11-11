import type { DepartmentReportRow } from "../../../core/web/app/features/reports/types";
import type {
  TeamAttentionItem,
  TeamWorkflowFacts,
} from "../../../core/web/app/features/team-management/types";
import type { AppRoute } from "../../shared/routes";

export function reportRecordRoute(
  row: DepartmentReportRow,
  facts?: TeamWorkflowFacts,
  attention: TeamAttentionItem[] = [],
): AppRoute | undefined {
  if (!row.taskId)
    return row.projectId ? { name: "project", id: row.projectId } : undefined;
  const key = row.id.slice(row.id.indexOf(":") + 1);
  const evidence =
    row.kind === "evidence"
      ? facts?.evidence.find((item) => item.id === key)
      : undefined;
  const submission = facts?.submissions.find(
    (item) =>
      item.taskId === row.taskId &&
      item.id === (row.kind === "reviews" ? key : evidence?.submissionId),
  );
  const nodeId =
    submission?.subtaskId ??
    (row.kind === "risks"
      ? attention.find((item) => item.id === key && item.taskId === row.taskId)
          ?.subtaskId
      : row.kind === "contributions" &&
          row.id.startsWith("subtask-contribution:")
        ? key.split(":")[0]
        : undefined);
  return {
    name: "task",
    id: row.taskId,
    projectId: row.projectId,
    nodeId,
    ...(nodeId
      ? { view: "subitems" }
      : submission
        ? { view: "review", recordId: submission.id }
        : {}),
  };
}
