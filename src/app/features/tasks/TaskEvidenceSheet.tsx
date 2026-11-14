import { useState } from "react";
import { Button, Field, Notice, Sheet } from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
  const action = useAction();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [request, setRequest] = useState(saved);
  const [stage, report] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const save = () =>
    action.run(async () => {
      if (confirmed) return;
      if (!request && !note.trim()) throw new Error("Enter a completion note.");
      if (
        !request &&
        !(await confirmAction(
          "Submit evidence for review?",
          `${files.length} attached files. Your reviewer will see this note and the selected evidence.`,
          "Submit for review",
        ))
      )
        return;
      const attempt = request || {
        id: crypto.randomUUID(),
        note: note.trim(),
        files,
        uploaded: [],
      };
      await draftStore.set(actor, evidenceScope(taskId), attempt);
      setRequest(attempt);
      await sendTaskEvidence({
        actor,
        taskId,
        request: attempt,
        verifyAccess,
        report,
      });
      setConfirmed(true);
      report("Submitted for approval");
      await draftStore.remove(actor, evidenceScope(taskId)).catch(() => {});
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
      await onSaved().catch(() => {});
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title="Complete task"
      busy={action.busy}
      onClose={onClose}
      footer={
        <Button
          busy={action.busy}
          disabled={!confirmed && !request && !note.trim()}
          onPress={confirmed ? onClose : () => void save()}
        >
          {confirmed ? "Done" : "Submit for review"}
        </Button>
      }
    >
      {!request && (
        <>
          <Field
            label="Completion note"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={5000}
          />
          <EvidencePicker
            files={files}
            onChange={setFiles}
            disabled={action.busy}
            run={(pick) => void action.run(pick)}
          />
        </>
      )}
      {!!stage && <Notice>{stage}</Notice>}
    </Sheet>
  );
}
