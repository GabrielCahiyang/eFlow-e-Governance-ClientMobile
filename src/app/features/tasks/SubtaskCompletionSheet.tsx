import { useRef, useState } from "react";
import { Button, ErrorState, Field, Notice, Sheet } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { useAction } from "../../shared/useAction";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import {
  PublicMessageError,
  isDeterministicRejection,
} from "../../shared/userMessages";
import { useFacts } from "../../shared/useFacts";
import { supabase } from "../../../platform/supabase";
import { draftStore } from "../../../platform/draftStore";
import type { EvidenceFile } from "../../../platform/evidenceFiles";
import { EvidencePicker, evidenceIssue } from "./EvidencePicker";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";

import { completionMode } from "./branchInspector";
import { uploadEvidenceFile } from "./taskEvidence";

type Attachment = {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
};
type Attempt = {
  id: string;
  note: string;
  attachments: Attachment[];
  files?: EvidenceFile[];
};
export function SubtaskCompletionSheet({
  node,
  actorId,
  rootId,
  projectId,
  officeId,
  onClose,
  onSaved,
}: {
  node: { id: string; title: string };
  actorId: string;
  rootId: string;
  projectId: string;
  officeId: string | null;
  onClose: () => void;
  onSaved: (tree: WorkTreeSnapshot) => Promise<void>;
}) {
  const [locked, setLocked] = useState(false),
    [committed, setCommitted] = useState(false),
    [stage, report] = useState("");
  const local = useRef<Attempt | null>(null);
  const { toast } = useToast();
  const action = useAction();
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(actorId, "subtask-complete:" + node.id),
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
  const scope = "complete-subtask:" + node.id;
  const recovery = useFacts(scope + ":" + actorId, () =>
    draftStore.get<Attempt>(actorId, scope),
  );
  const frozen = locked || !!recovery.data;
  async function complete() {
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== actorId)
      throw new PublicMessageError("Sign in with the same account to finish this subtask.");
    if (!committed) {
      let attempt = recovery.data || local.current;
      const needsUpload =
        attempt?.files && attempt.attachments.length < attempt.files.length;
      {
        const tree = await fetchWorkTree(rootId);
        if (
          tree.root.project !== projectId ||
          tree.root.office !== officeId ||
          (completionMode(tree, node.id, actorId) !== "direct" &&
            (!attempt ||
              needsUpload ||
              !tree.nodes.some(
                (item) => item.id === node.id && item.status === "completed",
              )))
        )
          throw new PublicMessageError(
            "Current access does not permit direct completion of this subtask.",
          );
      }
      if (typeof supabase.from === "function") {
        const openCash = await supabase
          .from("petty_cash_requests")
          .select("id")
          .eq("task_id", rootId)
          .eq("subtask_id", node.id)
          .not("status", "in", "(settled,rejected,cancelled)")
          .limit(1);
        if (openCash.error)
          throw Object.assign(new Error(openCash.error.message), {
            code: openCash.error.code,
          });
        if ((openCash.data?.length || 0) > 0)
          throw new PublicMessageError(
            "Settle all outstanding subtask cash before completing this subtask.",
          );
      }
      if (!attempt) {
        if (note.length > 3000)
          throw new PublicMessageError("Use 3,000 characters or fewer.");
        const issue = evidenceIssue(files);
        if (issue) throw new PublicMessageError(issue);
        attempt = {
          id: crypto.randomUUID(),
          note: note.trim(),
          attachments: [],
          files,
        };
        await draftStore.set(actorId, scope, attempt);
        local.current = attempt;
      }
      const hadRecovery = !!recovery.data;
      setLocked(true);
      try {
        for (
          let index = attempt.attachments.length;
          index < (attempt.files?.length || 0);
          index++
        ) {
          const file = attempt.files![index];
          report(
            `Uploading file ${index + 1} of ${attempt.files!.length} · ${file.name}`,
          );
          const path = `subtasks/${node.id}/${attempt.id}/${index}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          attempt.attachments.push(await uploadEvidenceFile(path, file));
          await draftStore.set(actorId, scope, attempt);
        }
        report("Recording completion");
        const result = await supabase.rpc("complete_subitem", {
          p_subtask_id: node.id,
          p_completion: {
            id: attempt.id,
            note: attempt.note,
            attachments: attempt.attachments,
          },
        });
        if (result.error)
          throw Object.assign(new Error(result.error.message), {
            code: result.error.code,
          });
        if (result.data?.id !== node.id || result.data?.status !== "completed")
          throw new PublicMessageError(
            "Completion could not be verified. Retry the saved request.",
          );
      } catch (err) {
        if (!hadRecovery && isDeterministicRejection(err)) {
          await draftStore.remove(actorId, scope).catch(() => {});
          local.current = null;
          setLocked(false);
          report("");
        }
        throw err;
      }
      clearDraft();
      setCommitted(true);
      await draftStore.remove(actorId, scope).catch(() => {});
      toast("Subtask completed.", "success");
    }
    try {
      await onSaved(await fetchWorkTree(rootId));
    } catch {
      throw new PublicMessageError("Subtask completed. The work list could not refresh.");
    }
  }
  return (
    <Sheet
      actionError={action.error}
      open
      title="Complete subtask"
      busy={action.busy}
      onClose={close}
    >
      <Notice>
        {node.title}. The parent task still goes through final review.
      </Notice>
      {!frozen && (
        <>
          <Field
            label="Completion note"
            value={note}
            onChangeText={(next) => updateDraft({ note: next })}
            multiline
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
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      <Button
        busy={action.busy}
        disabled={recovery.loading || !!recovery.error}
        onPress={() => void action.run(complete, "", close)}
      >
        {committed ? "Refresh work list" : "Mark as complete"}
      </Button>
    </Sheet>
  );
}
