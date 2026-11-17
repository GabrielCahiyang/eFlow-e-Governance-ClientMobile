import { beforeEach, expect, jest, test } from "@jest/globals";
import { createClient } from "@supabase/supabase-js";
import { fetchInboxUpdatePage } from "../inboxUpdates";
import { fetchInboxUnreadCounts, inboxCountCap } from "../useInboxCounts";
import {
  inboxSearchFilter,
  normalizeInboxSearch,
  notificationCategory,
  workNotificationTypes,
  type InboxCategory,
} from "../inboxCategories";

const mockFetch =
  jest.fn<
    (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  >();
const mockClient = createClient("https://inbox-fixture.invalid", "fixture-key", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (...args) => mockFetch(...args) },
});
jest.mock("../../../../platform/supabase", () => ({
  get supabase() {
    return mockClient;
  },
}));

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation(
    async () => new Response("[]", { status: 200 }),
  );
});

test("every notification lands in exactly one category, with messages first", () => {
  const cases: [Parameters<typeof notificationCategory>[0], string | undefined][] = [
    [{ type: "assignment" }, "work"],
    [{ type: null }, "work"],
    [{ type: "comment" }, "messages"],
    [{ type: "assignment", conversationId: "c1" }, "messages"],
    [{ type: "petty_cash_decision" }, "finance"],
    [{ type: "status_change", financialRecordType: "settlement_staffing" }, "finance"],
    [{ type: "comment", financialRecordType: "settlement_staffing" }, "messages"],
    [{ type: "collaboration_request" }, "collaboration"],
    [{ type: "burnout_warning" }, undefined],
    [{ type: "something_new" }, undefined],
  ];
  for (const [item, expected] of cases)
    expect([item, notificationCategory(item)]).toEqual([item, expected]);
  for (const type of workNotificationTypes)
    expect(notificationCategory({ type })).toBe("work");
});

async function requestFor(category: InboxCategory, unread = false) {
  await fetchInboxUpdatePage("recipient", unread, undefined, undefined, {
    category,
  });
  return new URL(String(mockFetch.mock.calls.at(-1)![0])).searchParams;
}

test("the server query mirrors each category so paging stays exact", async () => {
  const all = await requestFor("all");
  expect(all.getAll("or")).toEqual([]);
  expect(all.get("conversation_id")).toBeNull();

  expect((await requestFor("messages")).getAll("or")).toEqual([
    "(conversation_id.not.is.null,type.eq.comment)",
  ]);

  const finance = await requestFor("finance");
  expect(finance.get("conversation_id")).toBe("is.null");
  expect(finance.getAll("or")).toEqual([
    "(type.like.petty_cash_*,and(financial_record_type.not.is.null,or(type.is.null,type.neq.comment)))",
  ]);

  const collaboration = await requestFor("collaboration");
  expect(collaboration.get("conversation_id")).toBe("is.null");
  expect(collaboration.get("financial_record_type")).toBe("is.null");
  expect(collaboration.get("type")).toBe("like.collaboration_%");

  const work = await requestFor("work", true);
  expect(work.get("read")).toBe("eq.false");
  expect(work.get("user_id")).toBe("eq.recipient");
  expect(work.get("conversation_id")).toBe("is.null");
  expect(work.get("financial_record_type")).toBe("is.null");
  expect(work.getAll("or")).toEqual([
    `(type.is.null,type.in.(${workNotificationTypes.join(",")}))`,
  ]);
});

test("a filtered next page keeps the category and adds the cursor as a separate AND condition", async () => {
  const createdAt = "2026-11-09T13:30:00.123456+00:00";
  const id = "11111111-0000-0000-0000-000000000001";
  await fetchInboxUpdatePage(
    "recipient",
    false,
    { createdAt, id },
    undefined,
    { category: "finance", search: "permit" },
  );
  const params = new URL(String(mockFetch.mock.calls.at(-1)![0])).searchParams;
  expect(params.getAll("or")).toEqual([
    "(type.like.petty_cash_*,and(financial_record_type.not.is.null,or(type.is.null,type.neq.comment)))",
    '(title.ilike."*permit*",message.ilike."*permit*",task_title.ilike."*permit*")',
    `(created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id}))`,
  ]);
  expect(params.get("limit")).toBe("21");
});

test("search text is normalised so it cannot break the server filter", () => {
  expect(normalizeInboxSearch("  Permit   (zoning), 50%_*  ")).toBe(
    "Permit zoning 50",
  );
  expect(normalizeInboxSearch('say "hi" \\ there:now')).toBe("say hi there now");
  expect(normalizeInboxSearch("x".repeat(200))).toHaveLength(80);
  expect(inboxSearchFilter("   ")).toBeUndefined();
  expect(inboxSearchFilter("Permit renewal")).toBe(
    'title.ilike."*Permit renewal*",message.ilike."*Permit renewal*",task_title.ilike."*Permit renewal*"',
  );
});

test("the Read view asks only for read updates, and Unread always wins", async () => {
  await fetchInboxUpdatePage("recipient", false, undefined, undefined, {
    readOnly: true,
  });
  let params = new URL(String(mockFetch.mock.calls.at(-1)![0])).searchParams;
  expect(params.get("read")).toBe("eq.true");
  await fetchInboxUpdatePage("recipient", true, undefined, undefined, {
    readOnly: true,
  });
  params = new URL(String(mockFetch.mock.calls.at(-1)![0])).searchParams;
  expect(params.getAll("read")).toEqual(["eq.false"]);
});

test("unread counts come from one small request that never downloads message text", async () => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify([
        { type: "assignment", conversation_id: null, financial_record_type: null },
        { type: "status_change", conversation_id: null, financial_record_type: null },
        { type: "comment", conversation_id: null, financial_record_type: null },
        { type: "petty_cash_decision", conversation_id: null, financial_record_type: null },
        { type: "collaboration_request", conversation_id: null, financial_record_type: null },
        { type: "burnout_warning", conversation_id: null, financial_record_type: null },
      ]),
      { status: 200 },
    ),
  );
  const counts = await fetchInboxUnreadCounts("recipient");
  expect(counts).toEqual({
    all: 6,
    work: 2,
    messages: 1,
    finance: 1,
    collaboration: 1,
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const params = new URL(String(mockFetch.mock.calls[0][0])).searchParams;
  expect(params.get("select")).toBe("type,conversation_id,financial_record_type");
  expect(params.get("user_id")).toBe("eq.recipient");
  expect(params.get("read")).toBe("eq.false");
  expect(params.get("limit")).toBe(String(inboxCountCap));
});
