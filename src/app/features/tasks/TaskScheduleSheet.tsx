import { useState } from "react";
import {
  Button,
  Choice,
  DateField,
  ErrorState,
  Field,
  Loading,
  Notice,
  Sheet,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { fetchVisibleTasks } from "./services";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import {
  timelineDraft,
  timelinePatch,
} from "../../../core/web/app/features/project-table/planningDraft";
import {
  dependencyWouldCycle,
  canEditProjectTask,
} from "../../../core/web/app/features/project-table/selectors";
import { patchWorkspaceTask } from "../../../core/web/app/features/project-table/services/workspaceService";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
export function TaskScheduleSheet({
  task,
  onClose,
  onSaved,
}: {
  task: Task;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { profile, organization } = useAuth(),
    action = useAction();
  const [draft, setDraft] = useState(() => timelineDraft(task)),
    [dependencies, setDependencies] = useState(task.dependencyIds || []);
  const tasks = useFacts(
    "task-planning:" + profile?.id + ":" + task.id,
    fetchVisibleTasks,
  );
  const head = isAppointedOfficeHead(
      profile,
      organization ? [organization] : [],
    ),
    allowed = canEditProjectTask(task, head, profile?.org_id || "");
  const choices = (tasks.data || []).filter(
    (t) =>
      t.id !== task.id &&
      t.linkedProjectId === task.linkedProjectId &&
      t.orgId === task.orgId &&
      !t.archivedAt &&
      t.status !== "cancelled",
  );
  const save = () =>
    action.run(async () => {
      if (!allowed)
        throw new Error(
          "Current Office Head access is required to plan this task.",
        );
      if (!tasks.data || tasks.error)
        throw new Error("Refresh the prerequisite tasks before saving.");
      const visible = new Set(tasks.data.map((t) => t.id));
      if (dependencies.some((id) => !visible.has(id)))
        throw new Error(
          "One prerequisite is no longer available. Remove it and review the current selection.",
        );
      if (dependencyWouldCycle(tasks.data, task.id, dependencies))
        throw new Error(
          "These prerequisites would create a circular dependency.",
        );
      await patchWorkspaceTask(task.id, {
        ...timelinePatch(task, draft),
        dependency_ids: dependencies,
      });
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      open
      title="Dates and prerequisites"
      description={task.title}
      onClose={onClose}
      busy={action.busy}
      footer={
        <Button
          busy={action.busy}
          disabled={!allowed || tasks.loading || !!tasks.error}
          onPress={() => void save()}
        >
          Save task plan
        </Button>
      }
    >
      <DateField
        label="Start date"
        value={draft.start}
        onChange={(start) => setDraft((old) => ({ ...old, start }))}
        disabled={action.busy || !allowed}
      />
      <DateField
        label="Due date"
        value={draft.end}
        onChange={(end) => setDraft((old) => ({ ...old, end }))}
        disabled={action.busy || !allowed}
      />
      <Field
        label="Due time (24-hour HH:mm)"
        value={draft.time || ""}
        placeholder="23:59"
        onChangeText={(time) => setDraft((old) => ({ ...old, time }))}
        editable={!action.busy && allowed}
      />
      <Notice>
        Due times default to 11:59 PM. Existing timestamps retain their recorded
        timezone. Prerequisites must be completed before dependent work can
        proceed.
      </Notice>
      {tasks.loading ? (
        <Loading label="Loading current prerequisites…" />
      ) : tasks.error ? (
        <ErrorState error={tasks.error} retry={() => void tasks.refresh()} />
      ) : (
        <Choice
          label="Prerequisite tasks"
          multiple
          value={dependencies}
          onChange={setDependencies}
          disabled={action.busy || !allowed}
          options={[
            ...choices.map((t) => ({ value: t.id, label: t.title })),
            ...dependencies
              .filter((id) => !choices.some((t) => t.id === id))
              .map((id) => ({
                value: id,
                label:
                  tasks.data?.find((t) => t.id === id)?.title ||
                  "Unavailable prerequisite — remove to continue",
              })),
          ]}
        />
      )}{" "}
      {!!action.error && <ErrorState error={action.error} />}
    </Sheet>
  );
}
