import type { AppRoute, PrimaryTab, RouteName } from "../../shared/routes";
import type { WorkspaceSnapshot } from "../../../core/web/app/features/workspaces/types";
import { isMobileRole } from "../../shared/mobileRoles";
import {
  accountingView,
  officeFinanceRoutes,
} from "../budget/mobileFinanceScope";
import {
  canOpenNativeSection,
  nativeImplementedSections,
} from "./nativeNavigation";

export const primaryTabs = (role: string): PrimaryTab[] =>
  !isMobileRole(role)
    ? []
    : role === "accounting_staff"
      ? ["home", "work", "accounting", "inbox", "more"]
      : ["home", "work", "projects", "inbox", "more"];
export const tabLabels: Record<PrimaryTab, string> = {
  home: "Home",
  work: "My Work",
  inbox: "Inbox",
  accounting: "Accounting",
  projects: "Projects",
  more: "More",
};
export const tabRoots: Record<PrimaryTab, RouteName> = {
  home: "overview",
  work: "personal_work",
  inbox: "inbox",
  accounting: "accounting_overview",
  projects: "projects",
  more: "profile",
};
export const defaultTab = (): PrimaryTab => "home";
export const webOnly: Partial<Record<RouteName, string>> = {
  identity: "Head Office identity and access",
  intelligence: "Team intelligence",
  performance: "Performance reports",
  office_team: "Office Team on eFlow Web",
  accounting_journal: "Journal authoring",
  accounting_audit: "Financial audit explorer",
  users: "Account management",
  org_tree: "Organization administration",
  permissions: "Role defaults",
  audit: "System audit",
  administration: "System administration",
  migration: "Migration administration",
};
const admin = new Set<RouteName>([
  "users",
  "org_tree",
  "permissions",
  "audit",
  "administration",
  "migration",
]);
const deferred = new Set<RouteName>([
  "live",
  "help",
  "invitation",
  "activation",
]);
const knownRoutes = new Set([
  ...nativeImplementedSections,
  ...admin,
  ...deferred,
]);
const advancedProject = new Set([
  "analytics",
  "gantt",
  "milestones",
  "sharing",
  "settings",
  "import",
  "funding_configuration",
  "people_management",
  "file_management",
]);
export type MobileDestination = {
  route: AppRoute;
  tab: PrimaryTab;
  disposition: "native" | "web" | "unavailable" | "denied";
  title: string;
  reason?: string;
};
export function resolveMobileRoute(
  input: AppRoute,
  role: string,
  can: (key: string) => boolean,
  origin?: PrimaryTab,
): MobileDestination {
  const route = { ...input };
  if (route.name === "reviews") route.view = route.view || "decisions";
  if (route.name === "notifications" || route.name === "reviews")
    route.name = "inbox";
  if (route.name === "team") route.name = "office_team";
  if (route.name === "settings" && route.view === "profile") {
    route.name = "profile";
    delete route.view;
  }
  if (route.name === "tasks") route.name = "personal_work";
  if (route.name === "deadlines") {
    route.name = "personal_work";
    route.view = "deadlines";
  }
  if (route.name === "accounting_budgets" && !route.view)
    route.name = "accounting_overview";
  let tab: PrimaryTab =
    input.originTab ||
    origin ||
    (["project", "personal_project", "projects"].includes(route.name)
      ? role === "accounting_staff"
        ? "more"
        : "projects"
      : route.name === "task"
        ? "work"
        : route.name === "overview"
          ? "home"
          : [
                "personal_work",
                "subtasks",
                "history",
                "deadlines",
                "tasks",
              ].includes(route.name)
            ? "work"
            : route.name === "inbox" || route.name === "financial_reviews"
              ? "inbox"
              : route.name.startsWith("accounting_")
                ? "accounting"
                : "more");
  if (!primaryTabs(role).includes(tab))
    tab =
      tab === "projects" && role === "accounting_staff" ? "more" : defaultTab();
  const title =
    webOnly[route.name] ||
    route.title ||
    (
      {
        overview: "Home",
        personal_work: "My Work",
        projects: "Projects",
        project: "Project",
        personal_project: "Personal project",
        task: "Task",
        inbox: "Inbox",
        office_team: "Office Team",
        accounting_overview: "Accounting",
        accounting_releases: "Releases",
        profile: "Profile",
        settings: "Account & settings",
        messages: "Messages",
        announcements: "Announcements",
        financial_reviews: "Financial review",
        budget: "Office Budget",
        reports: "Office Analytics",
      } as Partial<Record<RouteName, string>>
    )[route.name] ||
    "Work details";
  const result = { route: { ...route, originTab: tab }, tab, title };
  if (!knownRoutes.has(route.name))
    return {
      ...result,
      disposition: "unavailable",
      reason:
        "This link is not supported in this mobile release. Open a destination from the tabs or More.",
    };
  if (!isMobileRole(role) || admin.has(route.name))
    return {
      ...result,
      disposition: "denied",
      reason:
        "This destination is available to authorized administrators in eFlow Web only.",
    };
  if (!canOpenNativeSection(role, route.name, can))
    return {
      ...result,
      disposition: "denied",
      reason: "Your current account permissions do not allow this destination.",
    };
  const financeView = officeFinanceRoutes.includes(route.name)
    ? accountingView(
        route.view ??
          (route.name === "accounting_releases" ? "requests" : undefined),
      )
    : undefined;
  if (
    (financeView === "requests" &&
      (role !== "accounting_staff" ||
        !can("navigation.accounting_releases"))) ||
    (financeView === "overview" &&
      role !== "accounting_staff" &&
      !(role === "head" && route.name === "budget"))
  )
    return {
      ...result,
      disposition: "denied",
      reason:
        "Open an authorized cash request from its work item or Inbox update.",
    };
  if (
    webOnly[route.name] ||
    (route.name === "reports" && (role !== "head" || route.view === "web")) ||
    (route.name === "project" && advancedProject.has(route.view || "")) ||
    (route.name === "task" &&
      ["planning", "funding_configuration", "file_management"].includes(
        route.view || "",
      )) ||
    (route.name === "personal_project" &&
      ["planning", "access_management", "closeout", "file_management"].includes(
        route.view || "",
      )) ||
    (officeFinanceRoutes.includes(route.name) && !accountingView(route.view))
  )
    return {
      ...result,
      disposition: "web",
      reason:
        "This workspace is managed in eFlow Web. Your permissions and original destination still apply.",
    };
  if (deferred.has(route.name))
    return {
      ...result,
      disposition: "unavailable",
      reason:
        route.name === "help" || route.name === "live"
          ? "AI Help and Live are not available in this mobile release."
          : "Open the original secure account link to continue.",
    };
  if (["project", "personal_project", "task"].includes(route.name) && !route.id)
    return {
      ...result,
      disposition: "unavailable",
      reason:
        "This link does not identify a work item. Open it from Projects or My Work.",
    };
  return { ...result, disposition: "native" };
}

/** An authorized workspace selection never imports the previous workspace's records. */
export function routeFitsWorkspace(
  route: AppRoute,
  snapshot?: WorkspaceSnapshot,
): boolean {
  if (!["project", "personal_project", "task"].includes(route.name))
    return true;
  if (!snapshot) return false;
  if (route.workspaceId && route.workspaceId !== snapshot.workspace.id)
    return false;
  if (route.workspaceKind && route.workspaceKind !== snapshot.workspace.kind)
    return false;
  if (
    route.name === "personal_project" &&
    snapshot.workspace.kind !== "personal" &&
    !snapshot.projects.some(
      (project) =>
        project.id === route.id &&
        project.kind === "personal" &&
        project.shortcut === true,
    )
  )
    return false;
  if (route.name === "task" && snapshot.workspace.kind !== "office")
    return false;
  const projectId = route.name === "task" ? route.projectId : route.id;
  return (
    !projectId || snapshot.projects.some((project) => project.id === projectId)
  );
}

export function bindWorkspace(
  route: AppRoute,
  snapshot?: WorkspaceSnapshot,
): AppRoute {
  return ["project", "personal_project", "task"].includes(route.name) &&
    snapshot &&
    routeFitsWorkspace(route, snapshot)
    ? {
        ...route,
        workspaceId: route.workspaceId || snapshot.workspace.id,
        workspaceKind: route.workspaceKind || snapshot.workspace.kind,
      }
    : route;
}

export function readMobileLocation(
  state: any,
): { tab: PrimaryTab; route?: AppRoute } | undefined {
  if (!state?.routes?.length) return;
  const active = state.routes[state.index ?? 0];
  if (!Object.prototype.hasOwnProperty.call(tabLabels, active.name)) return;
  let child = active;
  while (child.state?.routes?.length)
    child = child.state.routes[child.state.index ?? 0];
  return {
    tab: active.name,
    route:
      child.name === "Destination" && child.params?.name
        ? child.params
        : undefined,
  };
}
