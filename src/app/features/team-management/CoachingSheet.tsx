import { Button, Field, Notice, Sheet } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import {
  formDraftKey,
  useRetainedDraft,
} from "../../shared/formDraftMemory";
import type { Employee } from "../../../core/web/app/services/employeeService";
import {
  updateEmployeeNotes,
  type EmployeeNote,
} from "../../../core/web/app/services/employeeNotesService";
export function CoachingSheet({
  employee,
  note,
  actor,
  onClose,
  onSaved,
}: {
  employee: Employee;
  note?: EmployeeNote;
  actor: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const draftKey = formDraftKey(actor, "coaching:" + employee.id),
    [draft, setDraft, clearDraft] = useRetainedDraft(draftKey, true, () => ({
      strengths: note?.strengths || employee.jobDescription,
      weaknesses: note?.weaknesses || "",
      notes: note?.notes || "",
      tags: note?.tags.join(", ") || "",
    })),
    { strengths, weaknesses, notes, tags } = draft,
    { toast } = useToast(),
    action = useAction();
  const save = () =>
    action.run(async () => {
      if (
        !(await confirmAction(
          "Save member context?",
          `${employee.name}. These notes support supervision and AI assignment context. Review their accuracy before saving.`,
          "Save context",
        ))
      )
        return;
      await updateEmployeeNotes(
        employee.id,
        {
          strengths: strengths.trim(),
          weaknesses: weaknesses.trim(),
          notes: notes.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
        actor,
      );
      clearDraft();
      action.clear();
      toast("Member coaching context saved.", "success");
      await onSaved();
      onClose();
    });
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  return (
    <Sheet
      actionError={action.error}
      open
      title="Member coaching context"
      description={employee.name}
      onClose={close}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Review and save context
        </Button>
      }
    >
      <Field
        label="Strengths"
        value={strengths}
        onChangeText={(value) => setDraft({ strengths: value })}
        multiline
      />
      <Field
        label="Development areas"
        value={weaknesses}
        onChangeText={(value) => setDraft({ weaknesses: value })}
        multiline
      />
      <Field
        label="Manager notes"
        value={notes}
        onChangeText={(value) => setDraft({ notes: value })}
        multiline
      />
      <Field
        label="Skill tags (comma separated)"
        value={tags}
        onChangeText={(value) => setDraft({ tags: value })}
      />
      <Notice>
        These are manager observations, separate from verified task activity. Do
        not use them as an automatic personnel rating.
      </Notice>
    </Sheet>
  );
}
