import type { AppRoute } from "../../shared/routes";

export function inboxUpdateMessage(message: string, reason?: string) {
  const body = message.trim();
  const detail = reason?.trim();
  const comparable = (value: string) => value.replace(/\s+/g, " ").trim();
  return detail && !comparable(body).includes(comparable(detail))
    ? [body, detail].filter(Boolean).join("\n")
    : body;
}

export function inboxDestinationLabel(route?: AppRoute) {
  if (!route) return undefined;
  if (route.name === "task")
    return route.view === "budget"
      ? "View funding"
      : route.nodeId
        ? "View subtask"
        : route.view === "review"
          ? "View task review"
          : "View task";
  if (route.name === "project" || route.name === "personal_project")
    return route.nodeId ? "View subtask" : "View project";
  if (route.name === "financial_reviews") return "View financial record";
  if (route.name === "announcements") return "View announcement";
  if (route.name === "messages") return "View conversation";
  if (route.name === "performance" || route.name === "intelligence")
    return "View report";
  return "View record";
}
