import { expect, jest, test } from "@jest/globals";
import { taskDetailActivityFields } from "../taskDetailActivity";
jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock(
  "../../../../core/web/app/features/tasks/services/taskActivityService",
  () => ({}),
);

test("Task Activity displays persisted field deltas and the actual reschedule reason", () => {
  expect(
    taskDetailActivityFields({
      version: 1,
      fields: [
        {
          key: "title",
          label: "Title",
          before: "Draft agenda",
          after: "Consultation agenda",
        },
        {
          key: "deadline",
          label: "Due date",
          before: "2026-11-20",
          after: "2026-11-21",
        },
      ],
      reason: "Venue availability confirmed",
    }),
  ).toEqual([
    { label: "Title", value: "Draft agenda → Consultation agenda" },
    { label: "Due date", value: "2026-11-20 → 2026-11-21" },
    { label: "Schedule change reason", value: "Venue availability confirmed" },
  ]);
});
test("missing historical metadata does not invent old values", () => {
  expect(taskDetailActivityFields(null)).toBeUndefined();
  expect(taskDetailActivityFields({ version: 2, fields: [] })).toBeUndefined();
  expect(
    taskDetailActivityFields({
      version: 1,
      fields: [{ label: "Title", after: "New" }],
    }),
  ).toBeUndefined();
});
