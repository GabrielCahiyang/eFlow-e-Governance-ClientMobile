import { useState } from "react";
import { supabase } from "../../../platform/supabase";
import { nativeWindow } from "../../../platform/webRuntime";
import {
  Button,
  Choice,
  DateField,
  ErrorState,
  Field,
  Sheet,
} from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { PublicMessageError } from "../../shared/userMessages";
import { fetchProjectGroups } from "../../../core/web/app/features/project-table/services/workspaceService";
import type { ProjectGroup } from "../../../core/web/app/features/project-table/types";
import {
  timelineDraft,
  timelinePatch,
} from "../../../core/web/app/features/project-table/planningDraft";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { rowToTask } from "../../../core/web/app/features/tasks/services/taskMapper";
import { fetchProject } from "./services";

type Scope = { actor: string; project: string; office: string; task?: Task };

async function taskStructureAllowed({ actor, project, office, task }: Scope) {
  const [scoped, managesProject, managesTask] = await Promise.all([
    supabase.rpc("can_create_scoped_work", {
      target_org: office,
      caller_id: actor,
    }),
    supabase.rpc("can_manage_project", {
      target_project: project,
      caller_id: actor,
    }),
    task
      ? supabase.rpc("can_manage_task", {
          target_task: task.id,
          caller_id: actor,
        })
      : Promise.resolve({ data: true, error: null }),
  ]);
  const error = scoped.error || managesProject.error || managesTask.error;
  if (error) throw error;
  return (
    scoped.data === true &&
    managesProject.data === true &&
    managesTask.data === true
  );
}

export function useTaskStructure(scope: Scope, enabled: boolean) {
  return useFacts(
    JSON.stringify([
      "task-structure",
      scope.actor,
      scope.project,
      scope.office,
      scope.task?.id,
    ]),
    () => taskStructureAllowed(scope),
    enabled,
  );
}

export function ProjectTaskEditor({
  scope,
  groups,
  onClose,
  onSaved,
}: {
  scope: Scope;
  groups: ProjectGroup[];
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [task] = useState(scope.task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [timeline, setTimeline] = useState(() =>
    task ? timelineDraft(task) : undefined,
  );
  const [group, setGroup] = useState(
    (groups.find((item) => item.isDefault) || groups[0])?.id ?? "",
  );
  const [unconfirmed, setUnconfirmed] = useState(false);
  const action = useAction();

  const save = () =>
    void action.run(async () => {
      const name = title.trim();
      if (!name || name.length > 300)
        throw new PublicMessageError(
          "Enter a task title of up to 300 characters.",
        );
      const session = await supabase.auth.getSession();
      if (session.error || session.data.session?.user.id !== scope.actor)
        throw new PublicMessageError("Sign in again to save this task.");
      const project = await fetchProject(scope.project);
      if (project.status !== "active" || !(await taskStructureAllowed(scope)))
        throw new PublicMessageError(
          "Current project access does not allow this change.",
        );
      if (
        !task &&
        !(await fetchProjectGroups(scope.project)).some(
          (item) => item.id === group,
        )
      )
        throw new PublicMessageError("Choose a current group in this project.");

      if (task) {
        const current = await supabase
          .from("tasks")
          .select("*")
          .eq("id", task.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (current.error) throw current.error;
        const latest = current.data ? rowToTask(current.data) : undefined;
        if (
          !latest ||
          latest.linkedProjectId !== scope.project ||
          latest.orgId !== scope.office ||
          latest.updatedAt !== task.updatedAt ||
          latest.archivedAt ||
          ["completed", "cancelled"].includes(latest.status)
        )
          throw new PublicMessageError(
            "This task changed. Close the form and refresh before editing it again.",
          );
      }
      let schedule = {};
      if (task && timeline) {
        const original = timelineDraft(task);
        if (
          timeline.start !== original.start ||
          timeline.end !== original.end ||
          timeline.time !== original.time
        ) {
          try {
            schedule = timelinePatch(task, timeline);
          } catch (error) {
            throw new PublicMessageError(
              error instanceof Error ? error.message : "Check the task dates.",
            );
          }
        }
      }

      // The Web create RPC has no request ID. Once a write is attempted, only
      // a confirmed rejection permits another submission from this editor.
      setUnconfirmed(true);
      const result = task
        ? await supabase.rpc("phase3_patch_task", {
            p_task_id: task.id,
            p_patch: { title: name, ...schedule },
          })
        : await supabase.rpc("phase3_create_task", {
            p_project_id: scope.project,
            p_group_id: group,
            p_title: name,
          });
      if (result.error) {
        const code = result.error.code || "";
        if (
          /^(22|23)/.test(code) ||
          ["42501", "42883", "PGRST202", "P0001"].includes(code)
        ) {
          setUnconfirmed(false);
          if (code === "42883" || code === "PGRST202")
            throw new PublicMessageError(
              "Task editing is unavailable. The project workspace service is missing.",
            );
          throw result.error;
        }
        throw new PublicMessageError(
          "The save could not be confirmed. Close this form and check the task list before trying again.",
        );
      }
      if (
        !result.data ||
        result.data.linked_project_id !== scope.project ||
        typeof result.data.id !== "string" ||
        (task && result.data.id !== task.id)
      )
        throw new PublicMessageError(
          "The save could not be confirmed. Close this form and check the task list before trying again.",
        );
      nativeWindow.dispatchEvent({ type: "eflow:work-updated" });
      onClose();
      await onSaved();
    });
  return (
    <Sheet
      open
      title={task ? "Edit task" : "Add task"}
      onClose={onClose}
      busy={action.busy}
    >
      <Field
        label="Task title"
        value={title}
        onChangeText={setTitle}
        maxLength={300}
        editable={!action.busy && !unconfirmed}
      />
      {timeline && (
        <>
          <DateField
            label="Start date"
            value={timeline.start}
            onChange={(start) => setTimeline({ ...timeline, start })}
            disabled={action.busy || unconfirmed}
          />
          <DateField
            label="Due date"
            value={timeline.end}
            onChange={(end) =>
              setTimeline({ ...timeline, end, time: end ? timeline.time : "" })
            }
            disabled={action.busy || unconfirmed}
          />
          <Field
            label="Due time (24-hour HH:mm)"
            value={timeline.time || ""}
            onChangeText={(time) => setTimeline({ ...timeline, time })}
            editable={!action.busy && !unconfirmed}
          />
        </>
      )}
      {!task && (
        <Choice
          label="Group"
          options={groups.map((item) => ({
            value: item.id,
            label: item.title,
          }))}
          value={group}
          onChange={setGroup}
          disabled={action.busy || unconfirmed}
        />
      )}
      {!!action.error && <ErrorState error={action.error} context="action" />}
      <Button
        busy={action.busy}
        disabled={unconfirmed || !title.trim() || (!task && !group)}
        onPress={save}
      >
        {task ? "Save changes" : "Add task"}
      </Button>
    </Sheet>
  );
}
