import { expect, jest, test } from "@jest/globals";
import { loadMessages, sendChat, type Message } from "../services";

type Stored = Message & { channel_id: string };
const mockRows: Stored[] = [];
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
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters.set(key, value);
          return query;
        },
        order: () => query,
        insert: (value: Stored) => mockInsert(value),
        maybeSingle: async () => ({
          data: mockRows.find((item) => item.id === filters.get("id")) || null,
        }),
        limit: async () => ({
          data: mockMembers.has(mockActor)
            ? mockRows.filter(
                (item) => item.channel_id === filters.get("channel_id"),
              )
            : [],
        }),
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
  await expect(loadMessages("qa-thread")).resolves.toEqual([
    expect.objectContaining({
      id: "message",
      sender_id: "worker",
      content: "Safe QA text",
    }),
  ]);
  await expect(loadMessages("other-thread")).resolves.toEqual([]);
  mockActor = "unrelated";
  await expect(loadMessages("qa-thread")).resolves.toEqual([]);
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
