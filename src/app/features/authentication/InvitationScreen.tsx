import { ProjectGuestProfile } from "./ProjectGuestProfile";
import { useRef, useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Screen,
} from "../../components/ui";
import { EFlowMark } from "../../components/brand/EFlowMark";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { useAuth } from "./AuthProvider";
import { signInOnMobile } from "./mobileSignIn";
import {
  acceptInvitation,
  createInvitedAccount,
  validateInvitation,
} from "../../../core/web/app/features/invitations/services/invitationService";
import {
  acceptProjectInvitation,
  createProjectGuest,
  validateProjectInvitation,
} from "../../../core/web/app/features/project-invitations/services/projectInvitationService";
import type { InvitationMetadata } from "../../../core/web/app/features/invitations/types";
export function InvitationScreen({
  token,
  projectGuest,
  onClose,
}: {
  token: string;
  projectGuest: boolean;
  onClose: () => void;
}) {
  const { user, refresh, signOut } = useAuth(),
    action = useAction({ requireAccess: false }),
    attempt = useRef(crypto.randomUUID());
  const invite = useFacts<InvitationMetadata & { id?: string }>(
    "invitation:" + projectGuest + ":" + token,
    async () => {
      if (!projectGuest) return validateInvitation(token);
      const raw = await validateProjectInvitation(token);
      return {
        ...raw,
        expires_at: raw.expires_at || "",
        account_role: "member",
        invitation_type: "project_member",
      };
    },
  );
  const [name, setName] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [existing, setExisting] = useState<boolean>(),
    [acceptedRequest, setAcceptedRequest] = useState<string>();
  const data = invite.data,
    isExisting = existing ?? data?.existing_account,
    wrong = !!(
      user?.email &&
      data &&
      user.email.toLowerCase() !== data.email.toLowerCase()
    );
  const accept = projectGuest ? acceptProjectInvitation : acceptInvitation,
    create = projectGuest ? createProjectGuest : createInvitedAccount;
  const finish = () =>
    action.run(async () => {
      if (!data || wrong)
        throw new Error("Switch accounts to accept this invitation.");
      if (
        ((!isExisting && !user) || data.needs_full_name) &&
        (name.trim().length < 2 || name.length > 160)
      )
        throw new Error("Enter your full name (2–160 characters).");
      if (!user) {
        if (!password) throw new Error("Enter your password.");
        if (!isExisting) {
          if (password.length < 12 || password.length > 128)
            throw new Error("Use a password with 12 to 128 characters.");
          if (password !== confirmation)
            throw new Error("Passwords must match.");
          try {
            await create(token, name.trim(), password, attempt.current);
          } catch (creationError) {
            try {
              await signInOnMobile(data.email, password);
            } catch {
              throw creationError;
            }
            await accept(token, name.trim());
          }
        }
        await signInOnMobile(data.email, password);
      }
      await accept(token, name.trim() || undefined);
      setPassword("");
      setConfirmation("");
      await refresh();
      if (projectGuest && data.id) {
        setAcceptedRequest(data.id);
        return;
      }
      onClose();
    });
  if (acceptedRequest)
    return <ProjectGuestProfile requestId={acceptedRequest} onDone={onClose} />;
  return (
    <Screen title="You’re invited">
      <EFlowMark height={42} state={action.busy ? "submitting" : "idle"} />
      {invite.loading ? (
        <Loading layout="form" label="Checking your invitation…" />
      ) : data ? (
        <Card
          title={
            data.project_title
              ? `Join ${data.project_title}.`
              : `Join ${data.office_name}’s team.`
          }
        >
          <LabelValue label="Office" value={data.office_name} />
          <LabelValue label="Email" value={data.email} />
          <LabelValue
            label="Access"
            value={
              projectGuest
                ? "Project member"
                : data.project_title
                  ? data.workspace_access === "observer"
                    ? "Observer · read only"
                    : "Collaborating Office"
                  : data.account_role === "accounting_staff"
                    ? "Accounting Staff"
                    : "Member"
            }
          />
          {!!data.project_title && (
            <Notice>
              Project access keeps your account role and Office membership
              unchanged. Work is assigned separately.
            </Notice>
          )}
          {!!projectGuest && (
            <Notice>
              {data.engagement || "Project participation"} ·{" "}
              {data.access_end
                ? `Access ends ${new Date(data.access_end).toLocaleString()}`
                : data.until_close
                  ? "Until project completion or archive"
                  : "Permanent project membership"}
              . Requested skills: {data.skills?.join(", ") || "None specified"}.{" "}
              {data.summary || ""}
            </Notice>
          )}
          {wrong ? (
            <>
              <Notice>
                You are signed in as {user?.email}. Switch accounts to accept
                this invitation.
              </Notice>
              <Button
                busy={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await signOut();
                    setPassword("");
                    setConfirmation("");
                  })
                }
              >
                Switch account
              </Button>
            </>
          ) : (
            <>
              {!!((!isExisting && !user) || data.needs_full_name) && (
                <Field
                  label="Full name"
                  value={name}
                  onChangeText={setName}
                  maxLength={160}
                  editable={!action.busy}
                />
              )}{" "}
              {!user && (
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  maxLength={128}
                  editable={!action.busy}
                  autoComplete={
                    isExisting ? "current-password" : "new-password"
                  }
                />
              )}{" "}
              {!!(!isExisting && !user) && (
                <Field
                  label="Confirm password"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  secureTextEntry
                  maxLength={128}
                  editable={!action.busy}
                />
              )}
              <Button busy={action.busy} onPress={() => void finish()}>
                {isExisting || user
                  ? data.project_title
                    ? "Join project"
                    : "Join your Office"
                  : "Create account"}
              </Button>
              {!user && (
                <Button
                  variant="ghost"
                  disabled={action.busy}
                  onPress={() => {
                    setExisting(!isExisting);
                    setPassword("");
                    setConfirmation("");
                  }}
                >
                  {isExisting
                    ? "Need to create an account?"
                    : "Already have an account? Sign in"}
                </Button>
              )}
              <Notice>
                Your email, Office and access terms are set by this invitation.
                Your password stays private.
              </Notice>
            </>
          )}
        </Card>
      ) : (
        <ErrorState
          error={invite.error || "Ask your Office Head for a fresh invitation."}
          retry={() => void invite.refresh()}
        />
      )}{" "}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      <Button variant="ghost" disabled={action.busy} onPress={onClose}>
        Back to eFlow
      </Button>
    </Screen>
  );
}
