import { Text } from "../../components/ui/Typography";
import { useRef, useState } from "react";
import Sparkles from "lucide-react-native/icons/sparkles";
import { Button, ErrorState, colors } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import {
  prepareAutoAssignment,
  applyAutoAssignment,
  type AutoAssignmentRequest,
} from "../../../core/web/app/features/staffing/services/autoAssignment";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import { draftStore } from "../../../platform/draftStore";
export function AutoAssignButton({
  rootId,
  onSaved,
  disabled,
}: {
  rootId: string;
  onSaved: (data: WorkTreeSnapshot) => Promise<void>;
  disabled?: boolean;
}) {
  const { profile } = useAuth(),
    action = useAction();
  const [stage, setStage] = useState("");
  const request = useRef<AutoAssignmentRequest | undefined>(undefined);
  const assign = () =>
    action.run(async () => {
      if (!profile) throw new Error("Sign in again.");
      if (!request.current)
        request.current =
          (await draftStore.get<AutoAssignmentRequest>(
            profile.id,
            "auto-assign." + rootId,
          )) || undefined;
      if (!request.current) {
        const fresh = await fetchWorkTree(rootId);
        setStage("Reviewing current work and eligible people…");
        const plan = await prepareAutoAssignment(fresh, (update) =>
          setStage(
            update.status === "queued"
              ? `Waiting for AI · ${update.jobsAhead} jobs ahead`
              : "AI is choosing and reviewing a suitable team…",
          ),
        );
        setStage("LAYA review and validation completed.");
        if (
          !(await confirmAction(
            "Apply the AI team?",
            "The chosen Lead and contributors will be assigned to this task. Eligible existing people selected by the AI will also be enrolled in this project.",
            "Apply team",
          ))
        ) {
          setStage("");
          return;
        }
        request.current = plan;
        await draftStore.set(profile.id, "auto-assign." + rootId, plan);
      }
      setStage("Saving project membership and task assignments…");
      const receipt = await applyAutoAssignment(request.current);
      await draftStore.remove(profile.id, "auto-assign." + rootId);
      request.current = undefined;
      await onSaved(receipt);
      setStage("Team saved.");
    });
  return (
    <>
      <Button
        variant="outline"
        icon={<Sparkles size={18} color={colors.primary} />}
        busy={action.busy}
        disabled={disabled}
        onPress={() => void assign()}
      >
        AI auto assign
      </Button>
      {!!stage && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}
        >
          {stage}
        </Text>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </>
  );
}
