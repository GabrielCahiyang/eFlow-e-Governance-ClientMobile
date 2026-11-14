import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Row,
  Sheet,
  Status,
} from "../../components/ui";
import { OrderList } from "../../components/ui/OrderList";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { supabase } from "../../../platform/supabase";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  setMilestoneManualStatus,
  reorderMilestones,
  deriveMilestoneStatus,
} from "../../../core/web/app/features/projects/services/milestoneService";
import { rowToMilestone } from "../../../core/web/app/features/projects/services/projectMappers";
import type {
  Milestone,
  MilestoneStatus,
} from "../../../core/web/app/features/projects/services/types";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
import { MilestoneTasks } from "./MilestoneTasks";
export function Milestones({
  project,
  tasks,
  editable,
  onTasksChanged,
}: {
  project: string;
  tasks: Task[];
  editable: boolean;
  onTasksChanged: () => Promise<unknown>;
}) {
  const facts = useFacts("milestones:" + project, async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", project)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map(rowToMilestone);
    }),
    action = useAction(),
    [editing, setEditing] = useState<Milestone | null>(),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [date, setDate] = useState(""),
    [status, setStatus] = useState("auto"),
    [note, setNote] = useState(""),
    [ordering, setOrdering] = useState(false);
  const edit = (item: Milestone | null) => {
    setEditing(item);
    setTitle(item?.title || "");
    setDescription(item?.description || "");
    setDate(item?.dueDate?.slice(0, 10) || "");
    setStatus(item?.manualStatus || "auto");
    setNote(item?.manualNote || "");
  };
  return (
    <>
      <Row>
        {editable && (
          <>
            <Button onPress={() => edit(null)}>Add milestone</Button>
            <Button variant="outline" onPress={() => setOrdering(true)}>
              Reorder milestones
            </Button>
          </>
        )}
      </Row>
      {facts.loading && !facts.data ? (
        <Loading />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        facts.data?.map((item) => {
          const linked = tasks.filter((t) => t.milestoneId === item.id),
            effective = deriveMilestoneStatus(item, linked);
          return (
            <Card key={item.id} title={item.title}>
              <Status value={effective.status} />
              <LabelValue label="Status source" value={effective.source} />
              <LabelValue label="Due date" value={item.dueDate || "—"} />
              <LabelValue label="Linked tasks" value={linked.length} />
              <LabelValue label="Description" value={item.description || "—"} />
              {editable && (
                <Row>
                  <MilestoneTasks
                    id={item.id}
                    tasks={tasks}
                    onSaved={onTasksChanged}
                  />
                  <Button variant="outline" onPress={() => edit(item)}>
                    Edit milestone
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() =>
                      void action.run(async () => {
                        if (
                          await confirmAction(
                            "Delete milestone?",
                            item.title,
                            "Delete",
                          )
                        ) {
                          await deleteMilestone(item.id);
                          await facts.refresh();
                        }
                      })
                    }
                  >
                    Delete
                  </Button>
                </Row>
              )}
            </Card>
          );
        })
      )}
      <Sheet
        actionError={action.error}
        open={editing !== undefined}
        title={editing ? "Edit milestone" : "Add milestone"}
        onClose={() => {
          if (!action.busy) setEditing(undefined);
        }}
      >
        <Field label="Title" value={title} onChangeText={setTitle} />
        <DateField label="Due date" value={date} onChange={setDate} />
        {editing && (
          <>
            <Field
              label="Description"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <Choice
              label="Status"
              value={status}
              options={[
                "auto",
                "not_started",
                "in_progress",
                "at_risk",
                "completed",
              ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
              onChange={setStatus}
            />
            <Field
              label="Override reason"
              value={note}
              onChangeText={setNote}
            />
          </>
        )}
        <Button
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (editing) {
                await updateMilestone(editing.id, {
                  title,
                  description,
                  dueDate: date || null,
                });
                await setMilestoneManualStatus(
                  editing.id,
                  status === "auto" ? null : (status as MilestoneStatus),
                  note,
                );
              } else await createMilestone(project, title, date || null);
              setEditing(undefined);
              await facts.refresh();
            })
          }
        >
          Save milestone
        </Button>
      </Sheet>
      <Sheet
        actionError={action.error}
        open={ordering}
        title="Milestone order"
        onClose={() => setOrdering(false)}
      >
        <OrderList
          items={(facts.data || []).map((i) => ({ id: i.id, label: i.title }))}
          busy={action.busy}
          onSave={async (ids) => {
            await action.run(async () => {
              await reorderMilestones(project, ids);
              setOrdering(false);
              await facts.refresh();
            });
          }}
        />
      </Sheet>
      {!!action.error && editing === undefined && !ordering && (
        <ErrorState context="action" error={action.error} />
      )}
    </>
  );
}
