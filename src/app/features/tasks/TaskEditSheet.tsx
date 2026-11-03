import { useState } from "react";
import {
  Button,
  Choice,
  ErrorState,
  Field,
  Notice,
  Sheet,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import type { Navigate } from "../../shared/routes";
import { updateTask } from "../../../core/web/app/features/tasks/services/taskService";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";

export function TaskEditSheet({
  task,
  onClose,
  onSaved,
}: {
  task: Task;
  onClose: () => void;
  onSaved: () => Promise<void>;
  navigate: Navigate;
}) {
  const [title, setTitle] = useState(task.title),
    [description, setDescription] = useState(task.description || ""),
    [priority, setPriority] = useState<Task["priority"]>(
      task.priority || "medium",
    ),
    [hours, setHours] = useState(String(task.estimatedHours || 0)),
    [tags, setTags] = useState((task.tags || []).join(", ")),
    [done, setDone] = useState(task.definitionOfDone || ""),
    [criteria, setCriteria] = useState(
      (task.acceptanceCriteria || []).join("\n"),
    );
  const action = useAction();
  const save = () =>
    action.run(async () => {
      if (!title.trim()) throw new Error("Task title is required.");
      const effort = Number(hours);
      if (!Number.isFinite(effort) || effort < 0)
        throw new Error("Estimated hours must be a non-negative number.");
      await updateTask(task.id, {
        title: title.trim(),
        description,
        priority,
        estimatedHours: effort,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        definitionOfDone: done,
        acceptanceCriteria: criteria
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      open
      title="Edit task"
      onClose={onClose}
      busy={action.busy}
      footer={
        <Button busy={action.busy} onPress={() => void save()}>
          Save task details
        </Button>
      }
    >
      <Field label="Task title" value={title} onChangeText={setTitle} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Choice
        label="Priority"
        value={priority || "medium"}
        onChange={setPriority}
        options={["low", "medium", "high"].map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        }))}
      />
      <Field
        label="Estimated hours"
        value={hours}
        onChangeText={setHours}
        keyboardType="decimal-pad"
      />
      <Field
        label="Tags, separated by commas"
        value={tags}
        onChangeText={setTags}
      />
      <Field
        label="Definition of done"
        value={done}
        onChangeText={setDone}
        multiline
      />
      <Field
        label="Acceptance criteria, one per line"
        value={criteria}
        onChangeText={setCriteria}
        multiline
      />
      <Notice>
        Use Dates and prerequisites to plan this task and Choose people for
        staffing. Authorized funding is managed in the Budget tab.
      </Notice>
      {!!action.error && <ErrorState error={action.error} />}
    </Sheet>
  );
}
