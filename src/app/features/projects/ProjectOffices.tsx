import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import Plus from "lucide-react-native/icons/plus";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  Status,
  colors,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
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
  const action = useAction(),
    [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [officeId, setOfficeId] = useState(""),
    [access, setAccess] = useState<"collaborating" | "observer">(
      "collaborating",
    ),
    [invite, setInvite] = useState<{ id: string; identity: boolean }>();
  const closed = ["completed", "archived"].includes(project.status);
  const save = () =>
    action.run(
      async () => {
        if (invite) {
          if (!email.trim()) throw new Error("Email is required.");
          if (invite.identity)
            await inviteOfficeIdentity(invite.id, email, access);
          else await inviteProjectOffice(project.id, invite.id, email, access);
        } else {
          if (!name.trim()) throw new Error("Office name is required.");
          const identity = await saveOfficeIdentity(
            project.id,
            crypto.randomUUID(),
            name,
            "Added manually from eFlow Mobile",
          );
          if (officeId) await linkOfficeIdentity(identity.id, officeId);
        }
        setOpen(false);
        setInvite(undefined);
        setName("");
        setEmail("");
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
                  facts.data?.orgs.find((o) => o.id === office.office_id)
                    ?.name || "Office"
                }
              >
                <LabelValue
                  label="Relationship"
                  value={office.relationship_type}
                />
                <LabelValue
                  label="Contact"
                  value={office.contact_email || "Not provided"}
                />
                <Status value={office.invitation_status} />
                <LabelValue
                  label="Selected members"
                  value={
                    facts.data!.participation.members.filter(
                      (m) => m.project_office_id === office.id,
                    ).length
                  }
                />
                {!!(
                  canManage &&
                  !closed &&
                  office.invitation_status !== "joined"
                ) && (
                  <Row>
                    <Button
                      variant="outline"
                      onPress={() =>
                        void action.run(async () => {
                          await confirmProjectOffice(office.id);
                          await facts.refresh();
                        })
                      }
                    >
                      Confirm participation
                    </Button>
                    <Button
                      variant="outline"
                      onPress={() =>
                        void action.run(async () => {
                          await withdrawProjectOffice(office.id);
                          await facts.refresh();
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
                <Card key={identity.id} title={identity.display_name}>
                  {!identity.contact_email && (
                    <Row>
                      <AlertCircle size={18} color={colors.warning} />
                      <Text style={{ color: colors.warning }}>
                        Needs a project contact
                      </Text>
                    </Row>
                  )}
                  <LabelValue
                    label="Contact"
                    value={identity.contact_email || "Not provided"}
                  />
                  <Status value={identity.contact_status} />
                  {!!(canManage && !closed) && (
                    <Button
                      variant="outline"
                      onPress={() => {
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
      {!!action.error && <ErrorState context="action" error={action.error} />}
      <Sheet
        actionError={action.error}
        open={open}
        title={invite ? "Invite project Office contact" : "Add project Office"}
        onClose={() => setOpen(false)}
        busy={action.busy}
        footer={
          <Button busy={action.busy} onPress={() => void save()}>
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
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Choice
              label="Project access"
              value={access}
              onChange={setAccess}
              options={[
                { value: "collaborating", label: "Collaborating Office" },
                { value: "observer", label: "Observer" },
              ]}
            />
          </>
        ) : (
          <>
            <Field label="Office name" value={name} onChangeText={setName} />
            <Choice
              label="Link existing Office (optional)"
              value={officeId}
              onChange={setOfficeId}
              options={[
                { value: "", label: "Project-local Office" },
                ...(facts.data?.orgs || []).map((o) => ({
                  value: o.id,
                  label: o.name,
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
