import { expect, jest, test } from "@jest/globals";
import { createClient } from "@supabase/supabase-js";
import { fetchInboxUpdatePage } from "../inboxUpdates";

const mockFetch =
  jest.fn<
    (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  >();
const mockClient = createClient(
  "https://inbox-fixture.invalid",
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

test("unread history uses a recipient-scoped cursor with full timestamp precision and an ID tiebreaker", async () => {
  const createdAt = "2026-11-09T13:30:00.123456+00:00";
  const rows = Array.from({ length: 51 }, (_, i) => ({
    id: `11111111-0000-0000-0000-${String(51 - i).padStart(12, "0")}`,
    created_at: createdAt,
    title: "Update",
    read: false,
  }));
  mockFetch
    .mockResolvedValueOnce(new Response(JSON.stringify(rows), { status: 200 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify(rows.slice(50)), { status: 200 }),
    );
  const first = await fetchInboxUpdatePage("recipient", true);
  expect(first.items).toHaveLength(50);
  expect(first.next).toEqual({ createdAt, id: rows[49].id });
  const next = await fetchInboxUpdatePage("recipient", true, first.next);
  expect(next.items.map((item) => item.id)).toEqual([rows[50].id]);
  expect(next.next).toBeUndefined();
  const [, request] = mockFetch.mock.calls.map(
    ([url]) => new URL(String(url)).searchParams,
  );
  expect(request.get("user_id")).toBe("eq.recipient");
  expect(request.get("read")).toBe("eq.false");
  expect(request.get("order")).toBe("created_at.desc,id.desc");
  expect(request.get("limit")).toBe("51");
  expect(request.get("or")).toBe(
    `(created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${rows[49].id}))`,
  );
});
