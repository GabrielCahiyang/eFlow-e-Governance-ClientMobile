import { useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Row,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { draftStore } from "../../../platform/draftStore";
import { exportTable } from "../../shared/exportTable";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";
export type SavedProjectView = {
  id: string;
  name: string;
  view: string;
  query: string;
  status: string;
  owner: string;
  sort: string;
  hidden: string[];
};
export function ProjectViewTools({
  project,
  title,
  tasks,
  current,
  onApply,
}: {
  project: string;
  title: string;
  tasks: Task[];
  current: Omit<SavedProjectView, "id" | "name">;
  onApply: (view: SavedProjectView) => void;
}) {
  const { profile } = useAuth(),
    actor = profile!.id,
    facts = useFacts("saved-views:" + actor + ":" + project, async () => {
      const value = await draftStore.get<SavedProjectView[]>(
        actor,
        "views:" + project,
      );
      return Array.isArray(value)
        ? value.filter(
            (v) =>
              typeof v.id === "string" &&
              typeof v.name === "string" &&
              Array.isArray(v.hidden),
          )
        : [];
    }),
    action = useAction(),
    [open, setOpen] = useState(false),
    [name, setName] = useState("");
  const save = () =>
    action.run(async () => {
      if (!name.trim()) throw new Error("Name this view.");
      await draftStore.set(actor, "views:" + project, [
        ...(facts.data || []),
        { ...current, name: name.trim(), id: crypto.randomUUID() },
      ]);
      await facts.refresh();
      setName("");
    });
  const exportRows = (format: "csv" | "pdf") =>
    action.run(() =>
      exportTable(
        format,
        title,
        [
          "Task",
          "Office",
          "Lead",
          "Status",
          "Start",
          "Due",
          "Priority",
          "Hours",
          "Budget",
          "Progress",
          "Dependencies",
        ],
        tasks.map((t) => [
          t.title,
          t.department || t.orgId || "",
          t.assigneeName,
          t.status,
          t.startDate,
          t.deadline || t.dueDate,
          t.priority,
          t.estimatedHours,
          t.budgetImpact,
          t.percentComplete,
          (t.dependencyIds || [])
            .map((id) => tasks.find((x) => x.id === id)?.title || id)
            .join("; "),
        ]),
      ),
    );
  return (
    <>
      <Row>
        <Button variant="outline" onPress={() => setOpen(true)}>
          Saved views
        </Button>
        <Button
          variant="outline"
          busy={action.busy}
          onPress={() => void exportRows("csv")}
        >
          Export CSV
        </Button>
        <Button
          variant="outline"
          busy={action.busy}
          onPress={() => void exportRows("pdf")}
        >
          Export PDF
        </Button>
      </Row>
      <Sheet
        open={open}
        title="My saved project views"
        onClose={() => setOpen(false)}
      >
        <Text>
          Views save filters, sorting and columns on this device, for this
          account and project.
        </Text>
        {facts.data?.map((view) => (
          <Card key={view.id} title={view.name}>
            <Row>
              <Button
                onPress={() => {
                  onApply(view);
                  setOpen(false);
                }}
              >
                Open view
              </Button>
              <Button
                variant="danger"
                onPress={() =>
                  void action.run(async () => {
                    await draftStore.set(
                      actor,
                      "views:" + project,
                      facts.data!.filter((v) => v.id !== view.id),
                    );
                    await facts.refresh();
                  })
                }
              >
                Delete view
              </Button>
            </Row>
          </Card>
        ))}
        <Field
          label="Save current view as"
          value={name}
          onChangeText={setName}
        />
        <Button
          busy={action.busy}
          disabled={facts.loading || !!facts.error}
          onPress={() => void save()}
        >
          Save current view
        </Button>
        {!!facts.error && <ErrorState error={facts.error} />}
      </Sheet>
      {!!action.error && <ErrorState error={action.error} />}
    </>
  );
}
