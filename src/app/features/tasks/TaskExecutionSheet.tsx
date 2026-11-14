import { nativeWindow } from "../../../platform/webRuntime";
import { useState } from "react";
import {
  Button,
  Choice,
  Field,
  LabelValue,
  Sheet,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useAuth } from "../authentication";
import {
  chooseFiles,
  asServiceFile,
  type PickedFile,
} from "../../../platform/files";
import { submitProgressUpdate } from "../../../core/web/app/services/taskDiscussionService";
export function TaskExecutionSheet({
  taskId,
  onClose,
  verifyAccess,
  onSaved,
}: {
  taskId: string;
  onClose: () => void;
  verifyAccess: () => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    action = useAction();
  const [note, setNote] = useState(""),
    [next, setNext] = useState(""),
    [blocker, setBlocker] = useState(""),
    [category, setCategory] = useState("None"),
    [files, setFiles] = useState<PickedFile[]>([]);
  const save = () =>
    action.run(async () => {
      if (!profile) throw new Error("Sign in again.");
      if (category !== "None" && !blocker.trim())
        throw new Error("Describe what is blocking the work.");
      await verifyAccess();
      await submitProgressUpdate({
        taskId,
        author: { id: profile.id, name: profile.full_name },
        blockerCategory: category,
        blocker,
        nextStep: next,
        note,
        attachment: files[0] ? await asServiceFile(files[0]) : null,
      });
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
      await onSaved().catch(() => {});
      onClose();
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title="Update work"
      onClose={onClose}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Post update
        </Button>
      }
    >
      <Choice
        label="Blocker category"
        value={category}
        onChange={setCategory}
        options={[
          "None",
          "Resources",
          "Dependency",
          "Approval",
          "Technical",
          "Other",
        ].map((value) => ({ value, label: value }))}
      />
      {!!(category !== "None") && (
        <Field
          label="Blocker"
          value={blocker}
          onChangeText={setBlocker}
          maxLength={3000}
          multiline
        />
      )}
      <Field label="Next step (optional)" value={next} onChangeText={setNext} maxLength={300} />
      <Field label="Work note" value={note} onChangeText={setNote} maxLength={3000} multiline />
      <Button
        variant="outline"
        onPress={() =>
          void action.run(async () => setFiles(await chooseFiles("*/*", false)))
        }
      >
        Attach evidence (optional)
      </Button>
      {files.map((file) => (
        <LabelValue
          key={file.uri}
          label={file.name}
          value={`${Math.ceil(file.size / 1024)} KB`}
        />
      ))}
    </Sheet>
  );
}
