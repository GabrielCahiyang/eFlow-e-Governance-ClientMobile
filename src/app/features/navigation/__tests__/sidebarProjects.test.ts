import { test, expect } from "@jest/globals";
import { sidebarProjectGroups } from "../sidebarProjects";
import type { WorkspaceProject } from "../../../../core/web/app/features/workspaces/types";
const project = (id: string, status = "active"): WorkspaceProject => ({
  id,
  title: id,
  status,
  kind: "office",
  home_workspace_id: "workspace",
});
test("favorited projects appear once and leave both regular and archived dropdowns", () => {
  const first = project("favorite"),
    groups = sidebarProjectGroups(
      [
        first,
        first,
        project("ordinary"),
        project("old", "archived"),
        project("starred-old", "archived"),
      ],
      new Set(["favorite", "starred-old", "unavailable"]),
    );
  expect(groups.favorites.map((p) => p.id)).toEqual([
    "favorite",
    "starred-old",
  ]);
  expect(groups.projects.map((p) => p.id)).toEqual(["ordinary"]);
  expect(groups.archived.map((p) => p.id)).toEqual(["old"]);
});
