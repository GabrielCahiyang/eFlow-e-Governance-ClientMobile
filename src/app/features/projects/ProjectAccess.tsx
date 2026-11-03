import { useState } from "react";
import { Share } from "react-native";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  Status,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { draftStore } from "../../../platform/draftStore";
import { ProjectInvitations } from "./ProjectInvitations";
import { MemberTerms } from "./MemberTerms";
import { accessEnd } from "../../../core/web/app/shared/accessTerms";
import {
  fetchAccess,
  grantAccess,
  previewRemoval,
  removePerson,
  revokeViewer,
} from "../../../core/web/app/features/project-access/services/accessService";
import type {
  AccessPermission,
  Engagement,
  RemovalImpact,
} from "../../../core/web/app/features/project-access/types";
type GrantDraft = {
  id: string;
  project: string;
  email: string;
  access: AccessPermission;
  engagement: Engagement;
  end: string | null;
  close: boolean;
};
export function ProjectAccess({
  project,
  onSaved,
}: {
  project: string;
  onSaved?: () => Promise<unknown>;
}) {
  const { profile } = useAuth(),
    actor = profile!.id,
    facts = useFacts("project-access:" + actor + ":" + project, () =>
      fetchAccess(project),
    ),
    action = useAction(),
    [open, setOpen] = useState(false),
    [email, setEmail] = useState(""),
    [access, setAccess] = useState<AccessPermission>("viewer"),
    [engagement, setEngagement] = useState<Engagement>("Other"),
    [end, setEnd] = useState(""),
    [untilClose, setUntilClose] = useState(true),
    [pending, setPending] = useState<GrantDraft>(),
    [impact, setImpact] = useState<RemovalImpact>(),
    [removalRequest, setRemovalRequest] = useState("");
  const recovery = useFacts(
    "grant-recovery:" + actor + ":" + project,
    async () => {
      const saved = await draftStore.get<GrantDraft>(actor, "grant:" + project);
      if (saved && saved.project !== project)
        throw new Error("Saved share does not match this project.");
      setPending(saved || undefined);
      return true;
    },
  );
  const refresh = async () => {
    await facts.refresh();
    await onSaved?.();
  };
  const save = () =>
    action.run(async () => {
      let draft = pending;
      if (!draft) {
        if (email.trim().length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim()))
          throw new Error("Enter a valid recipient email address.");
        if (!untilClose && !end) throw new Error("Choose an access end date.");
        draft = {
          id: crypto.randomUUID(),
          project,
          email,
          access,
          engagement,
          end: untilClose
            ? null
            : accessEnd(end, facts.data?.timezone || "Asia/Manila"),
          close: untilClose,
        };
        await draftStore.set(actor, "grant:" + project, draft);
        setPending(draft);
      }
      await grantAccess(
        draft.id,
        project,
        draft.email,
        draft.access,
        draft.engagement,
        draft.end,
        draft.close,
      );
      await draftStore.remove(actor, "grant:" + project);
      setPending(undefined);
      setOpen(false);
      await refresh();
    });
  const share = (id: string) =>
    action.run(async () => {
      const origin = process.env.EXPO_PUBLIC_WEB_ORIGIN;
      const url = origin
        ? new URL("/project-share?grant=" + encodeURIComponent(id), origin).href
        : "eflow://project-share?grant=" + encodeURIComponent(id);
      await Share.share({ message: url });
    });
  return (
    <Card title="Sharing & project access">
      <ProjectInvitations project={project} />
      <MemberTerms project={project} />
      {facts.loading && !facts.data ? (
        <Loading />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        <>
          {facts.data?.can_share && (
            <Button
              disabled={recovery.loading || !!recovery.error}
              onPress={() => setOpen(true)}
            >
              {pending ? "Resume saved share" : "Share project"}
            </Button>
          )}
          {!!pending && (
            <Notice>
              A saved sharing request needs verification. Retry preserves its
              grant ID and recipient.
            </Notice>
          )}
          {facts.data?.grants.map((grant) => (
            <Card key={grant.id}>
              <Text>{grant.name || grant.email}</Text>
              <LabelValue label="Access" value={grant.access} />
              <LabelValue label="Engagement" value={grant.engagement} />
              <Status
                value={
                  grant.effective
                    ? "active"
                    : grant.revoked_at
                      ? "revoked"
                      : "pending"
                }
              />
              <LabelValue
                label="Access ends"
                value={
                  grant.until_close
                    ? "When the project closes"
                    : grant.access_end || "—"
                }
              />
              <Row>
                {grant.can_revoke && !grant.revoked_at && (
                  <>
                    <Button
                      variant="outline"
                      onPress={() => void share(grant.id)}
                    >
                      Share invitation link
                    </Button>
                    {grant.access === "viewer" ? (
                      <Button
                        variant="danger"
                        onPress={() =>
                          void action.run(async () => {
                            if (
                              await confirmAction(
                                "Revoke viewer access?",
                                "This removes access to this project.",
                                "Revoke",
                              )
                            ) {
                              await revokeViewer(grant.id);
                              await refresh();
                            }
                          })
                        }
                      >
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        onPress={() =>
                          void action.run(async () => {
                            setImpact(
                              await previewRemoval(
                                project,
                                grant.recipient,
                                grant.office_id,
                              ),
                            );
                            setRemovalRequest(crypto.randomUUID());
                          })
                        }
                      >
                        Review removal
                      </Button>
                    )}
                  </>
                )}
              </Row>
            </Card>
          ))}
        </>
      )}
      {!!recovery.error && <ErrorState error={recovery.error} />}
      <Sheet
        open={open}
        busy={action.busy}
        title="Share project"
        onClose={() => {
          if (!action.busy) setOpen(false);
        }}
      >
        <Field
          label="Recipient email"
          value={pending?.email || email}
          editable={!pending}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Choice
          label="Project access"
          value={pending?.access || access}
          disabled={!!pending}
          options={["viewer", "member"].map((value) => ({
            value,
            label: value,
          }))}
          onChange={(value) => setAccess(value as AccessPermission)}
        />
        <Choice
          label="Engagement"
          value={pending?.engagement || engagement}
          disabled={!!pending}
          options={["Permanent", "Job Order", "OJT", "Consultant", "Other"].map(
            (value) => ({ value, label: value }),
          )}
          onChange={(value) => setEngagement(value as Engagement)}
        />
        <Choice
          label="Access duration"
          value={untilClose ? "close" : "date"}
          disabled={!!pending}
          options={[
            { value: "close", label: "Until project closes" },
            { value: "date", label: "Choose end date" },
          ]}
          onChange={(v) => setUntilClose(v === "close")}
        />
        {!untilClose && (
          <DateField label="Last access date" value={end} onChange={setEnd} />
        )}
        <Notice>
          The recipient must redeem the link while signed in. This grants
          project access and does not change their system role.
        </Notice>
        <Button
          busy={action.busy}
          disabled={!!recovery.error || recovery.loading}
          onPress={() => void save()}
        >
          {pending ? "Retry original share" : "Create invitation link"}
        </Button>
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
      <Sheet
        open={!!impact}
        title="Review member removal"
        onClose={() => {
          if (!action.busy) setImpact(undefined);
        }}
      >
        <Notice>
          Removing this member affects {impact?.tasks.length || 0} tasks and{" "}
          {impact?.nodes.length || 0} work items. The server checks this preview
          again before applying it.
        </Notice>
        {impact?.tasks.map((t) => (
          <Text key={t.id}>
            {t.title} · {t.status}
          </Text>
        ))}
        {impact?.nodes.map((n) => (
          <Text key={n.id}>
            {n.title} · {n.status}
          </Text>
        ))}
        <Button
          variant="danger"
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              await removePerson(impact!, removalRequest);
              setImpact(undefined);
              await refresh();
            })
          }
        >
          Confirm reviewed removal
        </Button>
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
      {!!action.error && !open && !impact && (
        <ErrorState error={action.error} />
      )}
    </Card>
  );
}
