import { test, expect, jest } from "@jest/globals";
import { webHandoffUrl } from "../webHandoff";

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
  ).toBe(origin + "/projects?project=p&view=people");
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
