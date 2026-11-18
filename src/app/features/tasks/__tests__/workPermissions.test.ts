import { expect, test } from "@jest/globals";
import type {
  WorkNode,
  WorkTreeSnapshot,
} from "../../../../core/web/app/features/nested-work/types";
import {
  canDecideSubtaskProposals,
  isProjectLeadSubtaskPlanningBlocked,
  isSubtaskLeadOrContributor,
  isSubtaskExecutionParticipant,
  isTaskLeadOrContributor,
} from "../workPermissions";

const tree = (
  lead = "task-lead",
  kind: "office" | "personal" = "office",
  extra?: Partial<WorkTreeSnapshot["root"]>,
) =>
  ({
    root: {
      id: "task-1",
      kind,
      project: "proj-1",
      office: kind === "office" ? "office-1" : null,
      lead,
      open: true,
      people: [],
      ...extra,
    },
  }) as unknown as WorkTreeSnapshot;

const node = (extra?: Partial<WorkNode>) =>
  ({
    id: "sub-1",
    task_id: "task-1",
    parent_subtask_id: null,
    title: "Draft memo",
    status: "in_progress",
    lead_id: "sub-lead",
    assigned_to_ids: ["sub-lead", "contrib-1"],
    sibling_order: 0,
    percent_complete: 0,
    is_standalone: false,
    can_manage: false,
    can_appoint: false,
    can_order: false,
    can_work: true,
    can_review: false,
    current_reviewer: null,
    capabilities: {},
    ...extra,
  }) as unknown as WorkNode;

test("isTaskLeadOrContributor allows only appointed Task Lead and task contributors", () => {
  const task = { assigneeId: "task-lead", teamMemberIds: ["contrib-1"] };
  expect(isTaskLeadOrContributor(task, "task-lead")).toBe(true);
  expect(isTaskLeadOrContributor(task, "contrib-1")).toBe(true);
  expect(isTaskLeadOrContributor(task, "project-lead")).toBe(false);
  expect(isTaskLeadOrContributor(task, null)).toBe(false);
});

test("subtask execution excludes unassigned Task Leads and other supervising appointments", () => {
  const work = tree("task-lead");
  const sub = node();
  expect(isSubtaskLeadOrContributor(work, sub, "task-lead")).toBe(false);
  expect(isSubtaskLeadOrContributor(work, sub, "sub-lead")).toBe(true);
  expect(isSubtaskLeadOrContributor(work, sub, "contrib-1")).toBe(true);
  expect(isSubtaskLeadOrContributor(work, sub, "project-lead")).toBe(false);
  expect(isSubtaskLeadOrContributor(work, sub, "head")).toBe(false);
  expect(isSubtaskLeadOrContributor(work, sub, "ancestor-lead")).toBe(false);
  expect(isSubtaskLeadOrContributor(work, sub, null)).toBe(false);
  sub.assigned_to_ids = ["task-lead"];
  expect(isSubtaskLeadOrContributor(work, sub, "task-lead")).toBe(true);
  sub.assigned_to_ids = null as unknown as string[];
  expect(isSubtaskLeadOrContributor(work, sub, "task-lead")).toBe(false);
  expect(isSubtaskLeadOrContributor(work, sub, "sub-lead")).toBe(true);
});

test("Personal root Lead execution remains separate from Office subtask membership", () => {
  expect(isSubtaskExecutionParticipant(tree(), node(), "task-lead")).toBe(false);
  expect(isSubtaskExecutionParticipant(tree("task-lead", "personal"), node(), "task-lead")).toBe(true);
});

test("isProjectLeadSubtaskPlanningBlocked allows planning projects and active Task Leads, while blocking non-Task-Lead Project Leads once active", () => {
  const work = tree("task-lead");
  expect(
    isProjectLeadSubtaskPlanningBlocked(work, "project-lead", {
      projectStatus: "planning",
      projectLeadId: "project-lead",
      actorRole: "member",
    }),
  ).toBe(false);
  expect(
    isProjectLeadSubtaskPlanningBlocked(work, "project-lead", {
      projectStatus: "planning",
      projectLeadId: "project-lead",
      actorRole: "head",
    }),
  ).toBe(false);
  expect(
    isProjectLeadSubtaskPlanningBlocked(work, "project-lead", {
      projectStatus: "active",
      projectLeadId: "project-lead",
      actorRole: "member",
    }),
  ).toBe(true);
  expect(
    isProjectLeadSubtaskPlanningBlocked(work, "project-lead", {
      projectStatus: "on_hold",
      projectLeadId: "project-lead",
      actorRole: "head",
    }),
  ).toBe(true);
  expect(
    isProjectLeadSubtaskPlanningBlocked(work, "task-lead", {
      projectStatus: "active",
      projectLeadId: "task-lead",
      actorRole: "member",
    }),
  ).toBe(false);
  expect(
    isProjectLeadSubtaskPlanningBlocked(work, "sub-lead", {
      projectStatus: "active",
      projectLeadId: "project-lead",
      actorRole: "member",
    }),
  ).toBe(false);
});

test("canDecideSubtaskProposals allows only Task Lead or Subtask Lead", () => {
  const work = tree("task-lead");
  const sub = node();
  expect(canDecideSubtaskProposals(work, sub, "task-lead")).toBe(true);
  expect(canDecideSubtaskProposals(work, sub, "sub-lead")).toBe(true);
  expect(canDecideSubtaskProposals(work, sub, "contrib-1")).toBe(false);
  expect(canDecideSubtaskProposals(work, sub, "project-lead")).toBe(false);
});
