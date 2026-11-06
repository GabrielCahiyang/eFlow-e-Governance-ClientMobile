import type { AppRoute } from "../../shared/routes";
import type { Notification } from "../../../core/web/app/services/notificationService";
import { resolveNotificationDestination } from "../../../core/web/app/features/notifications/navigation";
import { isMobileRole } from "../../shared/mobileRoles";

export function inboxUpdateRoute(
  item: Notification,
  role: string,
): AppRoute | undefined {
  if (!isMobileRole(role)) return;
  const resolved =
    resolveNotificationDestination(item, role) ||
    (role === "accounting_staff"
      ? resolveNotificationDestination(item, "member")
      : null);
  if (
    item.financialRecordType === "independent_liquidation_review" &&
    item.financialRecordId
  )
    return { name: "financial_reviews", id: item.financialRecordId };
  const kind = resolved?.intent.kind;
  if (kind === "announcement") return { name: "announcements" };
  if (kind === "team_intelligence")
    return { name: role === "head" ? "intelligence" : "performance" };
  if (kind === "budget" && item.taskId)
    return {
      name: "task",
      id: item.taskId,
      projectId: item.projectId,
      nodeId: item.workNodeId,
      view: "budget",
      recordId: item.financialRecordId,
      recordType: item.financialRecordType,
    };
  if (item.taskId) {
    // Old subitem notices do not have a reliable node identifier.
    const branch =
      item.workNodeId ||
      kind === "subtask" ||
      kind === "subtask_review" ||
      kind === "leading_task";
    return {
      name: "task",
      id: item.taskId,
      projectId: item.projectId,
      nodeId: item.workNodeId,
      view: branch ? "subitems" : kind === "task_review" ? "review" : "details",
    };
  }
  if (item.workNodeId) return;
  if (item.projectId) return { name: "project", id: item.projectId };
}
