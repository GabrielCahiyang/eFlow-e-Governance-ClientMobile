import { Text } from "../../components/ui/Typography";
import { useState } from "react";
import {
  Button,
  Choice,
  ErrorState,
  Field,
  LabelValue,
  Sheet,
  colors,
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
      if (!note.trim()) throw new Error("A work note is required.");
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
      await onSaved().catch(() => {});
      onClose();
    });
  return (
    <Sheet
      open
      title="Update work"
      onClose={onClose}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Save work update
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
          multiline
        />
      )}
      <Field label="Next step" value={next} onChangeText={setNext} />
      <Field label="Work note" value={note} onChangeText={setNote} multiline />
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
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
