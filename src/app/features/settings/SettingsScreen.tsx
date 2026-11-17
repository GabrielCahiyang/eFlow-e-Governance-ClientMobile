import { useState } from "react";
import Bell from "lucide-react-native/icons/bell";
import KeyRound from "lucide-react-native/icons/key-round";
import Mail from "lucide-react-native/icons/mail";
import Palette from "lucide-react-native/icons/palette";
import UserRound from "lucide-react-native/icons/user-round";
import { NavigationRow } from "../../components/ui/NavigationRow";
import type { Navigate } from "../../shared/routes";
import {
  Button,
  Card,
  Choice,
  DetailGroup,
  ErrorState,
  LabelValue,
  Notice,
  Screen,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { confirmAction } from "../../shared/confirm";
import { updateEmailPreference } from "../../../core/web/app/services/userSettingsService";
import { PasswordSheet } from "./PasswordSheet";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { PushSettings } from "../notifications";

export function SettingsScreen({
  initialView,
  navigate,
}: {
  initialView?: string;
  navigate: Navigate;
}) {
  const appearance = useAppearance();
  const palette = useTheme();
  const { toast } = useToast();
  const { profile, refresh } = useAuth(),
    [password, setPassword] = useState(false),
    [notice, setNotice] = useState(""),
    action = useAction(),
    enabled = profile?.email_notifications_enabled ?? true;
  const changeEmail = () =>
    action.run(async () => {
      if (!profile) return;
      const next = !enabled;
      if (
        !(await confirmAction(
          "Change task email notifications?",
          next
            ? "Receive email for task assignments, updates and reviews."
            : "Turn off task emails. In-app notifications remain available.",
          "Save preference",
        ))
      )
        return;
      await updateEmailPreference(profile.id, next);
      toast(
        next ? "Email digests turned on." : "Email digests turned off.",
        "success",
      );
      setNotice(
        next
          ? "Task email notifications are on."
          : "Task email notifications are off.",
      );
      await refresh();
    });
  const tab = initialView;
  const sections = [
    {
      id: "profile",
      title: "Profile",
      description: "Account details & professional record",
      icon: <UserRound size={18} color={palette.primary} />,
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Push alerts & task email digests",
      icon: <Bell size={18} color={palette.primary} />,
    },
    {
      id: "security",
      title: "Security",
      description: "Password & sign-in protection",
      icon: <KeyRound size={18} color={palette.primary} />,
    },
    {
      id: "appearance",
      title: "Appearance",
      description: "Light, dark, or device theme",
      icon: <Palette size={18} color={palette.primary} />,
    },
  ] as const;
  const pageTitle =
    tab === "notifications"
      ? "Notification alerts"
      : tab === "security"
        ? "Password & security"
        : tab === "appearance"
          ? "Appearance"
          : "Account & settings";
  const pageSubtitle =
    tab === "notifications"
      ? "Push delivery & email digest preferences"
      : tab === "security"
        ? "Verify current password & update login"
        : tab === "appearance"
          ? "Color theme preferences"
          : "Profile, notifications & security";
  const themeLabel =
    appearance.preference === "dark"
      ? "Dark"
      : appearance.preference === "light"
        ? "Light"
        : "Device setting";

  return (
    <Screen compact title={pageTitle} description={pageSubtitle}>
      {!tab || !sections.some((section) => section.id === tab) ? (
        <Card style={{ padding: 0, overflow: "hidden", gap: 0 }}>
          {sections.map(({ id, title, description, icon }, index) => (
            <NavigationRow
              key={id}
              title={title}
              description={description}
              icon={icon}
              divider={index < sections.length - 1}
              onPress={() =>
                navigate(
                  id === "profile"
                    ? { name: "profile" }
                    : { name: "settings", view: id, title },
                )
              }
            />
          ))}
        </Card>
      ) : (
        <>
          {tab === "appearance" ? (
            <Card
              title="Appearance"
              icon={<Palette size={16} color={palette.primary} />}
              badge={themeLabel}
              style={{ gap: 12 }}
            >
              <DetailGroup>
                <LabelValue label="Active theme" value={themeLabel} />
              </DetailGroup>
              <Choice
                label="Color theme"
                value={appearance.preference}
                searchable={false}
                options={[
                  { value: "system", label: "Use device setting" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
                onChange={(v) =>
                  void action.run(() =>
                    appearance.setPreference(v as "system" | "light" | "dark"),
                  )
                }
              />
            </Card>
          ) : tab === "security" ? (
            <Card
              title="Change your password"
              icon={<KeyRound size={16} color={palette.primary} />}
              badge="Protected"
              style={{ gap: 12 }}
            >
              <DetailGroup>
                <LabelValue
                  label="Signed-in account"
                  value={profile?.email || "Unavailable"}
                />
              </DetailGroup>
              <Notice>Have your current password ready.</Notice>
              <Button
                icon={<KeyRound size={15} color={palette.onPrimary} />}
                onPress={() => setPassword(true)}
              >
                Change password
              </Button>
            </Card>
          ) : (
            <>
              <PushSettings />
              <Card
                title="Task email notifications"
                icon={<Mail size={16} color={palette.primary} />}
                badge={enabled ? "On" : "Off"}
                badgeTone={enabled ? "success" : "neutral"}
                style={{ gap: 12 }}
              >
                <DetailGroup>
                  <LabelValue
                    label="Email notifications"
                    value={enabled ? "On" : "Off"}
                  />
                </DetailGroup>
                <Notice>
                  Receive email when work is assigned, updated or needs review.
                  In-app notifications remain available either way.
                </Notice>
                <Button
                  busy={action.busy}
                  icon={<Mail size={15} color={palette.onPrimary} />}
                  onPress={() => void changeEmail()}
                >
                  {enabled ? "Turn off task emails" : "Turn on task emails"}
                </Button>
              </Card>
            </>
          )}
          {!!notice && <Notice>{notice}</Notice>}
          {!!action.error && (
            <ErrorState context="action" error={action.error} />
          )}
        </>
      )}
      {!!password && (
        <PasswordSheet
          onClose={() => setPassword(false)}
          onSaved={() =>
            setNotice(
              "Password changed. Use your new password next time you sign in.",
            )
          }
        />
      )}
    </Screen>
  );
}
