import { expect, test } from "@jest/globals";
import type { WorkRow } from "../../../../core/web/app/features/personal-work/types";
import { groupAssignedWork } from "../mobileWork";

const row = (key: string, patch: Partial<WorkRow> = {}): WorkRow => ({
  key,
  id: key,
  rootId: key,
  title: key,
  kind: "office-task",
  workspaceId: "a",
  projectTitle: "Permit intake",
  workspaceName: "Office A",
  timezone: "Asia/Singapore",
  status: "in_progress",
  progress: 10,
  mine: true,
  leading: false,
  actionable: true,
  history: false,
  relation: "Contributor",
  ...patch,
});
const now = new Date("2026-11-04T18:00:00Z");

test("unifies assigned roots and nodes using their own workspace calendar, without promoting a node's root", () => {
  const groups = groupAssignedWork(
    [
      row("ancestor", { mine: false, due: "2026-11-05" }),
      row("node", {
        rootId: "ancestor",
        kind: "office-node",
        due: "2026-11-05",
      }),
      row("yesterday", { due: "2026-11-04" }),
      row("tomorrow", { kind: "personal-task", due: "2026-11-06" }),
      row("historical", {
        history: true,
        status: "cancelled",
        due: "2026-11-04",
      }),
      row("done", { history: true, status: "completed", due: "2026-11-04" }),
      row("no-date"),
    ],
    "",
    "",
    now,
  );
  expect(
    Object.fromEntries(
      groups.map((group) => [group.title, group.data.map((item) => item.key)]),
    ),
  ).toEqual({
    Overdue: ["yesterday"],
    Today: ["node"],
    Upcoming: ["tomorrow"],
    Unscheduled: ["no-date"],
    Completed: ["done"],
    "Other history": ["historical"],
  });
});

test("search and workspace filters preserve only authorized assigned context", () => {
  const groups = groupAssignedWork(
    [
      row("other-context", { workspaceId: "b", rootTitle: "Intake check" }),
      row("matched", {
        rootTitle: "Intake check",
        status: "submitted",
        actionable: false,
      }),
      row("not-assigned", { rootTitle: "Intake check", mine: false }),
      row("no-access", { rootTitle: "Intake check", actionable: false }),
    ],
    " intake check ",
    "a",
    now,
  );
  expect(groups.flatMap((group) => group.data.map((item) => item.key))).toEqual(
    ["matched"],
  );
});
