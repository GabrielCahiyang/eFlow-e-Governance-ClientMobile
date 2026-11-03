import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  SearchField,
  Sheet,
  Status,
  Tabs,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { phase2Request } from "../../../core/web/app/shared/phase2Api";
import {
  listInvitations,
  resendInvitation,
  revokeInvitation,
  sendInvitations,
} from "../../../core/web/app/features/invitations/services/invitationService";
import {
  invitationValidity,
  invitationCanManage,
} from "../../../core/web/app/features/invitations/presentation";
import { filterOfficeMembers } from "../../../core/web/app/features/office-team/selectors";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import type { OfficeMember } from "../../../core/web/app/features/office-team/types";
import type {
  Invitation,
  InvitedRole,
} from "../../../core/web/app/features/invitations/types";
import { draftStore } from "../../../platform/draftStore";
import * as Clipboard from "expo-clipboard";

export function OfficeTeamScreen() {
  const { profile, organization } = useAuth(),
    canManage = isAppointedOfficeHead(
      profile,
      organization ? [organization] : [],
    ),
    [tab, setTab] = useState("active"),
    [search, setSearch] = useState(""),
    [role, setRole] = useState("all"),
    [validity, setValidity] = useState("all"),
    [invite, setInvite] = useState(false),
    [member, setMember] = useState<OfficeMember>();
  const team = useFacts(
      `office-team:${profile?.id}:${profile?.org_id}`,
      () =>
        phase2Request<{ office_name: string; members: OfficeMember[] }>(
          "/office-team",
        ),
      profile?.role === "head",
    ),
    invitations = useFacts(
      `office-invitations:${profile?.id}:${profile?.org_id}`,
      listInvitations,
      profile?.role === "head",
    ),
    action = useAction();
  const refresh = async () => {
    await Promise.all([team.refresh(), invitations.refresh()]);
  };
  const manage = async (
    item: Invitation,
    operation: "resend" | "copy" | "revoke",
  ) => {
    if (
      !canManage ||
      !invitationCanManage(item) ||
      !(await confirmAction(
        operation === "revoke"
          ? "Revoke invitation?"
          : operation === "copy"
            ? "Create a fresh invitation link?"
            : "Resend invitation?",
        `${item.email}. ${operation === "revoke" ? "This invitation link will stop working." : "The previous invitation link will stop working."}`,
        operation === "revoke"
          ? "Revoke invitation"
          : operation === "copy"
            ? "Create fresh link"
            : "Resend invitation",
        operation === "revoke",
      ))
    )
      return;
    void action.run(
      async () => {
        const scope = `invitation-operation:${item.id}:${item.send_count}:${item.status}`;
        if (await draftStore.get(profile!.id, scope))
          throw new Error(
            "This invitation action was already sent or needs verification. Refresh the invitation before repeating it.",
          );
        await draftStore.set(profile!.id, scope, { operation, at: Date.now() });
        if (operation === "revoke") await revokeInvitation(item.id);
        else {
          const result = await resendInvitation(item.id, operation === "copy");
          if (operation === "copy" && result.invitation_url)
            await Clipboard.setStringAsync(result.invitation_url);
        }
        await refresh();
      },
      operation === "copy"
        ? "Fresh private invitation link copied."
        : "Invitation action recorded.",
    );
  };
  const shownMembers = filterOfficeMembers(
      team.data?.members || [],
      search,
      role,
    ),
    shownInvitations = (invitations.data?.invitations || []).filter(
      (i) =>
        i.email.toLowerCase().includes(search.trim().toLowerCase()) &&
        (role === "all" || i.account_role === role) &&
        (validity === "all" || invitationValidity(i) === validity),
    );
  return (
    <Screen
      title="Office Team"
      description={`Account members and invitations in ${team.data?.office_name || organization?.name || "your Office"}.`}
      onRefresh={() => void refresh()}
      refreshing={team.loading || invitations.loading}
      actions={
        canManage ? (
          <Button onPress={() => setInvite(true)}>+ Invite Member</Button>
        ) : undefined
      }
    >
      <Notice>
        Account membership belongs to your Office. Project teams and temporary
        project participation are managed separately.
      </Notice>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={
          tab === "active" ? "Search name or email" : "Search invitation email"
        }
      />
      <Choice
        label="Account role"
        value={role}
        onChange={setRole}
        options={[
          { value: "all", label: "All roles" },
          { value: "head", label: "Head" },
          { value: "member", label: "Member" },
          { value: "accounting_staff", label: "Accounting Staff" },
        ]}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          {
            id: "active",
            label: `Active Members (${team.data?.members.length || 0})`,
          },
          {
            id: "pending",
            label: `Invitations (${invitations.data?.invitations.length || 0})`,
          },
        ]}
      />
      {tab === "active" ? (
        team.error ? (
          <ErrorState error={team.error} retry={() => void team.refresh()} />
        ) : !team.data ? (
          <Loading />
        ) : shownMembers.length ? (
          shownMembers.map((person) => (
            <Card key={person.id} title={person.full_name}>
              <LabelValue label="Email" value={person.email} />
              <LabelValue
                label="Account role"
                value={person.role.replaceAll("_", " ")}
              />
              <Status value={person.is_active ? "active" : "inactive"} />
              <Button variant="outline" onPress={() => setMember(person)}>
                View member
              </Button>
            </Card>
          ))
        ) : (
          <Empty title="No matching Office members" />
        )
      ) : (
        <>
          <Choice
            label="Invitation status"
            value={validity}
            onChange={setValidity}
            options={["all", "pending", "accepted", "expired", "revoked"].map(
              (value) => ({
                value,
                label: value === "all" ? "All statuses" : value,
              }),
            )}
          />
          {invitations.error ? (
            <ErrorState
              error={invitations.error}
              retry={() => void invitations.refresh()}
            />
          ) : !invitations.data ? (
            <Loading />
          ) : shownInvitations.length ? (
            shownInvitations.map((item) => (
              <Card key={item.id} title={item.email}>
                <Row>
                  <Status value={invitationValidity(item)} />
                  <Status
                    value={item.email_delivery_status || "Not yet dispatched"}
                  />
                </Row>
                <LabelValue
                  label="Role"
                  value={item.account_role.replaceAll("_", " ")}
                />
                <LabelValue
                  label="Expires"
                  value={dateLabel(item.expires_at)}
                />
                <LabelValue label="Dispatch count" value={item.send_count} />
                {!!item.delivery_error && (
                  <Notice>{item.delivery_error}</Notice>
                )}
                {!!(canManage && invitationCanManage(item)) && (
                  <Row>
                    <Button
                      variant="outline"
                      busy={action.busy}
                      onPress={() => void manage(item, "resend")}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      disabled={action.busy}
                      onPress={() => void manage(item, "copy")}
                    >
                      Copy fresh link
                    </Button>
                    <Button
                      variant="danger"
                      disabled={action.busy}
                      onPress={() => void manage(item, "revoke")}
                    >
                      Revoke
                    </Button>
                  </Row>
                )}
              </Card>
            ))
          ) : (
            <Empty title="No matching invitations" />
          )}
        </>
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {!!action.notice && <Notice>{action.notice}</Notice>}
      <Sheet
        open={!!member}
        title={member?.full_name || "Office member"}
        onClose={() => setMember(undefined)}
        presentation="inspector"
      >
        {!!member && (
          <>
            <LabelValue label="Email" value={member.email} />
            <LabelValue
              label="Account role"
              value={member.role.replaceAll("_", " ")}
            />
            <LabelValue
              label="Status"
              value={member.is_active ? "Active" : "Inactive"}
            />
            <Notice>
              Office membership is separate from project participation and task
              execution teams.
            </Notice>
          </>
        )}
      </Sheet>
      {!!(!!invite && canManage) && (
        <InviteOfficePeople
          onClose={() => setInvite(false)}
          onSaved={refresh}
        />
      )}
    </Screen>
  );
}
function InviteOfficePeople({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    [rows, setRows] = useState([
      {
        id: crypto.randomUUID(),
        email: "",
        account_role: "member" as InvitedRole,
      },
    ]),
    [locked, setLocked] = useState(false);
  const action = useAction();
  const patch = (id: string, changes: Partial<(typeof rows)[number]>) =>
    setRows((old) =>
      old.map((row) => (row.id === id ? { ...row, ...changes } : row)),
    );
  const submit = () =>
    action.run(async () => {
      const emails = rows.map((r) => r.email.trim().toLowerCase());
      if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
        throw new Error("Enter a valid email address for each person.");
      if (new Set(emails).size !== rows.length)
        throw new Error("Use each email address only once.");
      if (
        !(await confirmAction(
          "Send Office invitations?",
          `${rows.length} invitation(s). These create Office account membership after acceptance. Project-only invitations are managed inside the project.`,
          "Send invitations",
        ))
      )
        return;
      const key = "office-invite:" + emails.sort().join(":");
      if (await draftStore.get(profile!.id, key))
        throw new Error(
          "Check the invitation list before sending this batch again.",
        );
      await draftStore.set(profile!.id, key, { at: Date.now() });
      setLocked(true);
      const result = await sendInvitations(
        rows.map((r) => ({
          email: r.email.trim(),
          account_role: r.account_role,
        })),
      );
      await onSaved();
      const errors = result.results.filter((r) => r.error);
      if (errors.length)
        throw new Error(errors.map((r) => `${r.email}: ${r.error}`).join("\n"));
      onClose();
    });
  return (
    <Sheet
      open
      title="Invite Member"
      onClose={onClose}
      busy={action.busy}
      footer={
        <Button
          busy={action.busy}
          disabled={locked}
          onPress={() => void submit()}
        >
          Send invitations
        </Button>
      }
    >
      <Notice>
        Invite up to five people. Accounting Staff is an account role; project
        representatives use the project invitation workflow.
      </Notice>
      {rows.map((row, index) => (
        <Card key={row.id} title={`Person ${index + 1}`}>
          <Field
            label="Email address"
            value={row.email}
            onChangeText={(email) => patch(row.id, { email })}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!action.busy && !locked}
          />
          <Choice
            label="Account role"
            value={row.account_role}
            onChange={(account_role: InvitedRole) =>
              patch(row.id, { account_role })
            }
            disabled={action.busy || locked}
            options={[
              { value: "member", label: "Member" },
              { value: "accounting_staff", label: "Accounting Staff" },
            ]}
          />
          {!!(rows.length > 1) && (
            <Button
              variant="ghost"
              disabled={action.busy || locked}
              onPress={() =>
                setRows((old) => old.filter((r) => r.id !== row.id))
              }
            >
              Remove person
            </Button>
          )}
        </Card>
      ))}
      {!!(rows.length < 5) && (
        <Button
          variant="outline"
          disabled={action.busy || locked}
          onPress={() =>
            setRows((old) => [
              ...old,
              { id: crypto.randomUUID(), email: "", account_role: "member" },
            ])
          }
        >
          Add another person
        </Button>
      )}
      {!!action.error && <ErrorState error={action.error} />}
    </Sheet>
  );
}
