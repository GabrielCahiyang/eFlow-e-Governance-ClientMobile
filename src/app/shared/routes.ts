export type RouteName =
  | "overview"
  | "personal_work"
  | "projects"
  | "project"
  | "task"
  | "tasks"
  | "subtasks"
  | "reviews"
  | "budget"
  | "financial_reviews"
  | "accounting_overview"
  | "accounting_releases"
  | "accounting_journal"
  | "accounting_audit"
  | "accounting_budgets"
  | "team"
  | "office_team"
  | "identity"
  | "intelligence"
  | "reports"
  | "deadlines"
  | "history"
  | "performance"
  | "announcements"
  | "inbox"
  | "notifications"
  | "messages"
  | "profile"
  | "settings"
  | "users"
  | "org_tree"
  | "permissions"
  | "audit"
  | "administration"
  | "migration"
  | "help"
  | "walkthrough"
  | "live"
  | "invitation"
  | "activation"
  | "personal_project";
export type PrimaryTab =
  "home" | "work" | "inbox" | "accounting" | "projects" | "more";
export interface AppRoute {
  name: RouteName;
  id?: string;
  projectId?: string;
  taskId?: string;
  nodeId?: string;
  recordId?: string;
  recordType?: string;
  financialOfficeId?: string;
  fiscalYear?: number;
  title?: string;
  view?: string;
  token?: string;
  originTab?: PrimaryTab;
  workspaceId?: string;
  workspaceKind?: "office" | "personal";
}
export type Navigate = (route: AppRoute) => void;
