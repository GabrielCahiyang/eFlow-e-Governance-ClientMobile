import type { RouteName } from "../../shared/routes";
import { sourceNavigation } from "./sourceNavigation";
import { canOpenNavigationSection } from "../../../core/web/app/features/navigation/navigationPermissions";
import { isMobileRole } from "../../shared/mobileRoles";
const webOnlySections = new Set<RouteName>([
  "users",
  "permissions",
  "org_tree",
  "audit",
  "administration",
  "migration",
]);
export type NativeDestination = { id: RouteName; label: string; group: string };
const nativeSection = (section: string): RouteName =>
  section === "dashboard" ? "overview" : (section as RouteName);
const sourceSection = (section: RouteName) =>
  section === "overview"
    ? "dashboard"
    : section === "project" || section === "personal_project"
      ? "projects"
      : section === "task"
        ? "tasks"
        : section === "office_team"
          ? "team"
          : section;
export function canOpenNativeSection(
  role: string,
  section: RouteName,
  can: (permission: string) => boolean,
  hasLeadingWork = false,
) {
  if (!isMobileRole(role) || webOnlySections.has(section)) return false;
  return [
    "profile",
    "notifications",
    "messages",
    "help",
    "live",
    "financial_reviews",
  ].includes(section)
    ? true
    : canOpenNavigationSection(
        role,
        sourceSection(section),
        can,
        hasLeadingWork && section === "reviews",
      );
}
export function nativeDestinations(
  role: string,
  can: (permission: string) => boolean,
  hasLeadingWork = false,
): NativeDestination[] {
  if (!isMobileRole(role)) return [];
  const source = sourceNavigation[role as keyof typeof sourceNavigation];
  if (!source) return [];
  const rows: readonly {
    id: string;
    label: string;
    group: string;
    requiresLeadership?: boolean;
    requiresHead?: boolean;
  }[] = source.navItems;
  const base: NativeDestination[] = rows
    .filter(
      (item) =>
        (!item.requiresHead || role === "head") &&
        (!item.requiresLeadership || hasLeadingWork),
    )
    .map((item) => ({
      id: nativeSection(item.id),
      label: item.label,
      group: item.group,
    }));
  if (role !== "admin" && !base.some((item) => item.id === "personal_work"))
    base.unshift({ id: "personal_work", label: "My Work", group: "Personal" });
  if (role !== "admin" && !base.some((item) => item.id === "overview"))
    base.unshift({
      id: "overview",
      label: "Workspace Overview",
      group: "Office",
    });
  base.push(
    { id: "messages", label: "Messages & calls", group: "Communication" },
    { id: "inbox", label: "Inbox", group: "Personal" },
    { id: "profile", label: "Profile", group: "Account" },
    { id: "settings", label: "Settings", group: "Account" },
    { id: "help", label: "Talk to eFlow AI", group: "Help" },
  );
  if (role === "head")
    base.push({
      id: "office_team",
      label: "Office Team · Account members",
      group: "People",
    });
  const allowed = base.filter((item) =>
    canOpenNativeSection(role, item.id, can, hasLeadingWork),
  );
  const preferred = allowed.some((item) => item.id === "team")
    ? "team"
    : "intelligence";
  return allowed
    .filter(
      (item) =>
        !["team", "intelligence"].includes(item.id) || item.id === preferred,
    )
    .map((item) =>
      item.id === preferred ? { ...item, label: "Analytics" } : item,
    );
}
export const nativeImplementedSections = new Set<RouteName>([
  "messages",
  "announcements",
  "team",
  "identity",
  "intelligence",
  "performance",
  "settings",
  "subtasks",
  "overview",
  "projects",
  "project",
  "personal_project",
  "tasks",
  "task",
  "personal_work",
  "budget",
  "financial_reviews",
  "accounting_overview",
  "accounting_releases",
  "accounting_journal",
  "accounting_audit",
  "accounting_budgets",
  "profile",
  "office_team",
  "inbox",
  "notifications",
  "help",
  "reviews",
  "deadlines",
  "history",
  "reports",
]);
export function nativeDefaultSection(role: string): RouteName {
  return isMobileRole(role) ? "overview" : "profile";
}
