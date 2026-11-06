import { useState } from "react";
import { Button, ErrorState, Field, Notice, Sheet } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
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
  const [strengths, setStrengths] = useState(
      note?.strengths || employee.jobDescription,
    ),
    [weaknesses, setWeaknesses] = useState(note?.weaknesses || ""),
    [notes, setNotes] = useState(note?.notes || ""),
    [tags, setTags] = useState(note?.tags.join(", ") || ""),
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
      await onSaved();
      onClose();
    });
  const close = async () => {
    if (action.busy) return;
    if (
      (strengths !== (note?.strengths || employee.jobDescription) ||
        weaknesses !== (note?.weaknesses || "") ||
        notes !== (note?.notes || "") ||
        tags !== (note?.tags.join(", ") || "")) &&
      !(await confirmAction(
        "Discard unsaved context?",
        employee.name,
        "Discard changes",
        true,
      ))
    )
      return;
    onClose();
  };
  return (
    <Sheet
      open
      title="Member coaching context"
      description={employee.name}
      onClose={() => void close()}
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
        onChangeText={setStrengths}
        multiline
      />
      <Field
        label="Development areas"
        value={weaknesses}
        onChangeText={setWeaknesses}
        multiline
      />
      <Field
        label="Manager notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Field
        label="Skill tags (comma separated)"
        value={tags}
        onChangeText={setTags}
      />
      <Notice>
        These are manager observations, separate from verified task activity. Do
        not use them as an automatic personnel rating.
      </Notice>
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Sheet>
  );
}
