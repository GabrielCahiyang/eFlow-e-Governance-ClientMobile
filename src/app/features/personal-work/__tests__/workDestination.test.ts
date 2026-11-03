import { test, expect } from "@jest/globals";
import { workDestination } from "../workDestination";
import type { WorkRow } from "../../../../core/web/app/features/personal-work/types";
test("Office subitem links retain root and branch context instead of opening a node as a task", () => {
  expect(
    workDestination({
      kind: "office-node",
      rootId: "root",
      id: "child",
      projectId: "project",
    } as WorkRow),
  ).toEqual({
    name: "task",
    id: "root",
    projectId: "project",
    nodeId: "child",
    view: "subitems",
  });
});
test("personal work opens its personal project with the root expanded and never crosses to an Office task route", () => {
  expect(
    workDestination({
      kind: "personal-node",
      rootId: "personal-root",
      id: "child",
      projectId: "personal-project",
    } as WorkRow),
  ).toEqual({
    name: "personal_project",
    id: "personal-project",
    taskId: "personal-root",
    nodeId: "child",
    view: "tasks",
  });
  expect(() =>
    workDestination({ kind: "personal-task", rootId: "root" } as WorkRow),
  ).toThrow("project context");
});
