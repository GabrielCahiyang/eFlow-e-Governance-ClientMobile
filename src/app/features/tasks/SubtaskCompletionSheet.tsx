import { useRef, useState } from "react";
import { Button, ErrorState, Field, Notice, Sheet } from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
  const [note, setNote] = useState(""),
    [files, setFiles] = useState<EvidenceFile[]>([]),
    [locked, setLocked] = useState(false),
    [committed, setCommitted] = useState(false),
    [stage, report] = useState("");
  const local = useRef<Attempt | null>(null);
  const action = useAction();
  const scope = "complete-subtask:" + node.id;
  const recovery = useFacts(scope + ":" + actorId, () =>
    draftStore.get<Attempt>(actorId, scope),
  );
  const frozen = locked || !!recovery.data;
  async function complete() {
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== actorId)
      throw new Error("Sign in with the same account to finish this subtask.");
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
          throw new Error(
            "Current access does not permit direct completion of this subtask.",
          );
      }
      if (!attempt) {
        if (note.length > 3000)
          throw new Error("Use 3,000 characters or fewer.");
        const issue = evidenceIssue(files);
        if (issue) throw new Error(issue);
        attempt = {
          id: crypto.randomUUID(),
          note: note.trim(),
          attachments: [],
          files,
        };
        await draftStore.set(actorId, scope, attempt);
        local.current = attempt;
      }
      setLocked(true);
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
      if (result.error) throw new Error(result.error.message);
      if (result.data?.id !== node.id || result.data?.status !== "completed")
        throw new Error(
          "Completion could not be verified. Retry the saved request.",
        );
      setCommitted(true);
      await draftStore.remove(actorId, scope).catch(() => {});
    }
    try {
      await onSaved(await fetchWorkTree(rootId));
    } catch {
      throw new Error("Subtask completed. The work list could not refresh.");
    }
  }
  return (
    <Sheet
      open
      title="Complete subtask"
      busy={action.busy}
      onClose={() => {
        if (!action.busy) onClose();
      }}
    >
      <Notice>
        {node.title}. The parent task still goes through final review.
      </Notice>
      {!frozen && (
        <>
          <Field
            label="Completion note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
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
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
      <Button
        busy={action.busy}
        disabled={recovery.loading || !!recovery.error}
        onPress={() => void action.run(complete, "", onClose)}
      >
        {committed
          ? "Refresh work list"
          : frozen
            ? "Retry completion"
            : "Mark complete"}
      </Button>
    </Sheet>
  );
}
