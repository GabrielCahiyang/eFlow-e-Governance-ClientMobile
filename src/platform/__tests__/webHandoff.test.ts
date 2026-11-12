import { test, expect, jest } from "@jest/globals";
import { webHandoffUrl } from "../webHandoff";

test("Office Budget handoff preserves the fiscal year and annual view", () => {
  expect(
    webHandoffUrl(
      { name: "budget", view: "annual", fiscalYear: 2026 },
      "https://eflow.test",
    ),
  ).toBe("https://eflow.test/office-budget?fy=2026&view=annual");
});

test("Office Analytics opens the real Web reports route with only workspace context", () => {
  expect(
    webHandoffUrl(
      { name: "reports", view: "web", workspaceId: "office-workspace" },
      "https://eflow.test",
    ),
  ).toBe("https://eflow.test/reports?workspace=office-workspace");
  expect(webHandoffUrl({ name: "reports", view: "web" }, "")).toBeUndefined();
});

test("web handoff preserves only validated display context under the configured HTTPS origin", () => {
  const result = webHandoffUrl(
    {
      name: "project",
      id: "p&other=1",
      view: "gantt",
      workspaceId: "office",
      token: "do-not-forward",
      nodeId: "private-node",
    },
    "https://eflow.example.test",
  );
  const url = new URL(result!);
  expect(url.origin).toBe("https://eflow.example.test");
  expect(url.pathname).toBe("/projects");
  expect(url.searchParams.get("project")).toBe("p&other=1");
  expect(url.searchParams.get("workspace")).toBe("office");
  expect(url.searchParams.get("view")).toBe("gantt");
  expect(url.searchParams.has("token")).toBe(false);
  expect(url.searchParams.has("nodeId")).toBe(false);
});

test("missing or untrusted web configuration and Admin routes never produce a handoff action", () => {
  for (const value of [
    "",
    "javascript:alert(1)",
    "http://eflow.test",
    "https://user:password@eflow.test",
    "https://eflow.test/redirect",
    "https://eflow.test?next=evil",
    "https://eflow.test#token",
  ])
    expect(webHandoffUrl({ name: "identity" }, value)).toBeUndefined();
  expect(
    webHandoffUrl({ name: "users" }, "https://eflow.test"),
  ).toBeUndefined();
});

test("funding setup handoffs use supported web display views", () => {
  const origin = "https://eflow.example.test";
  expect(
    webHandoffUrl(
      { name: "project", id: "project-a", view: "funding_configuration" },
      origin,
    ),
  ).toBe(origin + "/projects?project=project-a&view=budget");
  expect(
    webHandoffUrl(
      { name: "task", id: "task-a", view: "funding_configuration" },
      origin,
    ),
  ).toBe(origin + "/office-budget?view=funding");
  expect(
    webHandoffUrl({ name: "accounting_releases", view: "exports" }, origin),
  ).toBe(origin + "/voucher-cash-releases?view=exports");
});

test("management handoffs use known web displays and omit private branch context", () => {
  const origin = "https://eflow.example.test";
  expect(webHandoffUrl({ name: "office_team" }, origin)).toBe(
    origin + "/team-supervision",
  );
  expect(
    webHandoffUrl(
      { name: "project", id: "p", view: "people_management" },
      origin,
    ),
  ).toBe(origin + "/projects?project=p&people=add&view=people");
  expect(
    webHandoffUrl(
      {
        name: "personal_project",
        id: "p",
        nodeId: "private",
        view: "closeout",
      },
      origin,
    ),
  ).toBe(origin + "/projects?project=p");
});

test("Phase 3 links keep the workspace and exact project and use supported Web views", () => {
  const origin = "https://eflow.example.test";
  for (const [view, target] of Object.entries({
    project_setup: "settings",
    task_templates: "settings",
    ai_draft: "settings",
    import: "tasks",
    audit_trail: "audit-trail",
    analytics: "analytics",
  })) {
    expect(
      webHandoffUrl(
        { name: "project", id: "p", workspaceId: "office", view },
        origin,
      ),
    ).toBe(origin + "/projects?project=p&workspace=office&view=" + target);
  }
  expect(
    webHandoffUrl(
      { name: "projects", workspaceId: "office", view: "project_setup" },
      origin,
    ),
  ).toBe(origin + "/projects?workspace=office");
});
