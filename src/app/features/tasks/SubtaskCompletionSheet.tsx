import { useRef, useState } from "react";
import { Button, ErrorState, Field, Notice, Sheet } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { supabase } from "../../../platform/supabase";
import { draftStore } from "../../../platform/draftStore";
import { chooseFiles, type PickedFile } from "../../../platform/files";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";

type Attachment = {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
};
type Attempt = { id: string; note: string; attachments: Attachment[] };
const allowed = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export function SubtaskCompletionSheet({
  node,
  actorId,
  rootId,
  onClose,
  onSaved,
}: {
  node: { id: string; title: string };
  actorId: string;
  rootId: string;
  onClose: () => void;
  onSaved: (tree: WorkTreeSnapshot) => Promise<void>;
}) {
  const [note, setNote] = useState(""),
    [files, setFiles] = useState<PickedFile[]>([]),
    [locked, setLocked] = useState(false),
    [committed, setCommitted] = useState(false);
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
      if (!recovery.data && !local.current) {
        if (note.length > 3000)
          throw new Error("Use 3,000 characters or fewer.");
        if (
          files.length > 10 ||
          files.some(
            (f) => !allowed.includes(f.type) || f.size > 25 * 1024 * 1024,
          )
        )
          throw new Error(
            "Choose up to ten supported files, each no larger than 25 MB.",
          );
        local.current = {
          id: crypto.randomUUID(),
          note: note.trim(),
          attachments: [],
        };
      }
      setLocked(true);
      const attempt = recovery.data || local.current!;
      if (!recovery.data) {
        for (let i = attempt.attachments.length; i < files.length; i++) {
          const file = files[i],
            bytes = await file.arrayBuffer();
          if (!bytes.byteLength || bytes.byteLength > 25 * 1024 * 1024)
            throw new Error(
              "Each evidence file must be nonempty and up to 25 MB.",
            );
          const path =
            "subtasks/" +
            node.id +
            "/" +
            attempt.id +
            "/" +
            i +
            "-" +
            file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const { error } = await supabase.storage
            .from("task-attachments")
            .upload(path, bytes, { contentType: file.type, upsert: false });
          if (error) throw new Error(error.message);
          attempt.attachments.push({
            fileName: file.name,
            filePath: path,
            fileSize: bytes.byteLength,
            mimeType: file.type,
          });
        }
        await draftStore.set(actorId, scope, attempt);
      }
      const result = await supabase.rpc("complete_subitem", {
        p_subtask_id: node.id,
        p_completion: attempt,
      });
      if (result.error) throw new Error(result.error.message);
      if (result.data?.id !== node.id || result.data?.status !== "completed")
        throw new Error(
          "Completion could not be verified. Retry the saved request.",
        );
      setCommitted(true);
      await draftStore.remove(actorId, scope);
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
          <Button
            variant="outline"
            busy={action.busy}
            onPress={() =>
              void action.run(async () => {
                const next = await chooseFiles(allowed, true);
                if (next.length) setFiles(next);
              })
            }
          >
            Attach evidence
          </Button>
          {files.map((file, i) => (
            <Notice key={i}>{file.name}</Notice>
          ))}
          {!!files.length && (
            <Button variant="ghost" onPress={() => setFiles([])}>
              Clear attachments
            </Button>
          )}
        </>
      )}
      {!!recovery.error && (
        <ErrorState
          error={recovery.error}
          retry={() => void recovery.refresh()}
        />
      )}
      {!!action.error && <ErrorState error={action.error} />}
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
