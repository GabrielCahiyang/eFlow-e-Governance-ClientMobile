import { useRef, useState } from "react";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Check from "lucide-react-native/icons/check";
import LogIn from "lucide-react-native/icons/log-in";
import { useTheme } from "../../components/ui/Appearance";
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
import { PublicMessageError } from "../../shared/userMessages";
import {
  completeAccountActivation,
  validateAccountActivation,
} from "../../../core/web/app/features/account-activation/services/activationService";
import { activationRoleLabel } from "../../../core/web/app/features/account-activation/selectors";
import type { ActivationResult } from "../../../core/web/app/features/account-activation/types";
export function ActivationScreen({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const palette = useTheme();
  const preview = useFacts("activation", () =>
      validateAccountActivation(token),
    ),
    action = useAction({ requireAccess: false }),
    attempt = useRef(crypto.randomUUID());
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [result, setResult] = useState<ActivationResult>();
  return (
    <Screen title="Activate your account">
      <EFlowMark
        height={42}
        state={action.busy ? "submitting" : result ? "success" : "idle"}
      />
      {preview.loading ? (
        <Loading layout="form" label="Checking your invitation…" />
      ) : result ? (
        <Card
          title={
            result.next_step === "awaiting_authority"
              ? "Awaiting role approval"
              : "Account activated"
          }
        >
          <Notice>
            {result.next_step === "awaiting_authority"
              ? "Your Admin needs to approve your role before you can sign in."
              : "Your account is activated. Sign in with your email and new password."}
          </Notice>
          <Button
            icon={<LogIn size={16} color={palette.onPrimary} />}
            onPress={onClose}
          >
            Sign in
          </Button>
        </Card>
      ) : preview.data ? (
        <Card title="Welcome to eFlow">
          <Notice>
            Choose a password with 12 to 128 characters. Your invitation sets
            your Office and role.
          </Notice>
          <LabelValue label="Name" value={preview.data.full_name} />
          <LabelValue label="Email" value={preview.data.email} />
          <LabelValue label="Office" value={preview.data.office_name} />
          <LabelValue
            label="Role"
            value={activationRoleLabel(
              preview.data.requested_privileged_role ||
                preview.data.account_role,
            )}
          />
          {!!preview.data.requested_privileged_role && (
            <Notice>
              This role needs Admin approval after you verify your email.
            </Notice>
          )}
          <Field
            label="New password"
            required
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            maxLength={128}
            editable={!action.busy}
            autoComplete="new-password"
          />
          <Field
            label="Confirm password"
            required
            secureTextEntry
            value={confirmation}
            onChangeText={setConfirmation}
            maxLength={128}
            editable={!action.busy}
            autoComplete="new-password"
          />
          <Button
            busy={action.busy}
            icon={<Check size={16} color={palette.onPrimary} />}
            onPress={() =>
              void action.run(async () => {
                if (password.length < 12 || password.length > 128)
                  throw new PublicMessageError(
                    "Use a password with 12 to 128 characters.",
                  );
                if (password !== confirmation)
                  throw new PublicMessageError("The passwords do not match.");
                const saved = await completeAccountActivation(
                  token,
                  password,
                  attempt.current,
                );
                setPassword("");
                setConfirmation("");
                setResult(saved);
              })
            }
          >
            Activate account
          </Button>
        </Card>
      ) : (
        <ErrorState
          error={
            preview.error ||
            "This activation link is no longer valid. Ask your Admin for a new invitation."
          }
          retry={() => void preview.refresh()}
        />
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}{" "}
      {!result && (
        <Button
          variant="ghost"
          disabled={action.busy}
          icon={<ArrowLeft size={16} color={palette.primary} />}
          onPress={onClose}
        >
          Back to sign in
        </Button>
      )}
    </Screen>
  );
}
