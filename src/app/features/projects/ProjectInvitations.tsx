import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Notice,
  Row,
  Sheet,
  Status,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { confirmAction } from "../../shared/confirm";
import { draftStore } from "../../../platform/draftStore";
import { chooseFiles, asServiceFile } from "../../../platform/files";
import { fetchAllOrgs } from "../../../core/web/lib/supabaseService";
import {
  listProjectInvitations,
  submitProjectInvitation,
  sendProjectInvitation,
  decideProjectInvitation,
  dispatchProjectInvitation,
  uploadRequestPds,
  completeProjectOnboarding,
  designateSponsor,
} from "../../../core/web/app/features/project-invitations/services/projectInvitationService";
import { fetchAccess } from "../../../core/web/app/features/project-access/services/accessService";
import { MemberRemoval } from "./MemberRemoval";
import type {
  InvitationDraft,
  ProjectInvitation,
} from "../../../core/web/app/features/project-invitations/types";
import type { Engagement } from "../../../core/web/app/features/project-members/types";
type Saved = {
  project: string;
  office: string;
  timezone: string;
  draft: InvitationDraft;
  direct?: boolean;
};
export function ProjectInvitations({ project }: { project: string }) {
  const { profile, organization } = useAuth(),
    actor = profile!.id,
    facts = useFacts("project-invitations:" + actor + ":" + project, () =>
      listProjectInvitations(project),
    ),
    offices = useFacts(
      "invitation-sponsor-offices:" + actor,
      fetchAllOrgs,
      !!facts.data?.can_designate,
    ),
    access = useFacts("invitation-access:" + actor + ":" + project, () =>
      fetchAccess(project),
    ),
    action = useAction(),
    [open, setOpen] = useState(false),
    [email, setEmail] = useState(""),
    [engagement, setEngagement] = useState<Engagement>("Other"),
    [end, setEnd] = useState(""),
    [until, setUntil] = useState(true),
    [sponsor, setSponsor] = useState(""),
    [pending, setPending] = useState<Saved>();
  const recovery = useFacts(
    "invitation-draft:" + actor + ":" + project,
    async () => {
      const saved = await draftStore.get<Saved>(
        actor,
        "project-invitation:" + project,
      );
      if (
        saved &&
        (saved.project !== project ||
          typeof saved.draft?.id !== "string" ||
          typeof saved.draft?.email !== "string")
      )
        throw new Error("The saved invitation could not be verified.");
      setPending(saved || undefined);
      return true;
    },
  );
  const direct =
    pending?.direct ??
    (facts.data?.office_id === profile?.org_id &&
      isAppointedOfficeHead(profile, organization ? [organization] : []));
  const submit = () =>
    action.run(async () => {
      let saved = pending;
      if (!saved) {
        if (!/^\S+@\S+\.\S+$/.test(email.trim()))
          throw new Error("Enter a valid email.");
        if (!until && !end) throw new Error("Choose an access end date.");
        if (!facts.data?.office_id)
          throw new Error("Designate a sponsoring Office first.");
        saved = {
          project,
          direct,
          office: facts.data.office_id,
          timezone: facts.data.timezone || "Asia/Manila",
          draft: {
            id: crypto.randomUUID(),
            email,
            summary: "",
            skills: "",
            engagement,
            end,
            untilClose: until,
          },
        };
        await draftStore.set(actor, "project-invitation:" + project, saved);
        setPending(saved);
      }
      const receipt = saved.direct
        ? (
            await sendProjectInvitation(
              project,
              saved.office,
              saved.draft,
              saved.timezone,
            )
          ).item
        : await submitProjectInvitation(
            project,
            saved.office,
            saved.draft,
            saved.timezone,
          );
      if (receipt.id !== saved.draft.id)
        throw new Error(
          "No matching invitation receipt. Retry the original request.",
        );
      await draftStore.remove(actor, "project-invitation:" + project);
      setPending(undefined);
      setOpen(false);
      await facts.refresh();
    });
  const decide = (
    item: ProjectInvitation,
    state: "approved" | "rejected" | "revoked",
  ) =>
    action.run(async () => {
      if (
        !(await confirmAction(
          state === "approved"
            ? "Approve project invitation?"
            : state === "rejected"
              ? "Reject invitation request?"
              : "Revoke invitation?",
          item.email,
          "Confirm " + state,
          state !== "approved",
        ))
      )
        return;
      await decideProjectInvitation(item, state);
      await facts.refresh();
    });
  return (
    <Card title="Invite a new project participant">
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        <>
          <Notice>
            New participant accounts are scoped to this project. Approval, email
            delivery, acceptance and onboarding are separate steps.
          </Notice>
          {(facts.data?.can_request || access.data?.can_share) && (
            <Button
              disabled={
                recovery.loading || !!recovery.error || !facts.data?.office_id
              }
              onPress={() => setOpen(true)}
            >
              {pending
                ? "Resume saved invitation"
                : direct
                  ? "Invite project member"
                  : "Request project invitation"}
            </Button>
          )}
          {facts.data?.can_designate && (
            <>
              <Choice
                label="Sponsoring Office"
                value={sponsor}
                onChange={setSponsor}
                options={(offices.data || []).map((office) => ({
                  value: office.id,
                  label: office.name,
                }))}
              />
              <Button
                variant="outline"
                disabled={!sponsor || !facts.data.workspace_id}
                busy={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await designateSponsor(facts.data!.workspace_id!, sponsor);
                    await facts.refresh();
                  })
                }
              >
                Designate sponsor
              </Button>
            </>
          )}
          {facts.data?.requests.map((item) => (
            <Card key={item.id} title={item.email}>
              <Status value={item.state} />
              <LabelValue label="Responsibility" value={item.summary} />
              <LabelValue label="Email delivery" value={item.delivery_status} />
              <LabelValue label="Onboarding" value={item.onboarding} />
              {!!item.delivery_error && <Notice>{item.delivery_error}</Notice>}
              <Row>
                {item.can_approve && (
                  <>
                    <Button onPress={() => void decide(item, "approved")}>
                      Approve request
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => void decide(item, "rejected")}
                    >
                      Reject request
                    </Button>
                  </>
                )}
                {item.can_dispatch && (
                  <Button
                    busy={action.busy}
                    onPress={() =>
                      void action.run(async () => {
                        const resend =
                          item.delivery_status === "provider_accepted";
                        if (
                          !(await confirmAction(
                            resend
                              ? "Resend invitation email?"
                              : "Send invitation email?",
                            item.email,
                            resend ? "Resend email" : "Send email",
                          ))
                        )
                          return;
                        await dispatchProjectInvitation(item, resend);
                        await facts.refresh();
                      })
                    }
                  >
                    {item.delivery_status === "provider_accepted"
                      ? "Resend email"
                      : "Send invitation email"}
                  </Button>
                )}
                {item.can_revoke && item.state !== "accepted" && (
                  <Button
                    variant="danger"
                    onPress={() => void decide(item, "revoked")}
                  >
                    Revoke request
                  </Button>
                )}
                {item.state === "accepted" &&
                  item.accepted_by &&
                  (access.data?.can_remove_personal ||
                    access.data?.can_remove_offices.includes(
                      item.office_id,
                    )) && (
                    <MemberRemoval
                      project={project}
                      person={item.accepted_by}
                      name={item.email}
                      office={item.kind === "personal" ? null : item.office_id}
                      busy={action.busy}
                      onSaved={facts.refresh}
                    />
                  )}
                {item.can_complete_onboarding && (
                  <Button
                    busy={action.busy}
                    onPress={() =>
                      void action.run(async () => {
                        await completeProjectOnboarding(item.id);
                        await facts.refresh();
                      })
                    }
                  >
                    Complete project onboarding
                  </Button>
                )}
                {item.state === "accepted" && item.accepted_by === actor && (
                  <Button
                    variant="outline"
                    busy={action.busy}
                    onPress={() =>
                      void action.run(async () => {
                        const file = (await chooseFiles("application/pdf"))[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024)
                          throw new Error("Choose a PDF up to 10 MB.");
                        await uploadRequestPds(
                          await asServiceFile(file),
                          item.id,
                        );
                        await facts.refresh();
                      })
                    }
                  >
                    Attach PDS PDF
                  </Button>
                )}
              </Row>
              {item.pds_documents.map((file) => (
                <LabelValue
                  key={file.id}
                  label={file.original_filename}
                  value={file.processing_status}
                />
              ))}
            </Card>
          ))}
        </>
      )}
      {!!recovery.error && <ErrorState error={recovery.error} />}
      <Sheet
        open={open}
        title={direct ? "Invite project member" : "Request project invitation"}
        busy={action.busy}
        onClose={() => setOpen(false)}
      >
        <Field
          label="Email"
          value={pending?.draft.email || email}
          editable={!pending}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />
        <Choice
          label="Engagement"
          value={pending?.draft.engagement || engagement}
          disabled={!!pending}
          options={["Permanent", "Job Order", "OJT", "Consultant", "Other"].map(
            (value) => ({ value, label: value }),
          )}
          onChange={(value) => setEngagement(value as Engagement)}
        />
        <Choice
          label="Access duration"
          value={until ? "close" : "date"}
          disabled={!!pending}
          options={[
            { value: "close", label: "Until project closes" },
            { value: "date", label: "Choose end date" },
          ]}
          onChange={(value) => setUntil(value === "close")}
        />
        {!until && (
          <DateField
            label="Access end date"
            value={end}
            disabled={!!pending}
            onChange={setEnd}
          />
        )}
        <Notice>
          {direct
            ? "The recipient uses this email to sign in and fills in their own profile."
            : "The sponsoring Head reviews this request before an invitation can be sent."}
        </Notice>
        <Button
          busy={action.busy}
          disabled={recovery.loading || !!recovery.error}
          onPress={() => void submit()}
        >
          {pending
            ? "Retry original request"
            : direct
              ? "Send invitation"
              : "Submit for Head approval"}
        </Button>
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
      {!!action.error && !open && <ErrorState error={action.error} />}
    </Card>
  );
}
