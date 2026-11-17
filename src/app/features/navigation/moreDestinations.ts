import MessageCircle from "lucide-react-native/icons/message-circle";
import Wallet from "lucide-react-native/icons/wallet";
import PiggyBank from "lucide-react-native/icons/piggy-bank";
import ChartColumn from "lucide-react-native/icons/chart-column";
import Settings from "lucide-react-native/icons/settings";
import Folder from "lucide-react-native/icons/folder";
import type { AppRoute } from "../../shared/routes";
import { canOpenNativeSection } from "./nativeNavigation";

export type MoreDestination = {
  id: string;
  label: string;
  Icon: typeof Settings;
  route: AppRoute;
};

const all: (MoreDestination & {
  roles?: string[];
  needsOffice?: boolean;
})[] = [
  { id: "messages", label: "Messages", Icon: MessageCircle, route: { name: "messages" } },
  {
    id: "projects",
    label: "Projects",
    Icon: Folder,
    route: { name: "projects" },
    roles: ["accounting_staff"],
  },
  {
    id: "petty_cash",
    label: "Petty cash",
    Icon: Wallet,
    route: { name: "financial_reviews", recordType: "office_petty_cash" },
    needsOffice: true,
  },
  { id: "budget", label: "Budget", Icon: PiggyBank, route: { name: "budget" }, roles: ["head"] },
  { id: "reports", label: "Reports", Icon: ChartColumn, route: { name: "reports" }, roles: ["head"] },
  { id: "settings", label: "Settings", Icon: Settings, route: { name: "settings" } },
];

/**
 * Extra destinations for the More sheet, filtered by the same native section
 * rules as navigation. Showing an item never grants access; each screen
 * still checks the server. At most 7, leaving the 8th cell for Sign out.
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
    .slice(0, 7)
    .map(({ id, label, Icon, route }) => ({ id, label, Icon, route }));
}
