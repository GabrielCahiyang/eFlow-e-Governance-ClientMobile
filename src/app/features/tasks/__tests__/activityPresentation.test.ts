import { expect, test } from "@jest/globals";
import type { WorkEvent } from "../../../../core/web/app/features/nested-work/services/workTreeService";
import type {
  WorkNode,
  WorkTreeSnapshot,
} from "../../../../core/web/app/features/nested-work/types";
import { activityTime, describeWorkEvent } from "../activityPresentation";

const node = {
  id: "subtask",
  task_id: "task",
  title: "Delivery of letters",
  parent_subtask_id: null,
  assigned_to_ids: ["gabriel", "andres"],
  lead_id: "gabriel",
  due_date: "2026-11-24",
  is_standalone: true,
  status: "todo",
  percent_complete: 0,
} as WorkNode;
const snapshot = (nodes: WorkNode[]) =>
  ({
    root: { id: "task", project: "project", kind: "office", office: "office" },
    people: [
      { id: "gabriel", name: "Gabriel Cahiyang" },
      { id: "andres", name: "Andres Manili" },
    ],
    nodes,
  }) as WorkTreeSnapshot;
const event = (
  command: string,
  before: WorkNode[],
  after: WorkNode[],
): WorkEvent => ({
  id: "event",
  root_id: "task",
  node_id: "subtask",
  command,
  occurred_at: "2026-11-24T16:30:00Z",
  actor_name: "Recorded actor",
  before_data: snapshot(before),
  after_data: snapshot(after),
});

test("creation displays recorded initial values once without setup transitions", () => {
  const result = describeWorkEvent(event("create", [], [node]));
  expect(result.title).toBe("Subtask created");
  expect(result.subject).toBe(node.title);
  expect(result.fields.map((field) => field.label)).toEqual([
    "Lead",
    "Contributors",
    "Due date",
  ]);
  expect(result.fields[0].value).toBe("Gabriel Cahiyang");
  expect(result.fields[1].value).toBe("Andres Manili");
  expect(result.fields.every((field) => !field.value.includes("→"))).toBe(true);
});

test("edits retain recorded values and omit unchanged fields", () => {
  const result = describeWorkEvent(
    event("edit", [node], [{ ...node, due_date: "2026-11-26" }]),
  );
  expect(result.fields).toEqual([
    { label: "Due date", value: "24 Nov 2026 → 26 Nov 2026" },
  ]);
  const removed = describeWorkEvent(event("delete", [node], []));
  expect(removed.subject).toBe(node.title);
  expect(removed.fields[0].value).toBe("Gabriel Cahiyang");
  expect(activityTime(Date.parse(event("edit", [], []).occurred_at))).toMatch(
    /25/,
  );
});
