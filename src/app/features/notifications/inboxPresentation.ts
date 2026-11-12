import type { AppRoute } from "../../shared/routes";

export function workUpdateTitle(title: string) {
  return title.replace(/^Subitem\b/i, "Subtask");
}

function workUpdateCopy(message: string) {
  return message
    .replace(/^(.*?\bcompleted )subitem(?= ["“])/i, "$1subtask")
    .replace(/(^|[.\n]\s*)Completed subitem\./i, "$1Completed subtask.");
}

export function inboxUpdateMessage(message: string, reason?: string) {
  const body = message.trim();
  const detail = reason?.trim();
  const comparable = (value: string) => value.replace(/\s+/g, " ").trim();
  const full = detail && !comparable(body).includes(comparable(detail))
    ? [body, detail].filter(Boolean).join("\n")
    : body;
  return workUpdateCopy(full);
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
  if (route.name === "messages") return route.recordId ? "View mentioned message" : "View conversation";
  if (route.name === "performance" || route.name === "intelligence")
    return "View report";
  return "View record";
}
