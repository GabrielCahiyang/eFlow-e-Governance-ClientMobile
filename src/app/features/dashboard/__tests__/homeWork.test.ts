import { expect, test } from "@jest/globals";
import type { WorkRow } from "../../../../core/web/app/features/personal-work/types";
import type { WorkspaceSnapshot } from "../../../../core/web/app/features/workspaces/types";
import { currentOfficeProjects, memberHome, officeHomeWork } from "../homeWork";

const now = new Date("2026-11-24T17:30:00Z");
const scope = {
  workspace: { id: "office-workspace", office_id: "office" },
  projects: [
    {
      id: "a",
      title: "Alpha",
      kind: "office",
      status: "on_hold",
      home_workspace_id: "office-workspace",
    },
    {
      id: "b",
      title: "Beta",
      kind: "office",
      status: "active",
      home_workspace_id: "office-workspace",
    },
    {
      id: "c",
      title: "Closeout",
      kind: "office",
      status: "completed",
      home_workspace_id: "office-workspace",
    },
    {
      id: "d",
      title: "Other Office",
      kind: "office",
      status: "active",
      home_workspace_id: "other-workspace",
    },
  ],
} as WorkspaceSnapshot;
const row = (key: string, extra: Partial<WorkRow> = {}) =>
  ({
    id: key,
    key,
    title: key,
    rootId: key,
    kind: "office-task",
    status: "in_progress",
    projectId: "b",
    workspaceId: "office-workspace",
    timezone: "Asia/Manila",
    mine: true,
    leading: true,
    actionable: true,
    history: false,
    task: { id: key, orgId: "office", assigneeId: "actor" },
    relation: "Task Lead",
    ...extra,
  }) as WorkRow;

test("Member priorities rank returned and local overdue work ahead of due-today work, while separating waiting items", () => {
  const data = memberHome(
    [
      row("today", { due: "2026-11-25" }),
      row("past", { due: "2026-11-24" }),
      row("returned", { status: "changes_requested", due: "2026-11-28" }),
      row("submitted", { status: "for_review", due: "2026-11-24" }),
      row("contributor", { leading: false }),
      row("other", { workspaceId: "other-workspace" }),
      row("node-without-grant", { kind: "office-node" }),
    ],
    "actor",
    "office-workspace",
    now,
  );
  expect(data.priorities.map((item) => item.key)).toEqual([
    "returned",
    "past",
    "today",
  ]);
  expect(data.waiting.map((item) => item.key)).toEqual(["submitted"]);
  expect([data.overdue, data.today, data.awaiting]).toEqual([1, 1, 1]);
});

test("Member Home preserves contributor visibility without granting unauthorized lead execution", () => {
  const data = memberHome(
    [
      row("contrib-returned", {
        status: "changes_requested",
        due: "2026-11-28",
        leading: false,
        relation: "Contributor",
      }),
      row("contrib-overdue", {
        due: "2026-11-24",
        leading: false,
        relation: "Contributor",
      }),
      row("contrib-subtask", {
        kind: "office-node",
        due: "2026-11-25",
        leading: false,
        relation: "Contributor",
      }),
      row("contrib-upcoming", {
        due: "2026-11-28", // +3 days
        leading: false,
        relation: "Contributor",
      }),
    ],
    "actor",
    "office-workspace",
    now,
  );

  // Top 3 priority items: returned, overdue, due-today
  expect(data.priorities.map((item) => item.key)).toEqual([
    "contrib-returned",
    "contrib-overdue",
    "contrib-subtask",
  ]);

  // Contributor items retain visibility but cannot execute lead actions
  expect(data.priorities[0].actionable).toBe(false);
  expect(data.priorities[0].actionLabel).toBe("Open assigned task");
  expect(data.priorities[0].relation).toBe("Contributor");

  expect(data.priorities[2].actionable).toBe(false);
  expect(data.priorities[2].actionLabel).toBe("Open assigned subtask");

  // Upcoming within 7 days appears in comingUp, deduplicated from priorities
  expect(data.comingUp.map((item) => item.key)).toEqual(["contrib-upcoming"]);
  expect(data.comingUp[0].daysUntil).toBe(3);

  // Accurate summary indicators (returned is due 11-28 so not overdue)
  expect(data.overdue).toBe(1);
  expect(data.today).toBe(1);
  expect(data.awaiting).toBe(0);
});

test("Office Home uses recorded risk and ignores records outside the Office and workspace", () => {
  const signals = officeHomeWork(
    [
      row("blocked", {
        blocker: "Permit missing",
        mine: false,
        leading: false,
      }),
      row("out-of-scope", {
        workspaceId: "other-workspace",
        projectId: "outside",
        blocker: "Hidden",
      }),
      row("pending", { status: "for_review", due: "2026-11-24" }),
    ],
    scope,
    "actor",
    now,
  );
  expect(signals.overdueOrBlocked).toBe(1);
  expect(signals.attention[0].description).toContain("Waiting on others");
  expect(
    currentOfficeProjects(scope, signals.risk).map((project) => project.id),
  ).toEqual(["b", "a"]);
  expect(
    currentOfficeProjects(scope, new Map()).map((project) => project.id),
  ).toEqual(["a", "b"]);
});
