import { expect, test } from "@jest/globals";
import { projectSections, taskSections } from "../mobileProjects";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";
import type { WorkspaceProject } from "../../../../core/web/app/features/workspaces/types";

const project = (id: string, status = "active"): WorkspaceProject => ({
  id,
  title: id,
  status,
  home_workspace_id: "office",
  kind: "office",
});

test("projects honor current workspace scope and deduplicate favorites and shortcuts", () => {
  const active = project("Office Alpha");
  const personal = {
    ...project("Personal Alpha"),
    kind: "personal" as const,
    shortcut: true,
  };
  const archived = project("Archived Alpha", "archived");
  const projects = [
    active,
    active,
    personal,
    archived,
    project("Other"),
    project("Planning Alpha", "planning"),
    project("Completed Alpha", "completed"),
  ];
  expect(
    projectSections(
      projects,
      new Set([active.id, "revoked"]),
      " Alpha ",
      "current",
    ).map(({ key, data }) => [key, data.map((row) => row.id)]),
  ).toEqual([
    ["favorites", [active.id]],
    ["projects", [personal.id, "Completed Alpha"]],
  ]);
  expect(projectSections(projects, new Set(["Planning Alpha"]), "Planning", "all")).toEqual([]);
  expect(projectSections(projects, new Set(), "", "archived")[0].data).toEqual([
    archived,
  ]);
});

test("group, status and agenda retain exact task IDs, including missing group and undated work", () => {
  const tasks = [
    { id: "a", groupId: "existing", status: "todo", dueDate: "2026-12-02" },
    {
      id: "b",
      groupId: "no-longer-visible",
      status: "completed",
      deadline: "2026-11-20",
    },
    { id: "c", status: "cancelled" },
  ] as Task[];
  const groups = [
    {
      id: "existing",
      title: "Delivery",
      isDefault: true,
      projectId: "project",
      color: "#fff",
      position: 0,
    },
  ];
  const ids = (view: Parameters<typeof taskSections>[2]) =>
    taskSections(tasks, groups, view).map(({ title, data }) => [
      title,
      data.map((task) => task.id),
    ]);
  expect(ids("tasks")).toEqual([
    ["Delivery", ["a", "c"]],
    ["Ungrouped", ["b"]],
  ]);
  expect(ids("board")).toEqual([
    ["To do", ["a"]],
    ["Completed", ["b"]],
    ["Cancelled", ["c"]],
  ]);
  expect(ids("calendar")).toEqual([
    ["2026-11-20", ["b"]],
    ["2026-12-02", ["a"]],
    ["No due date", ["c"]],
  ]);
});
