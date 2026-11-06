import { useEffect, useRef, useState } from "react";
import { Button, ErrorState, Field, Notice, Sheet } from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirmation, setConfirmation] = useState(""),
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
  const clear = () => {
    setCurrent("");
    setNext("");
    setConfirmation("");
  };
  const save = () =>
    action.run(async () => {
      const identity = user?.id;
      try {
        const issue = passwordChangeError(current, next, confirmation);
        if (issue) throw new Error(issue);
        if (!identity || !user?.email)
          throw new Error("Your session has expired. Please sign in again.");
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
          throw new Error(
            "Your account changed. Sign in again before changing its password.",
          );
        const result = await supabase.auth.updateUser({ password: next });
        if (result.error) throw result.error;
        if (alive.current) {
          onSaved();
          onClose();
        }
      } finally {
        clear();
      }
    });
  const close = async () => {
    if (action.busy) return;
    if (
      (current || next || confirmation) &&
      !(await confirmAction(
        "Discard password entries?",
        "The passwords will be cleared from this form.",
        "Discard entries",
        true,
      ))
    )
      return;
    clear();
    onClose();
  };
  return (
    <Sheet
      open
      title="Change your password"
      description="Confirm your current password before choosing a new one."
      onClose={() => void close()}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Update password
        </Button>
      }
    >
      <Field
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
        maxLength={128}
        editable={!action.busy}
      />
      <Field
        label="New password"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        maxLength={128}
        editable={!action.busy}
      />
      <Field
        label="Confirm new password"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoComplete="new-password"
        maxLength={128}
        editable={!action.busy}
      />
      <Notice>Use 12 to 128 characters. Keep your password private.</Notice>
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
