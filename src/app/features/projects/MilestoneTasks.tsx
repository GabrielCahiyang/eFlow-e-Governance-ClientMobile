import { useState } from "react";
import { Button, Choice, ErrorState, Notice, Sheet } from "../../components/ui";
import { useAction } from "../../shared/useAction";
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
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    action = useAction();
  return (
    <>
      <Button
        variant="outline"
        onPress={() => {
          setSelected(
            tasks.filter((t) => t.milestoneId === id).map((t) => t.id),
          );
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
        onClose={() => setOpen(false)}
      >
        <Notice>
          Link work to this milestone. Completed and cancelled work stays
          read-only. A task belongs to one milestone at a time.
        </Notice>
        <Choice
          label="Linked tasks"
          multiple
          value={selected}
          onChange={setSelected}
          options={tasks
            .filter((t) => !["completed", "cancelled"].includes(t.status))
            .map((t) => ({ value: t.id, label: t.title }))}
        />
        <Button
          busy={action.busy}
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
