import { expect, jest, test } from "@jest/globals";
import { parseMessage } from "../../../../core/web/app/features/chat-calls/services/chatMessageCodec";
import { mergeMessages, messagePreview } from "../messageHistory";
import { loadMessages, sendChat, type Message } from "../services";

type Stored = Message & { channel_id: string };
const mockRows: Stored[] = [];
const mockPageQuery = jest.fn();
const mockInsert = jest.fn(async (value: Stored) => {
  mockRows.push({ ...value, created_at: "2026-11-04T00:00:00Z" });
  return { error: new Error("Reply lost after write") };
});
let mockActor = "worker";
const mockMembers = new Set(["worker", "reviewer"]);
jest.mock("../../../../core/web/lib/supabaseService", () => ({
  fetchAllOrgs: jest.fn(),
  getAncestorOrgIds: jest.fn(),
}));
jest.mock("../../../../core/web/app/services/chatService", () => ({}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    from: () => {
      const filters = new Map<string, unknown>();
      let cursorFilter = "";
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters.set(key, value);
          return query;
        },
        order: () => query,
        or: (filter: string) => {
          cursorFilter = filter;
          return query;
        },
        insert: (value: Stored) => mockInsert(value),
        maybeSingle: async () => ({
          data: mockRows.find((item) => item.id === filters.get("id")) || null,
        }),
        limit: async (size: number) => {
          mockPageQuery(size, cursorFilter);
          const before = cursorFilter.match(/id\.lt\.([0-9a-f-]+)/)?.[1];
          return {
            data: mockMembers.has(mockActor)
              ? mockRows
                  .filter(
                    (item) =>
                      item.channel_id === filters.get("channel_id") &&
                      (!before || item.id < before),
                  )
                  .slice(0, size)
              : [],
          };
        },
      };
      return query;
    },
  },
}));

test("a lost send reply is checked by identity and the second fixture participant receives one message", async () => {
  await expect(
    sendChat("message", "qa-thread", "worker", "QA Worker", "Safe QA text"),
  ).rejects.toThrow("Reply lost");
  await sendChat("message", "qa-thread", "worker", "QA Worker", "Safe QA text");
  expect(mockInsert).toHaveBeenCalledTimes(1);
  mockActor = "reviewer";
  await expect(loadMessages("qa-thread")).resolves.toEqual({
    rows: [
      expect.objectContaining({
        id: "message",
        sender_id: "worker",
        content: "Safe QA text",
      }),
    ],
    hasOlder: false,
  });
  await expect(loadMessages("other-thread")).resolves.toEqual({
    rows: [],
    hasOlder: false,
  });
  mockActor = "unrelated";
  await expect(loadMessages("qa-thread")).resolves.toEqual({
    rows: [],
    hasOlder: false,
  });
});

test("chat fetches one visible page and uses the exact oldest timestamp and ID for its next page", async () => {
  mockActor = "worker";
  const timestamp = "2026-11-04T00:00:00.123456+00:00";
  const rows = Array.from({ length: 51 }, (_, i) => ({
    id: `10000000-0000-0000-0000-${String(51 - i).padStart(12, "0")}`,
    channel_id: "older-thread",
    created_at: timestamp,
    sender_id: "worker",
    sender_name: "QA Worker",
    content: "Safe QA text",
  }));
  mockRows.push(...rows);
  const first = await loadMessages("older-thread");
  expect(first.hasOlder).toBe(true);
  expect(first.rows).toHaveLength(50);
  expect(first.rows[0]).toEqual(rows[49]);
  await expect(loadMessages("older-thread", first.rows[0])).resolves.toEqual({
    rows: [rows[50]],
    hasOlder: false,
  });
  expect(mockPageQuery).toHaveBeenLastCalledWith(
    51,
    `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${rows[49].id})`,
  );
});

test("an image-only message uses the same private image and message identity on retry", async () => {
  const image = "qa-thread/worker/photo.png";
  const before = mockInsert.mock.calls.length;
  await expect(
    sendChat("image-message", "qa-thread", "worker", "QA Worker", "", image),
  ).rejects.toThrow("Reply lost");
  await sendChat(
    "image-message",
    "qa-thread",
    "worker",
    "QA Worker",
    "",
    image,
  );
  expect(mockInsert).toHaveBeenCalledTimes(before + 1);
  await expect(
    sendChat(
      "image-message",
      "qa-thread",
      "worker",
      "QA Worker",
      "",
      "qa-thread/worker/other.png",
    ),
  ).rejects.toThrow("original message receipt");
});

test("both fixture participants read the same typed mention after a lost reply and deletion hides the original", async () => {
  const body = "  @QA Reviewer please check.";
  const mention = [{ id: "reviewer", label: "@QA Reviewer", start: 2 }];
  const before = mockInsert.mock.calls.length;
  const send = () =>
    sendChat(
      "mention-message",
      "mention-thread",
      "worker",
      "QA Worker",
      body,
      undefined,
      mention,
    );
  await expect(send()).rejects.toThrow("Reply lost");
  await send();
  expect(mockInsert).toHaveBeenCalledTimes(before + 1);
  let original: Message | undefined;
  for (const actor of ["worker", "reviewer"]) {
    mockActor = actor;
    const { rows } = await loadMessages("mention-thread");
    expect(rows).toHaveLength(1);
    original = rows[0];
    expect(parseMessage(original.content)).toMatchObject({
      text: body.trim(),
      mentions: [{ ...mention[0], start: 0 }],
    });
  }
  const deleted = {
    ...original!,
    content: "Message deleted.",
    deleted_at: "2026-11-05T00:00:00Z",
  };
  expect(mergeMessages([deleted], [original!])).toEqual([deleted]);
  expect(messagePreview(deleted, "worker")).toBe("You deleted a message");
  expect(messagePreview(deleted, "reviewer")).toBe("This message was deleted");
});
