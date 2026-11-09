import { useState } from "react";
import { Pressable, View } from "react-native";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Wallet from "lucide-react-native/icons/wallet";
import Megaphone from "lucide-react-native/icons/megaphone";
import Settings from "lucide-react-native/icons/settings";
import LogOut from "lucide-react-native/icons/log-out";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Screen, ErrorState, Button } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import { useConversationDirectory } from "../communication";
import type { Navigate, AppRoute } from "../../shared/routes";
import { canOpenNativeSection } from "./nativeNavigation";

export function MoreScreen({ navigate }: { navigate: Navigate }) {
  const { profile, can, signOut } = useAuth(),
    palette = useTheme(),
    [error, setError] = useState<Error>(),
    [busy, setBusy] = useState(false);
  const chats = useConversationDirectory(profile?.id || "");
  const unreadMessages =
    !chats.error && chats.data?.some((chat) => chat.unread);

  const entries: {
    title: string;
    subtitle: string;
    route: AppRoute;
    Icon: typeof Settings;
    tileBg: string;
    tileColor: string;
  }[] = [
    {
      title: "Messages",
      subtitle: "Team chat & direct conversations",
      route: { name: "messages" },
      Icon: MessageCircle,
      tileBg: palette.blueSoft,
      tileColor: palette.blue,
    },
    {
      title: "Announcements",
      subtitle: "Official notices and Office broadcasts",
      route: { name: "announcements" },
      Icon: Megaphone,
      tileBg: palette.blueSoft,
      tileColor: palette.blue,
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
            tileBg: palette.primarySoft,
            tileColor: palette.primary,
          },
        ]
      : []),
    {
      title: "Account & settings",
      subtitle: "Security, appearance & workspace preferences",
      route: { name: "settings" },
      Icon: Settings,
      tileBg: palette.primarySoft,
      tileColor: palette.primary,
    },
  ];

  return (
    <Screen compact style={{ gap: 16 }}>
      {/* Header (Monday.com Image 4) */}
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

      {/* Monday-style List of Separate Rounded Cards (Image 4) */}
      <View style={{ gap: 12 }}>
        {entries
          .filter((entry) =>
            canOpenNativeSection(profile?.role || "", entry.route.name, can),
          )
          .map(({ title, subtitle, route, Icon, tileBg, tileColor }) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel={
                route.name === "messages" && unreadMessages
                  ? "Messages, unread"
                  : title
              }
              onPress={() => navigate(route)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 16,
                backgroundColor: pressed
                  ? palette.primarySoft
                  : palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                gap: 14,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: tileBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={22} color={tileColor} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: palette.text,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.mutedLabel,
                    lineHeight: 16,
                  }}
                >
                  {subtitle}
                </Text>
              </View>
              {route.name === "messages" && unreadMessages && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: palette.primary,
                  }}
                />
              )}
              <ChevronRight size={18} color={palette.mutedLabel} />
            </Pressable>
          ))}
      </View>

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
