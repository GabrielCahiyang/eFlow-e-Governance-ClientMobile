import { expect, test } from "@jest/globals";
import type { WorkTreeSnapshot } from "../../../../core/web/app/features/nested-work/types";
import { subtaskPeopleOptions } from "../subtaskPeopleOptions";

const snapshot = () =>
  ({
    root: { id: "task", lead: "lead", people: ["lead", "task-worker"] },
    nodes: [
      {
        id: "parent",
        lead_id: "parent-lead",
        assigned_to_ids: ["parent-lead", "parent-worker"],
      },
      { id: "child", parent_subtask_id: "parent" },
    ],
    people: [
      { id: "other", name: "Aaron Specialist", eligible: true },
      { id: "task-worker", name: "Zoe Contributor", eligible: true },
      { id: "lead", name: "Task Lead", eligible: true },
      { id: "parent-worker", name: "Parent Worker", eligible: true },
      { id: "parent-lead", name: "Parent Lead", eligible: true },
      { id: "expired", name: "Former Member", eligible: false },
      { id: "unknown", name: "Unverified Member" },
    ],
  }) as unknown as WorkTreeSnapshot;

test("top-level picker prioritizes task team and allows an eligible specialist without changing root staffing", () => {
  const data = snapshot();
  const before = JSON.stringify(data);
  const options = subtaskPeopleOptions(data, undefined, []);
  expect(options.map((option) => option.value)).toEqual([
    "lead",
    "task-worker",
    "other",
    "parent-lead",
    "parent-worker",
  ]);
  expect(options.find((option) => option.value === "other")?.group).toBe(
    "Other eligible people",
  );
  expect(JSON.stringify(data)).toBe(before);
});

test("nested picker prioritizes immediate parent then task team, deduplicates, and excludes appointed lead from contributors", () => {
  const data = snapshot();
  data.people.push({ ...data.people[4] });
  data.root.people.push("parent-worker");
  const options = subtaskPeopleOptions(data, data.nodes[1], [], "parent-lead");
  expect(options.map((option) => [option.value, option.group])).toEqual([
    ["parent-worker", "On parent subtask"],
    ["lead", "On this task"],
    ["task-worker", "On this task"],
    ["other", "Other eligible people"],
  ]);
});

test("missing, false and conflicting eligibility fail closed; only selected history is retained disabled", () => {
  const data = snapshot();
  data.people.push({ id: "other", name: "Aaron Specialist", eligible: false });
  const options = subtaskPeopleOptions(data, undefined, [
    "expired",
    "expired",
    "missing",
    "other",
  ]);
  expect(options.some((option) => option.value === "unknown")).toBe(false);
  expect(
    options
      .filter((option) => option.disabled)
      .map((option) => option.value)
      .sort(),
  ).toEqual(["expired", "missing", "other"]);
  expect(options.find((option) => option.value === "missing")?.label).toBe(
    "Previously assigned person",
  );
  expect(options.filter((option) => option.value === "expired")).toHaveLength(
    1,
  );
});

test("unreadable parent does not fabricate parent membership; directory remains the only candidate source", () => {
  const data = snapshot();
  data.nodes[1].parent_subtask_id = "restricted-parent";
  data.root.people.push("not-in-directory");
  const options = subtaskPeopleOptions(data, data.nodes[1], []);
  expect(options.some((option) => option.group === "On parent subtask")).toBe(
    false,
  );
  expect(options.some((option) => option.value === "not-in-directory")).toBe(
    false,
  );
});
