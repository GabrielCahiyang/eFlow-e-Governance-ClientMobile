import { test, expect } from "@jest/globals";
import { mergeMessages, isMessageDraft } from "../messageHistory";
const id = "0bd8a554-bfd8-4704-bbd7-1890d1804d96";
test("overlapping history and realtime updates retain one current message", () => {
  const row = {
      id,
      sender_id: "person",
      sender_name: "Person",
      content: "Before",
      created_at: "2026-10-28T00:00:00Z",
    },
    next = { ...row, content: "Updated" };
  expect(mergeMessages([row], [next])).toEqual([next]);
});
test("retained send drafts reject malformed identities and empty or oversized content", () => {
  expect(isMessageDraft({ id, text: "Hello" })).toBe(true);
  expect(isMessageDraft({ id: "not-an-id", text: "Hello" })).toBe(false);
  expect(isMessageDraft({ id, text: "  " })).toBe(false);
  expect(isMessageDraft({ id, text: "x".repeat(5001) })).toBe(false);
});
