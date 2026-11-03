import {StyleSheet} from "react-native";
import {Pressable,View} from '../../components/ui/Primitives';
import BriefcaseBusiness from "lucide-react-native/icons/briefcase-business";
import Building2 from "lucide-react-native/icons/building-complex";
import Inbox from "lucide-react-native/icons/inbox";
import Wallet from "lucide-react-native/icons/wallet";
import Menu from "lucide-react-native/icons/menu";
import { isMobileRole } from "../../shared/mobileRoles";
import { Text } from "../../components/ui/Typography";
import { colors } from "../../components/ui";
import type { Navigate, RouteName } from "../../shared/routes";
import { canOpenNativeSection } from "./nativeNavigation";
export function NativeBottomNavigation({
  role,
  can,
  current,
  navigate,
  onMore,
  projectContext = false,
}: {
  role: string;
  can: (key: string) => boolean;
  current: RouteName;
  navigate: Navigate;
  onMore: () => void;
  projectContext?: boolean;
}) {
  const workspaces =
    [
      "overview",
      "projects",
      "project",
      "personal_project",
      "budget",
      "team",
      "office_team",
      "identity",
      "intelligence",
    ].includes(current) ||
    (current === "task" && projectContext) ||
    (role === "head" && ["tasks", "reports"].includes(current));
  const items = [
    ...[
      {
        label: "My Work",
        id: "personal_work" as RouteName,
        Icon: BriefcaseBusiness,
        selected:
          !workspaces &&
          !["inbox", "notifications", "profile", "settings"].includes(
            current,
          ) &&
          !current.startsWith("accounting_"),
      },
      {
        label: "Workspaces",
        id: "projects" as RouteName,
        Icon: Building2,
        selected: workspaces,
      },
    ],
    {
      label: "Inbox",
      id: "inbox" as RouteName,
      Icon: Inbox,
      selected: ["inbox", "notifications"].includes(current),
    },
    {
      label: "Accounting",
      id: "accounting_overview" as RouteName,
      Icon: Wallet,
      selected: current.startsWith("accounting_"),
    },
  ].filter((item) => canOpenNativeSection(role, item.id, can));
  if (!isMobileRole(role)) return null;
  return (
    <View style={s.bar}>
      {items.map(({ id, label, Icon, selected }) => (
        <Pressable
          key={id}
          accessibilityRole="tab"
          aria-selected={selected}
          accessibilityLabel={label}
          accessibilityState={{ selected }}
          onPress={() => navigate({ name: id })}
          style={[s.tab, selected && s.selected]}
        >
          <Icon size={22} color={selected ? colors.primary : colors.muted} />
          <Text
            numberOfLines={1}
            style={[s.label, selected && { color: colors.primary }]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More navigation"
        onPress={onMore}
        style={s.tab}
      >
        <Menu size={22} color={colors.muted} />
        <Text style={s.label}>More</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    paddingTop: 5,
    paddingBottom: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 8,
  },
  selected: { backgroundColor: "#d8efed" },
  label: { fontSize: 11, color: colors.muted, fontWeight: "500" },
});
