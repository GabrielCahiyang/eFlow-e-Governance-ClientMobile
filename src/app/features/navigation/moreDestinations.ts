import MessageCircle from "lucide-react-native/icons/message-circle";
import Banknote from "lucide-react-native/icons/banknote";
import Wallet from "lucide-react-native/icons/wallet";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import PiggyBank from "lucide-react-native/icons/piggy-bank";
import ChartColumn from "lucide-react-native/icons/chart-column";
import Folder from "lucide-react-native/icons/folder";
import Bell from "lucide-react-native/icons/bell";
import UserRound from "lucide-react-native/icons/user-round";
import KeyRound from "lucide-react-native/icons/key-round";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import type { AppRoute } from "../../shared/routes";
import { canOpenNativeSection } from "./nativeNavigation";

export type MoreGroup = "Work" | "Communication" | "Account";

export type MoreTone = "navy" | "blue" | "green" | "warning" | "review";

export type MoreDestination = {
  id: string;
  label: string;
  subtitle: string;
  group: MoreGroup;
  Icon: typeof Wallet;
  tone: MoreTone;
  pill?: string;
  route: AppRoute;
};

const all: (MoreDestination & {
  roles?: string[];
  needsOffice?: boolean;
})[] = [
  {
    id: "accounting_releases",
    label: "Office budget & releases",
    subtitle: "Cash requests, vouchers & Office summary",
    group: "Work",
    Icon: Wallet,
    tone: "navy",
    pill: "Finance",
    route: { name: "accounting_releases" },
    roles: ["accounting_staff"],
  },
  {
    id: "projects",
    label: "Projects",
    subtitle: "Browse your authorized projects",
    group: "Work",
    Icon: Folder,
    tone: "blue",
    pill: "Directory",
    route: { name: "projects" },
    roles: ["accounting_staff"],
  },
  {
    id: "petty_cash",
    label: "Office petty cash",
    subtitle: "Separate Office fund and receipt requests",
    group: "Work",
    Icon: Banknote,
    tone: "green",
    pill: "Fund",
    route: { name: "financial_reviews", recordType: "office_petty_cash" },
    needsOffice: true,
  },
  {
    id: "budget",
    label: "Office Budget",
    subtitle: "Approved allocations, requests & releases",
    group: "Work",
    Icon: PiggyBank,
    tone: "navy",
    pill: `FY ${getCurrentFiscalYear()}`,
    route: { name: "budget" },
    roles: ["head"],
  },
  {
    id: "reports",
    label: "Analytics",
    subtitle: "Office completion, workload & risk overview",
    group: "Work",
    Icon: ChartColumn,
    tone: "review",
    pill: "Insights",
    route: { name: "reports" },
    roles: ["head"],
  },
  {
    id: "reviews",
    label: "Assigned reviews",
    subtitle: "Work and financial checks assigned to you",
    group: "Work",
    Icon: ClipboardCheck,
    tone: "review",
    pill: "Tab 2",
    route: { name: "inbox", view: "decisions", title: "Reviews" },
    roles: ["member"],
  },
  {
    id: "messages",
    label: "Messages",
    subtitle: "Team & direct conversations",
    group: "Communication",
    Icon: MessageCircle,
    tone: "blue",
    route: { name: "messages" },
  },
  {
    id: "notifications",
    label: "Notifications",
    subtitle: "Task, project & workflow activity",
    group: "Communication",
    Icon: Bell,
    tone: "navy",
    route: { name: "inbox" },
  },
  {
    id: "profile",
    label: "Profile",
    subtitle: "Name, photo & account details",
    group: "Account",
    Icon: UserRound,
    tone: "navy",
    route: { name: "profile" },
  },
  {
    id: "security_settings",
    label: "Password & security",
    subtitle: "Verify current password & update login",
    group: "Account",
    Icon: KeyRound,
    tone: "green",
    route: { name: "settings", view: "security", title: "Security" },
  },
];

/**
 * Secondary destinations for the full-page More screen, filtered by native
 * section rules. Showing an entry never grants access; each screen enforces
 * its own server capabilities and workspace checks.
 */
export function moreDestinations(
  role: string,
  can: (permission: string) => boolean,
  hasOffice: boolean,
): MoreDestination[] {
  return all
    .filter(
      (item) =>
        (!item.roles || item.roles.includes(role)) &&
        (!item.needsOffice || hasOffice) &&
        canOpenNativeSection(role, item.route.name, can),
    )
    .map(({ id, label, subtitle, group, Icon, tone, pill, route }) => ({
      id,
      label,
      subtitle,
      group,
      Icon,
      tone,
      pill,
      route,
    }));
}
