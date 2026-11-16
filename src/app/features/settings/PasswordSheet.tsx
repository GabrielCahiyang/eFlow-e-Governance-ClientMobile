import { useEffect, useRef } from "react";
import { Button, Field, Notice, Sheet } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import {
  formDraftKey,
  useRetainedDraft,
} from "../../shared/formDraftMemory";
import { PublicMessageError } from "../../shared/userMessages";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import { signInOnMobile } from "../authentication/mobileSignIn";
import { supabase } from "../../../platform/supabase";
import { passwordChangeError } from "./passwordRules";
export function PasswordSheet({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth(),
    { toast } = useToast(),
    draftKey = formDraftKey(user?.id, "password-change"),
    [draft, setDraft, clearDraft] = useRetainedDraft(draftKey, true, () => ({
      current: "",
      next: "",
      confirmation: "",
    }), { restoreOnOpen: false }),
    { current, next, confirmation } = draft,
    action = useAction(),
    alive = useRef(true),
    actor = useRef(user?.id);
  actor.current = user?.id;
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  const save = () =>
    action.run(async () => {
      const identity = user?.id;
      const issue = passwordChangeError(current, next, confirmation);
      if (issue) throw new PublicMessageError(issue);
      if (!identity || !user?.email)
        throw new PublicMessageError(
          "Your session has expired. Please sign in again.",
        );
      if (
        !(await confirmAction(
          "Change your password?",
          "Your current password will be verified before saving the new one.",
          "Update password",
        ))
      )
        return;
      await signInOnMobile(user.email, current);
      if (!alive.current || actor.current !== identity) return;
      const verified = await supabase.auth.getUser();
      if (verified.error) throw verified.error;
      if (
        verified.data.user?.id !== identity ||
        !alive.current ||
        actor.current !== identity
      )
        throw new PublicMessageError(
          "Your account changed. Sign in again before changing its password.",
        );
      const result = await supabase.auth.updateUser({ password: next });
      if (result.error) throw result.error;
      clearDraft();
      toast("Password updated.", "success");
      if (alive.current) {
        onSaved();
        onClose();
      }
    });
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  return (
    <Sheet
      actionError={action.error}
      open
      title="Change your password"
      description="Confirm your current password before choosing a new one."
      onClose={close}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Update password
        </Button>
      }
    >
      <Field
        label="Current password"
        required
        value={current}
        onChangeText={(value) => setDraft({ current: value })}
        secureTextEntry
        autoComplete="current-password"
        maxLength={128}
        editable={!action.busy}
      />
      <Field
        label="New password"
        required
        value={next}
        onChangeText={(value) => setDraft({ next: value })}
        secureTextEntry
        autoComplete="new-password"
        maxLength={128}
        editable={!action.busy}
      />
      <Field
        label="Confirm new password"
        required
        value={confirmation}
        onChangeText={(value) => setDraft({ confirmation: value })}
        secureTextEntry
        autoComplete="new-password"
        maxLength={128}
        editable={!action.busy}
      />
      <Notice>Use 12 to 128 characters. Keep your password private.</Notice>
    </Sheet>
  );
}
