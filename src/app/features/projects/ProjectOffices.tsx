import { officeLabel as mobileOfficeLabel } from "../../shared/officeLabels";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import Building from "lucide-react-native/icons/building";
import Check from "lucide-react-native/icons/check";
import Mail from "lucide-react-native/icons/mail";
import Plus from "lucide-react-native/icons/plus";
import Send from "lucide-react-native/icons/send";
import X from "lucide-react-native/icons/x";
import {
  Button,
  Card,
  Choice,
  DetailGroup,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  Status,
  withOpacity,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { PublicMessageError } from "../../shared/userMessages";
import {
  fetchProjectOffices,
  confirmProjectOffice,
  withdrawProjectOffice,
  inviteProjectOffice,
} from "../../../core/web/app/features/project-offices/services/projectOfficeService";
import {
  fetchOfficeIdentities,
  saveOfficeIdentity,
  linkOfficeIdentity,
  inviteOfficeIdentity,
} from "../../../core/web/app/features/project-offices/services/officeIdentityService";
import { fetchAllOrgs } from "../../../core/web/lib/supabaseService";
import type { Project } from "../../../core/web/app/features/projects/services/types";

export function ProjectOffices({
  project,
  canManage,
}: {
  project: Project;
  canManage: boolean;
}) {
  const palette = useTheme();
  const facts = useFacts("offices:" + project.id, async () => {
    const [participation, identities, orgs] = await Promise.all([
      fetchProjectOffices(project.id),
      fetchOfficeIdentities(project.id),
      fetchAllOrgs(),
    ]);
    return { participation, identities, orgs };
  });
  const { profile } = useAuth();
  const { toast } = useToast();
  const action = useAction(),
    [open, setOpen] = useState(false),
    [invite, setInvite] = useState<{ id: string; identity: boolean }>();
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(
      profile?.id,
      "project-office:" +
        project.id +
        ":" +
        (invite ? "invite:" + invite.id : "add"),
    ),
    open,
    () => ({
      name: "",
      email: "",
      officeId: "",
      access: "collaborating" as "collaborating" | "observer",
    }),
    { restoreOnOpen: false },
  );
  const { name, email, officeId, access } = draft;
  const closed = ["completed", "archived"].includes(project.status);
  const save = () =>
    action.run(
      async () => {
        if (invite) {
          if (!email.trim())
            throw new PublicMessageError("Email is required.");
          if (invite.identity)
            await inviteOfficeIdentity(invite.id, email, access);
          else await inviteProjectOffice(project.id, invite.id, email, access);
        } else {
          if (!name.trim())
            throw new PublicMessageError("Office name is required.");
          const identity = await saveOfficeIdentity(
            project.id,
            crypto.randomUUID(),
            name,
            "Added manually from eFlow Mobile",
          );
          if (officeId) await linkOfficeIdentity(identity.id, officeId);
        }
        clearDraft();
        toast(
          invite ? "Invitation sent." : "Project Office added.",
          "success",
        );
        setOpen(false);
        setInvite(undefined);
        await facts.refresh();
      },
      invite ? "Invitation sent." : "Project Office added.",
    );
  return (
    <>
      {!!(canManage && !closed) && (
        <Button
          icon={<Plus color={palette.onPrimary} size={17} />}
          onPress={() => {
            action.clear();
            setInvite(undefined);
            setOpen(true);
          }}
        >
          Add Office
        </Button>
      )}
      {facts.loading && !facts.data ? (
        <Loading
          label="Loading participating Offices"
          layout="request"
          rows={2}
        />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        facts.data && (
          <>
            {facts.data.participation.offices.map((office) => (
              <Card
                key={office.id}
                title={
                  mobileOfficeLabel(facts.data?.orgs.find((o) => o.id === office.office_id)?.name)
                }
                icon={<Building size={16} color={palette.primary} />}
                action={
                  <Status value={office.invitation_status} variant="pill" />
                }
                style={{ gap: 12 }}
              >
                <DetailGroup>
                  <LabelValue
                    label="Relationship"
                    value={office.relationship_type}
                  />
                  <LabelValue
                    label="Contact"
                    value={office.contact_email || "Not provided"}
                  />
                  <LabelValue
                    label="Selected members"
                    value={
                      facts.data!.participation.members.filter(
                        (m) => m.project_office_id === office.id,
                      ).length
                    }
                  />
                </DetailGroup>
                {!!(
                  canManage &&
                  !closed &&
                  office.invitation_status !== "joined"
                ) && (
                  <Row>
                    <Button
                      variant="outline"
                      icon={<Check size={16} color={palette.primary} />}
                      onPress={() =>
                        void action.run(async () => {
                          await confirmProjectOffice(office.id);
                          await facts.refresh();
                          toast("Office participation confirmed.", "success");
                        })
                      }
                    >
                      Confirm participation
                    </Button>
                    <Button
                      variant="outline"
                      icon={<X size={16} color={palette.primary} />}
                      onPress={() =>
                        void action.run(async () => {
                          await withdrawProjectOffice(office.id);
                          await facts.refresh();
                          toast("Office invitation withdrawn.", "success");
                        })
                      }
                    >
                      Withdraw invitation
                    </Button>
                  </Row>
                )}
              </Card>
            ))}
            {facts.data.identities
              .filter((i) => !i.provenance?.removed)
              .map((identity) => (
                <Card
                  key={identity.id}
                  title={mobileOfficeLabel(identity.display_name)}
                  icon={<Building size={16} color={palette.mutedLabel} />}
                  action={
                    <Status value={identity.contact_status} variant="pill" />
                  }
                  style={{ gap: 12 }}
                >
                  {!identity.contact_email && (
                    <View
                      style={[
                        styles.warningBanner,
                        {
                          backgroundColor: palette.warningSoft,
                          borderColor: withOpacity(palette.warning, 0.28),
                        },
                      ]}
                    >
                      <AlertCircle size={16} color={palette.warning} />
                      <Text
                        style={[
                          styles.warningText,
                          { color: palette.warning },
                        ]}
                      >
                        Needs a project contact
                      </Text>
                    </View>
                  )}
                  <DetailGroup>
                    <LabelValue
                      label="Contact"
                      value={identity.contact_email || "Not provided"}
                    />
                  </DetailGroup>
                  {!!(canManage && !closed) && (
                    <Button
                      variant="outline"
                      icon={<Mail size={16} color={palette.primary} />}
                      onPress={() => {
                        action.clear();
                        setInvite({ id: identity.id, identity: true });
                        setOpen(true);
                      }}
                    >
                      Invite a project contact
                    </Button>
                  )}
                </Card>
              ))}
          </>
        )
      )}
      {!open && !!action.error && (
        <ErrorState context="action" error={action.error} />
      )}
      <Sheet
        actionError={action.error}
        open={open}
        title={invite ? "Invite project Office contact" : "Add project Office"}
        onClose={() => {
          if (!action.busy) {
            action.clear();
            setOpen(false);
          }
        }}
        busy={action.busy}
        footer={
          <Button
            busy={action.busy}
            icon={
              invite ? (
                <Send size={16} color={palette.onPrimary} />
              ) : (
                <Plus size={16} color={palette.onPrimary} />
              )
            }
            onPress={() => void save()}
          >
            {invite ? "Send invitation" : "Add Office"}
          </Button>
        }
      >
        {invite ? (
          <>
            <Notice>
              This invitation concerns participation in this project. It does
              not appoint a permanent system Head.
            </Notice>
            <Field
              label="Contact email"
              value={email}
              onChangeText={(next) => updateDraft({ email: next })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Choice
              label="Project access"
              value={access}
              searchable={false}
              onChange={(next) =>
                updateDraft({ access: next as "collaborating" | "observer" })
              }
              options={[
                { value: "collaborating", label: "Collaborating Office" },
                { value: "observer", label: "Observer" },
              ]}
            />
          </>
        ) : (
          <>
            <Field
              label="Office name"
              value={name}
              onChangeText={(next) => updateDraft({ name: next })}
            />
            <Choice
              label="Link existing Office"
              value={officeId}
              onChange={(next) => updateDraft({ officeId: next })}
              options={[
                { value: "", label: "Project-local Office" },
                ...(facts.data?.orgs || []).map((o) => ({
                  value: o.id,
                  label: mobileOfficeLabel(o.name),
                })),
              ]}
            />
            <Notice>
              The Office is added with an empty contact. An invitation can be
              sent manually afterward.
            </Notice>
          </>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
});
