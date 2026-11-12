import type { AppRoute } from "../app/shared/routes";
const paths: Record<string, string> = {
  walkthrough: "/",
  identity: "identity-and-access",
  intelligence: "team-intelligence",
  reports: "reports",
  performance: "performance",
  office_team: "team-supervision",
  accounting_journal: "general-journal",
  accounting_audit: "financial-audit-trail",
  accounting_budgets: "office-budget-ledgers",
  budget: "office-budget",
  accounting_overview: "accounting-overview",
  accounting_releases: "voucher-cash-releases",
  project: "projects",
  projects: "projects",
  personal_project: "projects",
  task: "projects",
};
/** Only a configured HTTPS origin and known display parameters cross the handoff boundary. */
export function webHandoffUrl(
  route: AppRoute,
  configuredOrigin: string,
): string | undefined {
  try {
    const origin = new URL(configuredOrigin);
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      !["", "/"].includes(origin.pathname) ||
      !paths[route.name]
    )
      return;
    const fundingSetup = route.view === "funding_configuration";
    const taskOutsideProject =
      fundingSetup && route.name === "task" && !route.projectId;
    if (route.name === "walkthrough")
      return new URL("/", origin.origin).toString();
    const url = new URL(
      "/" + (taskOutsideProject ? paths.budget : paths[route.name]),
      origin.origin,
    );
    if (
      (route.name === "project" || route.name === "personal_project") &&
      route.id
    )
      url.searchParams.set("project", route.id);
    if (route.name === "task" && route.id) {
      if (route.projectId) url.searchParams.set("project", route.projectId);
      if (!fundingSetup) url.searchParams.set("task", route.id);
    }
    if (route.workspaceId) url.searchParams.set("workspace", route.workspaceId);
    if (route.name === "project" && route.id && route.view === "people_management")
      url.searchParams.set("people", "add");
    if (
      route.name === "budget" &&
      route.fiscalYear &&
      Number.isInteger(route.fiscalYear)
    )
      url.searchParams.set("fy", String(route.fiscalYear));
    const displayView =
      route.view === "people_management"
        ? "people"
        : [
              "planning",
              "access_management",
              "closeout",
              "file_management",
            ].includes(route.view || "")
          ? route.view === "planning" &&
            route.name === "task" &&
            route.projectId
            ? "plan"
            : undefined
          : route.view;
    const projectViews: Record<string, string> = {
      project_setup: "settings",
      task_templates: "settings",
      ai_draft: "settings",
      import: "tasks",
      audit_trail: "audit-trail",
      analysis: "analytics",
    };
    const view = route.name === "projects" && route.view === "project_setup" ? undefined
      : route.name === "project" && displayView
      ? projectViews[displayView] ?? displayView
      : displayView;
    if (view && !(route.name === "reports" && view === "web"))
      url.searchParams.set(
        "view",
        fundingSetup
          ? taskOutsideProject
            ? "funding"
            : "budget"
          : view,
      );
    return url.toString();
  } catch {
    return;
  }
}
