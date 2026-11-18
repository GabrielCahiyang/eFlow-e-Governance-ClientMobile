import { expect, test } from "@jest/globals";
import type { ProjectActivityItem } from "../../../../core/web/app/features/projects/components/project-command/types";
import { projectAuditDetail } from "../projectAuditPresentation";

const oldGroup = "4ff3fe4c-7be5-4193-9c84-cfea54d0e2bb";
const newGroup = "777f99fb-e9aa-4e1d-841b-0b3fdbb918ba";
const event = (detail: string): ProjectActivityItem => ({
  id: "project-change:event-1",
  kind: "project",
  taskId: "task-1",
  title: "Task details changed · test",
  detail,
  actorName: "Cheryl Gallo",
  occurredAt: Date.parse("2026-11-18T01:29:00Z"),
});

test("renders the reported group move without changing its audit evidence or other fields", () => {
  const original = Object.freeze(
    event(
      `Title: Before → After\nGroup Id: ${oldGroup} → ${newGroup}\nArchived At: None → 2026-11-18`,
    ),
  );
  expect(projectAuditDetail(original)).toBe(
    "Title: Before → After\nTask moved to another group\nArchived At: None → 2026-11-18",
  );
  expect(original.detail).toContain(oldGroup);
  expect(original.detail).toContain(newGroup);
  expect(original.actorName).toBe("Cheryl Gallo");
  expect(original.taskId).toBe("task-1");
});

test.each([
  [`None → ${newGroup}`, "Task assigned to a group"],
  [`${oldGroup} → None`, "Task removed from its group"],
  [
    `${oldGroup.toUpperCase()} → ${newGroup.toUpperCase()}`,
    "Task moved to another group",
  ],
])("describes group membership change %s", (change, expected) => {
  expect(projectAuditDetail(event(`Group Id: ${change}`))).toBe(expected);
});

test.each([
  "Group: Planning → Implementation",
  "Group Id: Historical name unavailable",
  `Description: Group Id: ${oldGroup} → ${newGroup}`,
  `Evidence: ${oldGroup} → ${newGroup}`,
  "Priority: low → high\nEstimated Hours: 4 → 6",
])("preserves already readable or unrelated history: %s", (detail) => {
  expect(projectAuditDetail(event(detail))).toBe(detail);
});

test.each([
  { id: "work:event-1" },
  { kind: "submission" as const },
  { taskId: undefined },
  { title: "Project details changed · test" },
])("does not reinterpret another event type: %j", (patch) => {
  const original = {
    ...event(`Group Id: ${oldGroup} → ${newGroup}`),
    ...patch,
  };
  expect(projectAuditDetail(original)).toBe(original.detail);
});
