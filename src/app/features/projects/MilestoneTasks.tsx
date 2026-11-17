import { useState } from "react";
import Check from "lucide-react-native/icons/check";
import Link2 from "lucide-react-native/icons/link-2";
import { useTheme } from "../../components/ui/Appearance";
import { Button, Choice, ErrorState, Notice, Sheet } from "../../components/ui";
import { useAuth } from "../authentication";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import { updateTask } from "../../../core/web/app/features/tasks/services/taskMutationService";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
export function MilestoneTasks({
  id,
  tasks,
  onSaved,
}: {
  id: string;
  tasks: Task[];
  onSaved: () => Promise<unknown>;
}) {
  const { profile } = useAuth();
  const palette = useTheme();
  const { toast } = useToast();
  const [open, setOpen] = useState(false),
    action = useAction();
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(profile?.id, "milestone-tasks:" + id),
    open,
    () => ({
      selected: tasks.filter((t) => t.milestoneId === id).map((t) => t.id),
    }), { restoreOnOpen: false },
  );
  const selected = draft.selected;
  return (
    <>
      <Button
        variant="outline"
        icon={<Link2 size={16} color={palette.primary} />}
        onPress={() => {
          action.clear();
          setOpen(true);
        }}
      >
        Link milestone tasks
      </Button>
      <Sheet
        actionError={action.error}
        open={open}
        title="Milestone tasks"
        busy={action.busy}
        onClose={() => {
          if (!action.busy) {
            action.clear();
            setOpen(false);
          }
        }}
      >
        <Notice>
          Link work to this milestone. Completed and cancelled work stays
          read-only. A task belongs to one milestone at a time.
        </Notice>
        <Choice
          label="Linked tasks"
          multiple
          value={selected}
          onChange={(next) => updateDraft({ selected: next })}
          options={tasks
            .filter((t) => !["completed", "cancelled"].includes(t.status))
            .map((t) => ({ value: t.id, label: t.title }))}
        />
        <Button
          busy={action.busy}
          icon={<Check size={16} color={palette.onPrimary} />}
          onPress={() =>
            void action.run(async () => {
              try {
                for (const task of tasks.filter(
                  (t) => !["completed", "cancelled"].includes(t.status),
                )) {
                  const next = selected.includes(task.id)
                    ? id
                    : task.milestoneId === id
                      ? ""
                      : task.milestoneId;
                  if (next !== task.milestoneId)
                    await updateTask(task.id, { milestoneId: next });
                }
                clearDraft();
                toast("Milestone tasks updated.", "success");
                setOpen(false);
              } finally {
                await onSaved();
              }
            })
          }
        >
          Save linked tasks
        </Button>
      </Sheet>
    </>
  );
}
