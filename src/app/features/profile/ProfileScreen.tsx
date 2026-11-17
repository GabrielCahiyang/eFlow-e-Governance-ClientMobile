import { useState } from "react";
import { Image } from "react-native";
import Check from "lucide-react-native/icons/check";
import Upload from "lucide-react-native/icons/upload";
import UserRound from "lucide-react-native/icons/user-round";
import {
  Button,
  Card,
  DetailGroup,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Row,
  Screen,
  Tabs,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useToast } from "../../components/ui/Toast";
import { useAction } from "../../shared/useAction";
import { chooseFiles, asServiceFile } from "../../../platform/files";
import {
  getProfileAvatarUrl,
  updateOwnProfile,
  replaceProfileAvatar,
} from "../../../core/web/app/services/userSettingsService";
import { ProfessionalProfile } from "./ProfessionalProfile";
import { activationRoleLabel } from "../../../core/web/app/features/account-activation/selectors";
export function ProfileScreen() {
  const { profile, organization, refresh } = useAuth(),
    palette = useTheme(),
    { toast } = useToast(),
    action = useAction(),
    [view, setView] = useState("account"),
    [name, setName] = useState(profile?.full_name || "");
  const avatar = useFacts(
    "own-avatar:" + profile?.id + ":" + profile?.avatar_path,
    () => getProfileAvatarUrl(profile?.avatar_path),
  );
  return (
    <Screen
      compact
      title="Profile"
      description={profile?.email || "Account & professional record"}
    >
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: "account", label: "Account" },
          { id: "professional", label: "Professional profile" },
        ]}
      />
      {!!(view === "account") && (
        <Card
          title="Account details"
          icon={<UserRound size={16} color={palette.primary} />}
          badge={
            profile?.role ? activationRoleLabel(profile.role) : undefined
          }
          badgeTone="success"
        >
          {!!avatar.data && (
            <Image
              source={{ uri: avatar.data }}
              style={{ width: 88, height: 88, borderRadius: 44 }}
            />
          )}
          <DetailGroup>
            <LabelValue label="Email" value={profile?.email || ""} />
            <LabelValue
              label="Account role"
              value={
                profile?.role
                  ? activationRoleLabel(profile.role)
                  : "Unavailable"
              }
            />
            <LabelValue
              label="Office"
              value={organization?.name || "No Office"}
            />
          </DetailGroup>
          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            editable={!action.busy}
          />
          <Row>
            <Button
              busy={action.busy}
              icon={<Check size={15} color={palette.onPrimary} />}
              disabled={!name.trim() || name.trim() === profile?.full_name}
              onPress={() =>
                void action.run(async () => {
                  await updateOwnProfile(profile!.id, {
                    full_name: name.trim(),
                  });
                  toast("Account name saved.", "success");
                  await refresh();
                }, "Account name saved.")
              }
            >
              Save name
            </Button>
            <Button
              variant="outline"
              busy={action.busy}
              icon={<Upload size={15} color={palette.primary} />}
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
                  toast("Profile photo saved.", "success");
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
      {!!action.error && <ErrorState context="action" error={action.error} />}
      {!!action.notice && <Notice>{action.notice}</Notice>}
    </Screen>
  );
}
