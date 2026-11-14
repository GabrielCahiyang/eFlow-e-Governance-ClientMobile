import { expect, test } from "@jest/globals";
import { feedback, userErrorMessage } from "../userMessages";
import { loginErrorMessage } from "../../features/authentication/loginError";
import { displayWorkSnapshot } from "../../features/personal-work/displayWorkSnapshot";
import type { WorkSnapshot } from "../../../core/web/app/features/personal-work/types";

test.each([
  [{ message: "gateway connection refused", status: 503 }, feedback.load],
  [{ message: "offline policy", status: 403 }, feedback.access],
  [{ message: "opaque", status: 401 }, feedback.session],
  [{ message: "opaque", status: 404 }, feedback.unavailable],
  [{ name: "AbortError", message: "superseded" }, feedback.load],
  [{ name: "TimeoutError", message: "deadline" }, feedback.timeout],
  [new TypeError("Network request failed"), feedback.connection],
])(
  "classifies read recovery without exposing provider details: %j",
  (error, expected) => {
    expect(userErrorMessage(error)).toBe(expected);
  },
);

test.each([
  new Error(
    "permission denied for table profiles; https://secret.example.test key=private",
  ),
  new Error(
    "PGRST202 function internal_finance_guard missing from schema cache",
  ),
  { message: "invalid input syntax SQL user_table secret", code: "XX000" },
  new Error(
    "an arbitrary internal detail that contains no detectable technical keyword",
  ),
])("untrusted errors cannot expose provider messages: %j", (failure) => {
  const text = userErrorMessage(failure);
  expect(Object.values(feedback)).toContain(text);
  expect(text).not.toMatch(
    /profiles|PGRST|internal_finance|user_table|private|arbitrary/,
  );
});

test("login uses plain offline/timeout/account guidance, never the supplied account-error detail", () => {
  expect(loginErrorMessage(new TypeError("Network request failed"))).toBe(
    feedback.connection,
  );
  expect(
    loginErrorMessage(
      Object.assign(new Error("internal error"), { name: "TimeoutError" }),
    ),
  ).toMatch(/timed out/);
  for (const status of [401, 403, 423, 429, 500]) {
    const text = loginErrorMessage(
      Object.assign(new Error("sql private signing key"), {
        name: "AccountSignInError",
        status,
      }),
    );
    expect(text).not.toMatch(/sql|private|signing key|secure sign-in|service/i);
  }
  expect(userErrorMessage(new Error("Enter a work note."), "action")).toBe(
    "Enter a work note.",
  );
  expect(userErrorMessage(new Error("Network request failed"), "action")).toBe(
    "The connection was lost. Reconnect and check whether your changes were saved before trying again.",
  );
});

test.each([
  [{ code: "42501", message: "Only the appointed Task Lead can start this task" }, /appointed Task Lead/],
  [{ code: "22023", message: "Choose a start date within the parent schedule, or reschedule the parent first" }, /parent schedule/],
  [{ code: "P0001", message: "Project is on hold" }, /project is on hold/],
  [{ code: "22023", message: "Only 1,234.50 is available to protect on this budget line" }, /₱1,234.50/],
  [{ code: "40001", message: "unrecognized database detail" }, /item has changed/],
  [{ code: "XX000", message: "unexpected private implementation detail" }, /couldn't confirm/],
])("uses an actionable reason before the generic fallback: %j", (error, message) => {
  expect(userErrorMessage(error, "action")).toMatch(message);
});

test("the work display projection strips every source record and capability while retaining destination labels", () => {
  const snapshot = {
    rows: [
      {
        key: "row",
        id: "node",
        rootId: "root",
        title: "Task",
        kind: "personal-node",
        projectId: "project",
        projectTitle: "Project",
        workspaceName: "Office",
        timezone: "Asia/Manila",
        status: "todo",
        progress: 0,
        mine: true,
        leading: true,
        history: false,
        relation: "Lead",
        actionable: true,
        tree: { capabilities: { approve: true } },
        task: {},
        subtask: {},
        node: {},
        personal: {},
        personalTask: {},
      },
    ],
    projects: [],
    workspaces: [],
    issues: [],
    unavailable: [],
    loadedAt: 1,
  } as unknown as WorkSnapshot;
  const result = displayWorkSnapshot(snapshot).rows[0];
  expect(result).toMatchObject({
    id: "node",
    rootId: "root",
    projectId: "project",
    title: "Task",
    actionable: false,
  });
  for (const key of [
    "tree",
    "task",
    "subtask",
    "node",
    "personal",
    "personalTask",
  ])
    expect(result).not.toHaveProperty(key);
  expect(snapshot.rows[0].actionable).toBe(true);
});
