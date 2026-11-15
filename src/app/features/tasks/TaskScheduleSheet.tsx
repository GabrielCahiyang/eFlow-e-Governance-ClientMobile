import {
  Button,
  Choice,
  DateField,
  ErrorState,
  Loading,
  Notice,
  Sheet,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { PublicMessageError } from "../../shared/userMessages";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { fetchVisibleTasks } from "./services";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { taskDatePatch, taskTimeline } from "./taskDates";
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
    { toast } = useToast(),
    action = useAction();
  const [formDraft, updateFormDraft, clearFormDraft] = useRetainedDraft(
    formDraftKey(profile?.id, "task-schedule:" + task.id),
    true,
    () => ({
      timeline: taskTimeline(task),
      dependencies: task.dependencyIds || [],
    }),
  );
  const { timeline: draft, dependencies } = formDraft;
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
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
        throw new PublicMessageError(
          "Current Office Head access is required to plan this task.",
        );
      if (!tasks.data || tasks.error)
        throw new PublicMessageError("Refresh the prerequisite tasks before saving.");
      const visible = new Set(tasks.data.map((t) => t.id));
      if (dependencies.some((id) => !visible.has(id)))
        throw new PublicMessageError(
          "One prerequisite is no longer available. Remove it and review the current selection.",
        );
      if (dependencyWouldCycle(tasks.data, task.id, dependencies))
        throw new PublicMessageError(
          "These prerequisites would create a circular dependency.",
        );
      await patchWorkspaceTask(task.id, {
        ...taskDatePatch(taskTimeline(task), draft),
        dependency_ids: dependencies,
      });
      clearFormDraft();
      toast("Task plan saved.", "success");
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      actionError={action.error}
      open
      title="Dates and prerequisites"
      description={task.title}
      onClose={close}
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
        onChange={(start) =>
          updateFormDraft((old) => ({
            ...old,
            timeline: { ...old.timeline, start },
          }))
        }
        disabled={action.busy || !allowed}
      />
      <DateField
        label="Due date"
        value={draft.end}
        onChange={(end) =>
          updateFormDraft((old) => ({
            ...old,
            timeline: { ...old.timeline, end },
          }))
        }
        disabled={action.busy || !allowed}
      />
      <Notice>
        Prerequisites must be completed before dependent work can proceed.
      </Notice>
      {tasks.loading ? (
        <Loading layout="verification" label="Loading current prerequisites…" />
      ) : tasks.error ? (
        <ErrorState error={tasks.error} retry={() => void tasks.refresh()} />
      ) : (
        <Choice
          label="Prerequisite tasks"
          multiple
          value={dependencies}
          onChange={(next) => updateFormDraft({ dependencies: next })}
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
    </Sheet>
  );
}
