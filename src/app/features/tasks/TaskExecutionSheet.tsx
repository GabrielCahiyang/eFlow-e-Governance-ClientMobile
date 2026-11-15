import { nativeWindow } from "../../../platform/webRuntime";
import {
  Button,
  Choice,
  Field,
  LabelValue,
  Row,
  Sheet,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { PublicMessageError } from "../../shared/userMessages";
import { useAuth } from "../authentication";
import {
  chooseFiles,
  asServiceFile,
  type PickedFile,
} from "../../../platform/files";
import { submitProgressUpdate } from "../../../core/web/app/services/taskDiscussionService";
export function TaskExecutionSheet({
  taskId,
  initialBlocker,
  onClose,
  verifyAccess,
  onSaved,
}: {
  taskId: string;
  initialBlocker?: string | null;
  onClose: () => void;
  verifyAccess: () => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    { toast } = useToast(),
    action = useAction();
  const [draft, updateDraft, clearDraft] = useRetainedDraft<{
    state?: "in_progress" | "stuck";
    category?: string;
    note: string;
    next: string;
    blocker: string;
    files: PickedFile[];
  }>(
    formDraftKey(profile?.id, "task-execution:" + taskId),
    true,
    () => ({
      state: "in_progress",
      note: "",
      next: "",
      blocker: "",
      files: [] as PickedFile[],
    }),
  );
  const { note, next, blocker, files } = draft;
  const workState =
    draft.state ??
    (draft.category && draft.category !== "None" ? "stuck" : "in_progress");
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  const save = () =>
    action.run(async () => {
      if (!profile) throw new PublicMessageError("Sign in again.");
      if (workState === "stuck" && !blocker.trim())
        throw new PublicMessageError("Describe what is blocking the work.");
      await verifyAccess();
      await submitProgressUpdate({
        taskId,
        author: { id: profile.id, name: profile.full_name },
        blockerCategory: workState === "stuck" ? "Other" : "None",
        blocker: workState === "stuck" ? blocker : undefined,
        nextStep: next,
        note,
        attachment: files[0] ? await asServiceFile(files[0]) : null,
      });
      clearDraft();
      toast("Work update posted.", "success");
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
      await onSaved().catch(() => {});
      onClose();
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title="Update work"
      onClose={close}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Post update
        </Button>
      }
    >
      <Choice
        label="Work state"
        value={workState}
        onChange={(value) =>
          updateDraft({
            state: value === "stuck" ? "stuck" : "in_progress",
            category: undefined,
          })
        }
        options={[
          { value: "in_progress", label: "In progress" },
          { value: "stuck", label: "Blocked" },
        ]}
      />
      {workState === "stuck" && (
        <Field
          label="Blocker"
          required
          value={blocker}
          onChangeText={(value) => updateDraft({ blocker: value })}
          maxLength={3000}
          multiline
        />
      )}
      <Field
        label="Work note"
        value={note}
        onChangeText={(value) => updateDraft({ note: value })}
        maxLength={3000}
        multiline
      />
      <Field
        label="Next step"
        value={next}
        onChangeText={(value) => updateDraft({ next: value })}
        maxLength={300}
      />
      {files.length ? (
        <Row>
          <LabelValue
            label="Attachment"
            value={`${files[0].name} (${Math.ceil(files[0].size / 1024)} KB)`}
          />
          <Button
            variant="outline"
            disabled={action.busy}
            onPress={() => updateDraft({ files: [] })}
          >
            Remove attachment
          </Button>
        </Row>
      ) : (
        <Button
          variant="outline"
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              const picked = await chooseFiles("*/*", false);
              if (picked.length) updateDraft({ files: picked.slice(0, 1) });
            })
          }
        >
          Attach evidence (optional)
        </Button>
      )}
    </Sheet>
  );
}
