import { useState } from "react";
import { View } from "react-native";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Wallet from "lucide-react-native/icons/wallet";
import Megaphone from "lucide-react-native/icons/megaphone";
import Settings from "lucide-react-native/icons/settings";
import LogOut from "lucide-react-native/icons/log-out";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Folder from "lucide-react-native/icons/folder";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { Screen, ErrorState, Button } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import { useConversationDirectory } from "../communication";
import type { Navigate, AppRoute } from "../../shared/routes";
import { canOpenNativeSection } from "./nativeNavigation";
import { useWorkspaceNavigation } from "../workspaces/WorkspaceNavigation";

export function MoreScreen({ navigate }: { navigate: Navigate }) {
  const { profile, can, signOut } = useAuth(),
    palette = useTheme(),
    [error, setError] = useState<Error>(),
    [busy, setBusy] = useState(false);
  const chats = useConversationDirectory(profile?.id || "");
  const { openFavorites } = useWorkspaceNavigation();
  const unreadMessages =
    !chats.error && chats.data?.some((chat) => chat.unread);

  const entries: {
    title: string;
    subtitle: string;
    route: AppRoute;
    Icon: typeof Settings;
    group: "Work" | "Communication" | "Account";
  }[] = [
    ...(profile?.role === "accounting_staff"
      ? [
          {
            title: "Projects",
            subtitle: "Browse projects in this workspace",
            route: { name: "projects" as const },
            Icon: Folder,
            group: "Work" as const,
          },
        ]
      : []),
    {
      title: "Reviews",
      subtitle: "Work and financial decisions assigned to you",
      route: { name: "inbox", view: "decisions", title: "Reviews" },
      Icon: ClipboardCheck,
      group: "Work",
    },
    {
      title: "Messages",
      subtitle: "Team and direct conversations",
      route: { name: "messages" },
      Icon: MessageCircle,
      group: "Communication",
    },
    {
      title: "Announcements",
      subtitle: "Official notices and Office broadcasts",
      route: { name: "announcements" },
      Icon: Megaphone,
      group: "Communication",
    },
    ...(profile?.org_id
      ? [
          {
            title: "Office petty cash",
            subtitle: "Separate Office fund and receipt requests",
            route: {
              name: "financial_reviews" as const,
              recordType: "office_petty_cash",
            },
            Icon: Wallet,
            group: "Work" as const,
          },
        ]
      : []),
    {
      title: "Account & settings",
      subtitle: "Profile, notifications, security and appearance",
      route: { name: "settings" },
      Icon: Settings,
      group: "Account",
    },
  ];

  return (
    <Screen compact style={{ gap: 16 }}>
      <View style={{ gap: 4, paddingTop: 4 }}>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 26,
            lineHeight: 32,
            fontWeight: "700",
            color: palette.text,
          }}
        >
          More
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: palette.text,
            marginTop: 4,
          }}
        >
          {profile?.full_name || "Your account"}
        </Text>
        <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
          {profile?.role === "accounting_staff"
            ? "Accounting Staff"
            : profile?.role === "head"
              ? "Head"
              : "Member"}
        </Text>
      </View>

      {(["Work", "Communication", "Account"] as const).map((group) => {
        const visible = entries.filter(
          (entry) =>
            entry.group === group &&
            canOpenNativeSection(profile?.role || "", entry.route.name, can),
        );
        return visible.length ? (
          <View key={group} style={{ gap: 4 }}>
            <Text
              accessibilityRole="header"
              style={{
                color: palette.mutedLabel,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {group}
            </Text>
            {visible.map(({ title, subtitle, route, Icon }) => {
              const unread = route.name === "messages" && unreadMessages;
              return (
                <NavigationRow
                  key={title}
                  title={title}
                  description={unread ? "Unread messages" : subtitle}
                  accessibilityHint={
                    unread ? "You have unread messages." : undefined
                  }
                  icon={<Icon size={20} color={palette.primary} />}
                  onPress={() => navigate(route)}
                />
              );
            })}
            {group === "Account" && (
              <NavigationRow
                title="Workspace favorites"
                onPress={openFavorites}
              />
            )}
          </View>
        ) : null;
      })}

      <Button
        variant="outline"
        busy={busy}
        icon={<LogOut size={18} color={palette.text} />}
        onPress={() => {
          setBusy(true);
          setError(undefined);
          void signOut()
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        Sign out
      </Button>

      {!!error && <ErrorState error={error} />}
    </Screen>
  );
}
