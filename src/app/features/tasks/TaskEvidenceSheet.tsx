import { useState } from "react";
import Check from "lucide-react-native/icons/check";
import X from "lucide-react-native/icons/x";
import { Button, Field, Notice, Sheet } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import {
  PublicMessageError,
  isDeterministicRejection,
} from "../../shared/userMessages";
import { confirmAction } from "../../shared/confirm";
import { draftStore } from "../../../platform/draftStore";
import type { EvidenceFile } from "../../../platform/evidenceFiles";
import { nativeWindow } from "../../../platform/webRuntime";
import { EvidencePicker } from "./EvidencePicker";
import {
  evidenceScope,
  sendTaskEvidence,
  type EvidenceRequest,
} from "./taskEvidence";

export function TaskEvidenceSheet({
  actor,
  taskId,
  saved,
  verifyAccess,
  onSaved,
  onClose,
}: {
  actor: string;
  taskId: string;
  saved: EvidenceRequest | null;
  verifyAccess: () => Promise<void>;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const palette = useTheme();
  const action = useAction();
  const [request, setRequest] = useState(saved);
  const [stage, report] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(actor, "task-evidence:" + taskId),
    true,
    () => ({
      note: "",
      files: [] as EvidenceFile[],
    }),
  );
  const { note, files } = draft;
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  const save = () =>
    action.run(async () => {
      if (confirmed) return;
      if (!request && !note.trim()) throw new PublicMessageError("Enter a completion note.");
      if (
        !request &&
        !(await confirmAction(
          "Submit evidence for review?",
          `${files.length} attached files. Your reviewer will see this note and the selected evidence.`,
          "Submit for review",
        ))
      )
        return;
      const hadSaved = !!request;
      const attempt = request || {
        id: crypto.randomUUID(),
        note: note.trim(),
        files,
        uploaded: [],
      };
      await draftStore.set(actor, evidenceScope(taskId), attempt);
      setRequest(attempt);
      try {
        await sendTaskEvidence({
          actor,
          taskId,
          request: attempt,
          verifyAccess,
          report,
        });
      } catch (err) {
        if (!hadSaved && isDeterministicRejection(err)) {
          await draftStore.remove(actor, evidenceScope(taskId)).catch(() => {});
          setRequest(null);
          report("");
        }
        throw err;
      }
      clearDraft();
      setConfirmed(true);
      report("Submitted for approval");
      await draftStore.remove(actor, evidenceScope(taskId)).catch(() => {});
      toast("Submitted for review.", "success");
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
      await onSaved().catch(() => {});
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title="Complete task"
      busy={action.busy}
      onClose={close}
      footer={
        <Button
          busy={action.busy}
          disabled={!confirmed && !request && !note.trim()}
          icon={
            confirmed ? (
              <X size={16} color={palette.onPrimary} />
            ) : (
              <Check size={16} color={palette.onPrimary} />
            )
          }
          onPress={confirmed ? close : () => void save()}
        >
          {confirmed ? "Close completion form" : "Submit for review"}
        </Button>
      }
    >
      {!request && (
        <>
          <Field
            label="Completion note"
            required
            value={note}
            onChangeText={(next) => updateDraft({ note: next })}
            multiline
            maxLength={5000}
          />
          <EvidencePicker
            files={files}
            onChange={(next) => updateDraft({ files: next })}
            disabled={action.busy}
            run={(pick) => void action.run(pick)}
          />
        </>
      )}
      {!!stage && <Notice>{stage}</Notice>}
    </Sheet>
  );
}
