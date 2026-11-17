import { useState } from "react";
import { Linking, Pressable } from "react-native";
import Briefcase from "lucide-react-native/icons/briefcase";
import LogOut from "lucide-react-native/icons/log-out";
import MessageSquare from "lucide-react-native/icons/message-square";
import Settings from "lucide-react-native/icons/settings";
import { Button, ErrorState, Screen } from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { getProfileAvatarUrl } from "../../../core/web/app/services/userSettingsService";
import type { Navigate } from "../../shared/routes";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { useConversationDirectory } from "../communication";
import { useInboxCounts } from "../notifications/inboxCountsContext";
import { moreDestinations } from "./moreDestinations";
import {
  MoreAppearanceRow,
  MoreDestinationRow,
  MoreIdentityHero,
  MoreSectionCard,
} from "./MoreSections";

export function MoreScreen({ navigate }: { navigate: Navigate }) {
  const { profile, organization, can, signOut } = useAuth();
  const palette = useTheme();
  const appearance = useAppearance();
  const [error, setError] = useState<Error>();
  const [busy, setBusy] = useState(false);

  const chats = useConversationDirectory(profile?.id || "");
  const inbox = useInboxCounts();
  const avatar = useFacts(
    "more-avatar:" + profile?.id + ":" + profile?.avatar_path,
    () => getProfileAvatarUrl(profile?.avatar_path),
    !!profile?.avatar_path,
  );

  const unreadChats = !chats.error
    ? (chats.data ?? []).filter((chat) => chat.unread && !chat.archived).length
    : 0;
  const unreadUpdates = inbox.data?.all ?? 0;
  const totalCommsUnread = unreadChats + unreadUpdates;

  const destinations = moreDestinations(
    profile?.role || "",
    can,
    !!profile?.org_id,
  );
  const workItems = destinations.filter((entry) => entry.group === "Work");
  const commItems = destinations.filter(
    (entry) => entry.group === "Communication",
  );
  const accountItems = destinations.filter((entry) => entry.group === "Account");

  const officeLabel =
    organization?.name ||
    (profile?.org_id ? "Authorized Office" : "Personal workspace");

  return (
    <Screen
      compact
      title="More"
      description="Workspace tools & account"
      style={{ gap: 14 }}
    >
      <MoreIdentityHero
        fullName={profile?.full_name}
        email={profile?.email}
        role={profile?.role}
        officeName={officeLabel}
        avatarUrl={avatar.data}
        onOpenProfile={() => navigate({ name: "profile" })}
      />

      {workItems.length > 0 && (
        <MoreSectionCard
          title="Work & Office"
          icon={<Briefcase size={16} color={palette.primary} />}
          badge={`${workItems.length} ${workItems.length === 1 ? "tool" : "tools"}`}
        >
          {workItems.map((item, index) => (
            <MoreDestinationRow
              key={item.id}
              item={item}
              divider={index < workItems.length - 1}
              onPress={() => navigate(item.route)}
            />
          ))}
        </MoreSectionCard>
      )}

      {commItems.length > 0 && (
        <MoreSectionCard
          title="Communication"
          icon={<MessageSquare size={16} color={palette.blue} />}
          badge={
            totalCommsUnread > 0 ? `${totalCommsUnread} unread` : "Caught up"
          }
          badgeTone={totalCommsUnread > 0 ? "info" : "neutral"}
        >
          {commItems.map((item, index) => {
            const isMessages = item.id === "messages";
            const isNotifications = item.id === "notifications";
            const badgeText =
              isMessages && unreadChats > 0
                ? `${unreadChats} unread`
                : isNotifications && unreadUpdates > 0
                  ? `${unreadUpdates} ${unreadUpdates === 1 ? "update" : "updates"}`
                  : undefined;

            return (
              <MoreDestinationRow
                key={item.id}
                item={item}
                pill={badgeText}
                pillTone={isMessages ? "blue" : "navy"}
                pillTestID={
                  isMessages && unreadChats > 0
                    ? "messages-unread-indicator"
                    : isNotifications && unreadUpdates > 0
                      ? "notifications-unread-indicator"
                      : undefined
                }
                subtitleOverride={
                  isMessages && unreadChats > 0
                    ? "Unread team & direct messages"
                    : undefined
                }
                divider={index < commItems.length - 1}
                onPress={() => navigate(item.route)}
              />
            );
          })}
        </MoreSectionCard>
      )}

      <MoreSectionCard
        title="Account & preferences"
        icon={<Settings size={16} color={palette.primary} />}
        badge="1-tap setup"
      >
        {accountItems.map((item) => (
          <MoreDestinationRow
            key={item.id}
            item={item}
            divider
            onPress={() => navigate(item.route)}
          />
        ))}
        <MoreAppearanceRow
          preference={appearance.preference}
          onSelect={(next) => {
            setError(undefined);
            void appearance.setPreference(next).catch((err) => {
              setError(
                err instanceof Error
                  ? err
                  : new Error("Could not update theme preference."),
              );
            });
          }}
        />
      </MoreSectionCard>

      <Button
        variant="outline"
        busy={busy}
        iconBadgeColor={palette.dangerSoft}
        icon={<LogOut size={15} color={palette.danger} />}
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

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Illustrations by Storyset"
        onPress={() =>
          void Linking.openURL("https://storyset.com/").catch(() => {})
        }
        style={{ alignSelf: "center", paddingVertical: 8 }}
      >
        <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
          Illustrations by Storyset
        </Text>
      </Pressable>
    </Screen>
  );
}
