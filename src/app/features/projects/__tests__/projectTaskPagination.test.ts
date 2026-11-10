import { expect, jest, test } from "@jest/globals";
import { createClient } from "@supabase/supabase-js";
import {
  fetchProjectAgendaPage,
  fetchProjectBoardPage,
  fetchProjectCompletion,
  fetchProjectTaskPage,
} from "../services";

const mockFetch =
  jest.fn<
    (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  >();
const mockClient = createClient(
  "https://pagination-fixture.invalid",
  "fixture-key",
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (...args) => mockFetch(...args) },
  },
);
jest.mock("../../../../platform/supabase", () => ({
  get supabase() {
    return mockClient;
  },
}));

const groups = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    projectId: "project",
    title: "First",
    color: "#000",
    position: 0,
    isDefault: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    projectId: "project",
    title: "Second",
    color: "#000",
    position: 1,
    isDefault: false,
  },
];
const tasks = Array.from({ length: 51 }, (_, index) => ({
  id: `10000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
  workspace_position: 0,
  group_id: groups[0].id,
}));
const json = (rows: unknown[]) =>
  new Response(JSON.stringify(rows), { status: 200 });
const query = (call: number) =>
  new URL(String(mockFetch.mock.calls[call][0])).searchParams;

test("project pages request a bounded window and resume tied positions before advancing to the next group", async () => {
  mockFetch
    .mockReset()
    .mockResolvedValueOnce(json(tasks))
    .mockResolvedValueOnce(json(tasks.slice(50)))
    .mockResolvedValueOnce(
      json([{ ...tasks[0], id: "next-group", group_id: groups[1].id }]),
    )
    .mockResolvedValueOnce(json([]));
  const search = 'a*, "(b)"';
  const first = await fetchProjectTaskPage("project", groups, false, search);
  expect(first.tasks).toHaveLength(50);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(query(0).get("limit")).toBe("51");
  expect(query(0).get("order")).toBe("workspace_position.asc,id.asc");
  expect(query(0).get("archived_at")).toBe("is.null");
  expect(query(0).get("deleted_at")).toBe("is.null");
  expect(query(0).get("linked_project_id")).toBe("eq.project");
  expect(query(0).getAll("or")).toEqual([
    `(group_id.eq.${groups[0].id},group_id.is.null)`,
    String.raw`(title.imatch."a\\*, \"\\(b\\)\"",description.imatch."a\\*, \"\\(b\\)\"",assignee_name.imatch."a\\*, \"\\(b\\)\"")`,
  ]);

  const second = await fetchProjectTaskPage(
    "project",
    groups,
    false,
    search,
    first.next,
  );
  expect(second.tasks.map((task) => task.id)).toEqual([
    tasks[50].id,
    "next-group",
  ]);
  expect(second.next).toBeUndefined();
  expect(query(1).getAll("or")).toContain(
    `(workspace_position.gt.0,and(workspace_position.eq.0,id.gt.${tasks[49].id}))`,
  );
  expect(query(2).get("group_id")).toBe(`eq.${groups[1].id}`);
  expect(query(3).getAll("or")[0]).toBe(
    `(group_id.not.in.(${groups[0].id},${groups[1].id}))`,
  );
});

test("completion counts include archived history for a closed project and exclude cancelled tasks", async () => {
  mockFetch
    .mockReset()
    .mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: { "content-range": "*/130" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(null, { status: 200, headers: { "content-range": "*/52" } }),
    );
  await expect(fetchProjectCompletion("project", true)).resolves.toEqual({
    required: 130,
    completed: 52,
  });
  expect(mockFetch.mock.calls.map(([, init]) => init?.method)).toEqual([
    "HEAD",
    "HEAD",
  ]);
  expect(query(0).get("or")).toBe("(status.neq.cancelled,status.is.null)");
  expect(query(1).get("status")).toBe("eq.completed");
  expect(query(0).has("archived_at")).toBe(false);
});

test("Board fills pages in status order and resumes within the same status", async () => {
  mockFetch
    .mockReset()
    .mockResolvedValueOnce(json([]))
    .mockResolvedValueOnce(
      json(tasks.map((task) => ({ ...task, status: "todo" }))),
    );
  const first = await fetchProjectBoardPage("project", false, "inspection");
  expect(first.tasks).toHaveLength(50);
  expect(query(0).get("status")).toBe("eq.pending_assignment");
  expect(query(1).get("status")).toBe("eq.todo");
  expect(query(1).getAll("or")[0]).toContain('title.imatch."inspection"');
  mockFetch
    .mockResolvedValueOnce(json([{ ...tasks[50], status: "todo" }]))
    .mockResolvedValueOnce(
      json([{ ...tasks[0], id: "progress", status: "in_progress" }]),
    );
  for (let i = 0; i < 4; i++) mockFetch.mockResolvedValueOnce(json([]));
  const next = await fetchProjectBoardPage(
    "project",
    false,
    "inspection",
    first.next,
  );
  expect(query(2).get("status")).toBe("eq.todo");
  expect(query(2).getAll("or")).toContain(
    `(workspace_position.gt.0,and(workspace_position.eq.0,id.gt.${tasks[49].id}))`,
  );
  expect(query(3).get("status")).toBe("eq.in_progress");
  expect(next.tasks.map(({ id }) => id)).toEqual([tasks[50].id, "progress"]);
  expect(next.next).toBeUndefined();
});

test("Agenda indexes dates once and only requests full rows for the next date range", async () => {
  const nov = { id: "nov", deadline: " 2026-11-18 ", due_date: "2026-12-31" };
  const dec = { id: "dec", due_date: "2026-12-02" };
  const fuzzy = { id: "fuzzy", due_date: "After site clearance" };
  const undated = { id: "undated" };
  mockFetch
    .mockReset()
    .mockResolvedValueOnce(json([dec, nov, fuzzy, undated]))
    .mockResolvedValueOnce(json([nov]));
  let page = await fetchProjectAgendaPage("project", true, "permit");
  expect(query(0).get("select")).toBe("id,deadline,due_date");
  expect(query(0).get("order")).toBe("workspace_position.asc,id.asc");
  expect(query(1).get("id")).toBe("in.(nov)");
  expect(query(1).get("select")).toBe("*");
  expect(query(1).has("archived_at")).toBe(false);
  expect(query(1).getAll("or")[0]).toContain('title.imatch."permit"');
  expect(page.tasks[0].deadline).toBe("2026-11-18");
  for (const [i, row] of [dec, fuzzy, undated].entries()) {
    mockFetch.mockResolvedValueOnce(json([row]));
    page = await fetchProjectAgendaPage("project", true, "permit", page.next);
    expect(query(i + 2).get("id")).toBe(`in.(${row.id})`);
    expect(page.tasks[0].id).toBe(row.id);
  }
  expect(page.next).toBeUndefined();
  expect(mockFetch).toHaveBeenCalledTimes(5);
});
