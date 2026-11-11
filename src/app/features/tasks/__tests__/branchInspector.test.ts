import { expect, test } from "@jest/globals";
import type {
  WorkNode,
  WorkTreeSnapshot,
} from "../../../../core/web/app/features/nested-work/types";
import {
  rememberWorkCapabilityContext,
  selectNodeWorkCapability,
} from "../../../../core/web/app/features/nested-work/selectors/capabilities";
import {
  branchCompletion,
  branchRows,
  completionMode,
  defaultSubtaskLead,
  isSubtaskContributor,
  personalReviewAllowed,
  workNodeRoute,
  workScope,
} from "../branchInspector";

const allowed = { allowed: true, reason_code: null } as const;
const node = (
  depth: number,
  parent: string | null,
  extra: Partial<WorkNode> = {},
): WorkNode => ({
  id: "n" + depth,
  task_id: "root",
  parent_subtask_id: parent,
  title: "Level " + depth,
  lead_id: "lead",
  assigned_to_ids: ["lead"],
  depth,
  sibling_order: depth,
  status: "in_progress",
  due_date: null,
  is_standalone: false,
  percent_complete: 30,
  can_manage: false,
  can_appoint: false,
  can_order: false,
  can_work: false,
  can_review: false,
  ...extra,
});
const tree = (
  nodes: WorkNode[],
  kind: "office" | "personal" = "office",
): WorkTreeSnapshot => ({
  root: {
    id: "root",
    project: "project",
    office: kind === "office" ? "office" : null,
    kind,
    lead: "root-lead",
    open: true,
    due: null,
    people: ["root-lead"],
  },
  nodes,
  people: [],
  revision: 3,
  can_manage: false,
  can_transfer: false,
  leaf_total: 0,
  leaf_completed: 0,
});

test("completion counts direct accepted children and uses the leaf status when there are no children", () => {
  const data = tree([
    node(1, null, { status: "completed" }),
    node(1, null, { id: "two", status: "completed" }),
    node(1, null, { id: "three", status: "for_review", percent_complete: 100 }),
    node(2, "three", { status: "completed" }),
    node(2, "three", {
      id: "pending-child",
      status: "for_review",
      percent_complete: 100,
    }),
    node(1, null, { id: "other-root", task_id: "other", status: "completed" }),
  ]);
  expect(branchCompletion(data, "in_progress")).toEqual({
    completed: 2,
    total: 3,
    percent: 67,
  });
  expect(branchCompletion(data, "for_review", "three")).toEqual({
    completed: 1,
    total: 2,
    percent: 50,
  });
  expect(branchCompletion(data, "for_review", "pending-child").percent).toBe(0);
  expect(branchCompletion(data, "completed", "n2").percent).toBe(100);
});

test("an assigned contributor cannot use the direct completion path even if also the Task Lead", () => {
  const data = tree([
    node(1, null, {
      assigned_to_ids: ["lead", "root-lead"],
      capabilities: { execute: allowed },
    }),
  ]);
  rememberWorkCapabilityContext(data, "root-lead");
  expect(isSubtaskContributor(data, "n1", "root-lead")).toBe(true);
  expect(isSubtaskContributor(data, "n1", "lead")).toBe(false);
  expect(completionMode(data, "n1", "root-lead")).toBeUndefined();
});

test("subtask creation defaults to the eligible Task Lead and leaves unavailable appointments blank", () => {
  const data = tree([node(1, null)]);
  expect(defaultSubtaskLead(data)).toBe("");
  data.people = [{ id: "root-lead", name: "Task Lead", eligible: true }];
  expect(defaultSubtaskLead(data)).toBe("root-lead");
  data.people[0].eligible = false;
  expect(defaultSubtaskLead(data)).toBe("");
});

test("drills through eight exact child links and excludes siblings and another root", () => {
  const chain = Array.from({ length: 8 }, (_, index) =>
    node(index + 1, index ? "n" + index : null),
  );
  const data = tree([
    ...chain,
    node(4, "n3", { id: "sibling" }),
    node(5, "n4", { id: "foreign", task_id: "other" }),
  ]);
  expect(branchRows(data).children.map((row) => row.id)).toEqual(["n1"]);
  for (let level = 1; level < 8; level++) {
    const parent = branchRows(data, "n" + level);
    expect(parent.children[0].id).toBe("n" + (level + 1));
  }
  const deep = branchRows(data, "n8");
  expect(deep.focused?.path.map(({ id }) => id)).toEqual(
    chain.map(({ id }) => id),
  );
  expect(deep.children).toEqual([]);
  expect(branchRows(data, "n4").children.map((row) => row.id)).toEqual(["n5"]);
  expect(branchRows(data, "foreign").focused).toBeUndefined();
  expect(workNodeRoute(data, "n8", "Level 8")).toEqual({
    name: "task",
    id: "root",
    projectId: "project",
    nodeId: "n8",
    title: "Level 8",
  });
  expect(workNodeRoute(tree(chain, "personal"), "n8", "Level 8")).toEqual({
    name: "personal_project",
    id: "project",
    taskId: "root",
    nodeId: "n8",
    title: "Level 8",
  });
});

test("branch placement grants no staffing authority over a sibling or ancestor and revision changes fail closed", () => {
  const data = tree([
    node(1, null),
    node(2, "n1", {
      capabilities: { manage_contributors: allowed, create_child: allowed },
    }),
    node(2, "n1", {
      id: "sibling",
      capabilities: {
        manage_contributors: { allowed: false, reason_code: "branch_denied" },
      },
    }),
  ]);
  rememberWorkCapabilityContext(data, "lead");
  const scope = workScope(data, "lead");
  expect(
    selectNodeWorkCapability(data, "n2", "manage_contributors", scope).allowed,
  ).toBe(true);
  expect(
    selectNodeWorkCapability(data, "n1", "manage_contributors", scope).allowed,
  ).toBe(false);
  expect(
    selectNodeWorkCapability(data, "sibling", "manage_contributors", scope)
      .allowed,
  ).toBe(false);
  expect(
    selectNodeWorkCapability(data, "n2", "create_child", {
      ...scope,
      revision: 4,
    }).allowed,
  ).toBe(false);
});

test("direct Office completion and personal submission require distinct current grants and preserve history", () => {
  const row = node(1, null, {
    capabilities: { execute: allowed, submit: allowed },
  });
  const office = tree([
    row,
    node(2, row.id, { status: "completed", capabilities: row.capabilities }),
  ]);
  const personal = tree([row], "personal");
  expect(completionMode(office, row.id, "lead")).toBeUndefined();
  rememberWorkCapabilityContext(office, "lead");
  rememberWorkCapabilityContext(personal, "lead");
  expect(completionMode(office, row.id, "lead")).toBe("direct");
  expect(completionMode(personal, row.id, "lead")).toBe("review");
  expect(completionMode(office, row.id, "someone-else")).toBeUndefined();
  expect(completionMode(office, row.id, "lead", true)).toBeUndefined();
  expect(completionMode(office, "n2", "lead")).toBeUndefined();
  expect(office.nodes[1].status).toBe("completed");
});

test("Office execution access alone cannot mark a Subtask complete", () => {
  const office = tree([node(1, null, { capabilities: { execute: allowed } })]);
  rememberWorkCapabilityContext(office, "lead");
  expect(completionMode(office, "n1", "lead")).toBeUndefined();
});

test("Personal review follows the current independent reviewer rather than branch titles or membership", () => {
  const data = tree(
    [
      node(1, null, {
        status: "for_review",
        current_reviewer: "ancestor",
        assigned_to_ids: ["submitter", "ancestor"],
        capabilities: { review: allowed },
      }),
    ],
    "personal",
  );
  rememberWorkCapabilityContext(data, "ancestor");
  expect(personalReviewAllowed(data, "n1", "ancestor")).toBe(true);
  rememberWorkCapabilityContext(data, "submitter");
  expect(personalReviewAllowed(data, "n1", "submitter")).toBe(false);
});
