import { useState } from "react";
import { View } from "../../components/ui/Primitives";
import {
  Button,
  Card,
  ErrorState,
  LabelValue,
  Notice,
  Screen,
  Tabs,
  colors,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { ProfileScreen } from "../profile";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { updateEmailPreference } from "../../../core/web/app/services/userSettingsService";
import { PasswordSheet } from "./PasswordSheet";
import { useAppearance } from "../../components/ui/Appearance";
import { Choice } from "../../components/ui";
import { PushSettings } from "../notifications";
export function SettingsScreen() {
  const appearance = useAppearance();
  const { profile, refresh } = useAuth(),
    [tab, setTab] = useState("profile"),
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
      setNotice(
        next
          ? "Task email notifications are on."
          : "Task email notifications are off.",
      );
      await refresh();
    });
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "profile", label: "Profile" },
            { id: "notifications", label: "Notifications" },
            { id: "security", label: "Security" },
            { id: "appearance", label: "Appearance" },
          ]}
        />
      </View>
      {tab === "profile" ? (
        <ProfileScreen />
      ) : (
        <Screen title={tab === "security" ? "Security" : "Notifications"}>
          {tab === "appearance" ? (
            <Card title="Appearance">
              <Choice
                label="Color theme"
                value={appearance.preference}
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
            <Card title="Change your password">
              <Notice>
                Confirm your current password before choosing a new one. Account
                lockouts and password policy are still enforced.
              </Notice>
              <Button onPress={() => setPassword(true)}>Change password</Button>
            </Card>
          ) : (
            <>
              <PushSettings />
              <Card title="Task email notifications">
                <LabelValue
                  label="Email notifications"
                  value={enabled ? "On" : "Off"}
                />
                <Notice>
                  Receive email when work is assigned, updated or needs review.
                  In-app notifications remain available either way.
                </Notice>
                <Button busy={action.busy} onPress={() => void changeEmail()}>
                  {enabled ? "Turn off task emails" : "Turn on task emails"}
                </Button>
              </Card>
            </>
          )}
          {!!notice && <Notice>{notice}</Notice>}
          {!!action.error && <ErrorState error={action.error} />}
        </Screen>
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
    </View>
  );
}
