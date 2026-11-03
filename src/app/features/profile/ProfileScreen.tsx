import { useState } from "react";
import { Image } from "react-native";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Row,
  Screen,
  Tabs,
  Toggle,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { chooseFiles, asServiceFile } from "../../../platform/files";
import {
  getProfileAvatarUrl,
  updateOwnProfile,
  replaceProfileAvatar,
  updateEmailPreference,
} from "../../../core/web/app/services/userSettingsService";
import { ProfessionalProfile } from "./ProfessionalProfile";
export function ProfileScreen() {
  const { profile, organization, refresh } = useAuth(),
    action = useAction(),
    [view, setView] = useState("account"),
    [name, setName] = useState(profile?.full_name || "");
  const avatar = useFacts(
    "own-avatar:" + profile?.id + ":" + profile?.avatar_path,
    () => getProfileAvatarUrl(profile?.avatar_path),
  );
  return (
    <Screen
      title="Profile"
      description="Your account and professional information."
    >
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: "account", label: "Account" },
          { id: "professional", label: "Professional Profile" },
          { id: "notifications", label: "Notifications" },
        ]}
      />
      {!!(view === "account") && (
        <Card title="Account details">
          {!!avatar.data && (
            <Image
              source={{ uri: avatar.data }}
              style={{ width: 88, height: 88, borderRadius: 44 }}
            />
          )}
          <LabelValue label="Email" value={profile?.email || ""} />
          <LabelValue
            label="Account role"
            value={profile?.role?.replaceAll("_", " ") || ""}
          />
          <LabelValue
            label="Office"
            value={organization?.name || "No Office"}
          />
          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            editable={!action.busy}
          />
          <Row>
            <Button
              busy={action.busy}
              disabled={!name.trim() || name.trim() === profile?.full_name}
              onPress={() =>
                void action.run(async () => {
                  await updateOwnProfile(profile!.id, {
                    full_name: name.trim(),
                  });
                  await refresh();
                }, "Account name saved.")
              }
            >
              Save name
            </Button>
            <Button
              variant="outline"
              busy={action.busy}
              onPress={() =>
                void action.run(async () => {
                  const [file] = await chooseFiles([
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                  ]);
                  if (!file) return;
                  await replaceProfileAvatar(
                    profile!.id,
                    await asServiceFile(file),
                    profile?.avatar_path,
                  );
                  await refresh();
                  await avatar.refresh();
                }, "Profile photo saved.")
              }
            >
              Change photo
            </Button>
          </Row>
        </Card>
      )}
      {!!(view === "professional" && !!profile) && (
        <ProfessionalProfile userId={profile.id} />
      )}
      {!!(view === "notifications") && (
        <Card title="Email notifications">
          <Toggle
            label="Receive eFlow notifications by email"
            value={profile?.email_notifications_enabled !== false}
            disabled={action.busy}
            onChange={(enabled) =>
              void action.run(async () => {
                await updateEmailPreference(profile!.id, enabled);
                await refresh();
              })
            }
          />
          <Notice>
            In-app workflow alerts remain available in your Inbox.
          </Notice>
        </Card>
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {!!action.notice && <Notice>{action.notice}</Notice>}
    </Screen>
  );
}
