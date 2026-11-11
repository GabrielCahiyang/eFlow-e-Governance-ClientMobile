import { test, expect, jest } from "@jest/globals";
import {
  primaryTabs,
  defaultTab,
  resolveMobileRoute,
  bindWorkspace,
  routeFitsWorkspace,
  readMobileLocation,
} from "../mobileScope";
import type { AppRoute, PrimaryTab } from "../../../shared/routes";
import type { WorkspaceSnapshot } from "../../../../core/web/app/features/workspaces/types";
const office = {
  workspace: { id: "office-a", kind: "office" },
  projects: [{ id: "project-a" }],
} as WorkspaceSnapshot;
const personal = {
  workspace: { id: "personal-b", kind: "personal" },
  projects: [{ id: "project-b" }],
} as WorkspaceSnapshot;

test("mobile role defaults never inherit desktop Accounting or Member defaults", () => {
  expect(defaultTab()).toBe("home");
  expect(primaryTabs("head")).toEqual([
    "home",
    "work",
    "projects",
    "inbox",
    "more",
  ]);
  expect(primaryTabs("member")).toEqual(primaryTabs("head"));
  expect(primaryTabs("accounting_staff")).toEqual([
    "home",
    "work",
    "accounting",
    "inbox",
    "more",
  ]);
  expect(primaryTabs("admin")).toEqual([]);
  expect(primaryTabs("unknown")).toEqual([]);
});

test("Accounting project routes restore to More or stay in the financial stack", () => {
  const route = { name: "project", id: "project-a" } as const;
  expect(
    resolveMobileRoute(route, "accounting_staff", () => true),
  ).toMatchObject({ tab: "more", disposition: "native" });
  expect(
    resolveMobileRoute(
      { ...route, originTab: "projects" },
      "accounting_staff",
      () => true,
    ).tab,
  ).toBe("more");
  expect(
    resolveMobileRoute(route, "accounting_staff", () => true, "accounting").tab,
  ).toBe("accounting");
  expect(
    resolveMobileRoute(route, "accounting_staff", () => false).disposition,
  ).toBe("denied");
});

test("Office Analytics uses the native Head route and the configured Web handoff explicitly", () => {
  const reports = (key: string) => key === "navigation.reports";
  expect(
    resolveMobileRoute(
      { name: "reports", view: "risks" },
      "head",
      reports,
      "home",
    ),
  ).toMatchObject({
    tab: "home",
    disposition: "native",
    route: { name: "reports", view: "risks" },
  });
  expect(
    resolveMobileRoute({ name: "reports", view: "web" }, "head", reports)
      .disposition,
  ).toBe("web");
  expect(
    resolveMobileRoute({ name: "reports" }, "head", () => false).disposition,
  ).toBe("denied");
});

test.each(["home", "work", "inbox", "projects", "more"] as PrimaryTab[])(
  "a task opened from %s keeps its exact branch and originating tab",
  (origin) => {
    const route: AppRoute = {
      name: "task",
      id: "root-a",
      nodeId: "depth-eight-node",
      projectId: "project-a",
      view: "review",
    };
    const result = resolveMobileRoute(
      bindWorkspace(route, office),
      "head",
      () => true,
      origin,
    );
    expect(result.tab).toBe(origin);
    expect(result.route).toMatchObject({
      ...route,
      originTab: origin,
      workspaceId: "office-a",
      workspaceKind: "office",
    });
    expect(result.disposition).toBe("native");
  },
);

test("a context switch cannot reinterpret Office task IDs as personal IDs or render stale Office data", () => {
  const route = bindWorkspace(
    { name: "task", id: "root-a", nodeId: "node-a", projectId: "project-a" },
    office,
  );
  expect(routeFitsWorkspace(route, office)).toBe(true);
  expect(routeFitsWorkspace(route, personal)).toBe(false);
  expect(routeFitsWorkspace(route, undefined)).toBe(false);
  expect(
    routeFitsWorkspace({ name: "project", id: "other-project" }, office),
  ).toBe(false);
  expect(
    routeFitsWorkspace({ name: "personal_project", id: "project-b" }, personal),
  ).toBe(true);
  expect(routeFitsWorkspace({ name: "personal_work" }, personal)).toBe(true);
});

test("a link to another authorized workspace is not bound to the workspace where it was opened", () => {
  const route: AppRoute = {
    name: "personal_project",
    id: "project-b",
    taskId: "root-b",
    nodeId: "child-b",
  };
  const pending = bindWorkspace(route, office);
  expect(pending).toEqual(route);
  expect(routeFitsWorkspace(pending, office)).toBe(false);
  expect(routeFitsWorkspace(pending, personal)).toBe(true);
});

test("a personal project can open from an Office only through its server-listed shortcut", () => {
  const route: AppRoute = { name: "personal_project", id: "project-b" };
  const project = {
    id: "project-b",
    title: "Personal project",
    kind: "personal" as const,
    status: "active",
    home_workspace_id: "personal-b",
  };
  expect(routeFitsWorkspace(route, { ...office, projects: [project] })).toBe(
    false,
  );
  expect(
    routeFitsWorkspace(route, {
      ...office,
      projects: [{ ...project, shortcut: true }],
    }),
  ).toBe(true);
});

test("unsupported and denied links are useful explanations and do not confer authority", () => {
  expect(
    resolveMobileRoute(
      { name: "unknown-future-link" } as unknown as AppRoute,
      "member",
      () => true,
    ).disposition,
  ).toBe("unavailable");
  expect(
    resolveMobileRoute({ name: "live" }, "member", () => true).disposition,
  ).toBe("unavailable");
  expect(
    resolveMobileRoute({ name: "task", id: "root" }, "member", () => false)
      .disposition,
  ).toBe("denied");
  expect(
    resolveMobileRoute(
      { name: "project", id: "project-a", view: "gantt" },
      "head",
      () => true,
    ).disposition,
  ).toBe("web");
  expect(
    resolveMobileRoute(
      { name: "accounting_journal" },
      "accounting_staff",
      () => true,
    ).disposition,
  ).toBe("web");
  for (const name of [
    "users",
    "permissions",
    "migration",
    "administration",
    "audit",
    "org_tree",
  ] as const)
    expect(resolveMobileRoute({ name }, "head", () => true).disposition).toBe(
      "denied",
    );
  expect(
    resolveMobileRoute({ name: "project", id: "p" }, "admin", () => true)
      .disposition,
  ).toBe("denied");
  expect(
    resolveMobileRoute({ name: "task" }, "head", () => true).disposition,
  ).toBe("unavailable");
});

test("legacy review and notification routes share Inbox without discarding linked node identity", () => {
  const result = resolveMobileRoute(
    { name: "reviews", id: "root", nodeId: "node" },
    "member",
    () => false,
  );
  expect(result).toMatchObject({
    tab: "inbox",
    disposition: "native",
    route: { name: "inbox", id: "root", nodeId: "node" },
  });
});

test("reading navigator state uses actual owning tab and does not mistake More root for Profile detail", () => {
  expect(
    readMobileLocation({
      index: 0,
      routes: [
        {
          name: "inbox",
          state: {
            index: 1,
            routes: [
              { name: "Root" },
              {
                name: "Destination",
                params: { name: "task", id: "root", nodeId: "node" },
              },
            ],
          },
        },
      ],
    }),
  ).toEqual({
    tab: "inbox",
    route: { name: "task", id: "root", nodeId: "node" },
  });
  expect(
    readMobileLocation({
      routes: [
        {
          name: "more",
          state: { routes: [{ name: "Root", params: { name: "profile" } }] },
        },
      ],
    }),
  ).toEqual({ tab: "more", route: undefined });
});

test("advanced finance views cannot mount through any Office finance alias", () => {
  const aliases = [
    "budget",
    "accounting_overview",
    "accounting_releases",
    "accounting_budgets",
  ] as const;
  for (const name of aliases)
    for (const view of [
      "annual",
      "mapping",
      "journal",
      "audit",
      "expenses",
      "exports",
      "petty-cash",
      "funding",
    ])
      expect(
        resolveMobileRoute({ name, view }, "accounting_staff", () => true)
          .disposition,
      ).toBe("web");
});

test("cash queues require Accounting release entitlement and preserve request context", () => {
  const route = {
    name: "accounting_releases",
    recordId: "request",
    financialOfficeId: "office-b",
    fiscalYear: 2025,
  } as const;
  expect(
    resolveMobileRoute(route, "accounting_staff", () => true, "accounting"),
  ).toMatchObject({
    disposition: "native",
    route,
  });
  expect(resolveMobileRoute(route, "member", () => true).disposition).toBe(
    "denied",
  );
  expect(
    resolveMobileRoute(
      { name: "accounting_overview", view: "requests" },
      "accounting_staff",
      (key) => key === "navigation.accounting_overview",
    ).disposition,
  ).toBe("denied");
  const task = {
    name: "task",
    id: "root",
    projectId: "project",
    nodeId: "branch",
    recordId: "release",
    view: "budget",
  } as const;
  expect(resolveMobileRoute(task, "member", () => true, "inbox")).toMatchObject(
    { disposition: "native", route: task, tab: "inbox" },
  );
  expect(
    resolveMobileRoute(
      { ...task, view: "funding_configuration" },
      "head",
      () => true,
    ).disposition,
  ).toBe("web");
});

test("retired work screens resolve to focused native lists while administration hands off", () => {
  const can = () => true;
  expect(
    resolveMobileRoute({ name: "settings", view: "profile" }, "member", can),
  ).toMatchObject({
    disposition: "native",
    tab: "more",
    route: { name: "profile" },
  });
  expect(resolveMobileRoute({ name: "tasks" }, "head", can)).toMatchObject({
    disposition: "native",
    tab: "work",
    route: { name: "personal_work" },
  });
  expect(
    resolveMobileRoute({ name: "deadlines" }, "member", can),
  ).toMatchObject({
    disposition: "native",
    tab: "work",
    route: { name: "personal_work", view: "deadlines" },
  });
  expect(
    resolveMobileRoute({ name: "team" }, "head", can, "home"),
  ).toMatchObject({
    disposition: "web",
    tab: "home",
    route: { name: "office_team" },
  });
  expect(
    resolveMobileRoute({ name: "office_team" }, "head", () => false)
      .disposition,
  ).toBe("denied");
  for (const [name, view] of [
    ["personal_project", "access_management"],
    ["personal_project", "closeout"],
    ["personal_project", "planning"],
    ["project", "people_management"],
    ["project", "file_management"],
    ["task", "file_management"],
  ] as const) {
    const route = { name, id: "record", view };
    expect(resolveMobileRoute(route, "head", can, "projects")).toMatchObject({
      disposition: "web",
      tab: "projects",
      route,
    });
  }
});

test.each(["activity", "review", "budget", "files"])(
  "task %s retains the originating Inbox stack and record",
  (view) => {
    const route = {
      name: "task",
      id: "root",
      projectId: "project",
      recordId: "submission",
      view,
    } as const;
    expect(
      resolveMobileRoute(route, "member", () => true, "inbox"),
    ).toMatchObject({
      disposition: "native",
      tab: "inbox",
      route,
    });
  },
);
