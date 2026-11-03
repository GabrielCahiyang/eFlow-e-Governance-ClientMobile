import type { RouteName } from "../../shared/routes";
import Building from "lucide-react-native/icons/building-complex";
import Briefcase from "lucide-react-native/icons/briefcase-business";
import Folder from "lucide-react-native/icons/folder";
import Gauge from "lucide-react-native/icons/gauge";
import ListChecks from "lucide-react-native/icons/list-checks";
import Wallet from "lucide-react-native/icons/wallet";
import Inbox from "lucide-react-native/icons/inbox";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Users from "lucide-react-native/icons/users";
import Contact from "lucide-react-native/icons/contact";
import User from "lucide-react-native/icons/user-round";
import Settings from "lucide-react-native/icons/settings";
import Chart from "lucide-react-native/icons/chart-no-axes-combined";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import Calendar from "lucide-react-native/icons/calendar-clock";
import Audio from "lucide-react-native/icons/audio-lines";
import Shield from "lucide-react-native/icons/shield";
import FileText from "lucide-react-native/icons/file-text";
export function NativeDestinationIcon({
  name,
  color,
  size = 19,
}: {
  name: RouteName;
  color: string;
  size?: number;
}) {
  const Icon =
    name === "overview"
      ? Gauge
      : name === "personal_work"
        ? Briefcase
        : name === "projects" ||
            name === "project" ||
            name === "personal_project"
          ? Folder
          : name === "tasks" || name === "subtasks"
            ? ListChecks
            : name === "reviews"
              ? ClipboardCheck
              : name === "inbox" || name === "notifications"
                ? Inbox
                : name === "office_team"
                  ? Contact
                  : name === "team"
                    ? Users
                    : name === "profile"
                      ? User
                      : name === "settings"
                        ? Settings
                        : name === "deadlines"
                          ? Calendar
                          : name === "history" || name === "accounting_audit"
                            ? History
                            : name === "reports" ||
                                name === "intelligence" ||
                                name === "performance"
                              ? Chart
                              : name === "help" || name === "live"
                                ? Audio
                                : name === "users" ||
                                    name === "permissions" ||
                                    name === "identity"
                                  ? Shield
                                  : name === "accounting_journal"
                                    ? FileText
                                    : name === "budget" ||
                                        name.startsWith("accounting_")
                                      ? Wallet
                                      : Building;
  return <Icon size={size} color={color} />;
}
