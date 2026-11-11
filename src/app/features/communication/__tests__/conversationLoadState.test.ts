import { expect, test } from "@jest/globals";
import { conversationLoadState } from "../conversationLoadState";

test("empty requires a successful history read without an access or send error", () => {
  const input = { loaded: true, hasMessages: false, checking: false };
  expect(conversationLoadState(input)).toBe("empty");
  expect(
    conversationLoadState({ ...input, readError: new Error("offline") }),
  ).toBe("unavailable");
  expect(conversationLoadState({ ...input, checking: true })).toBe("loading");
  expect(conversationLoadState({ ...input, loaded: false })).toBe("loading");
  expect(
    conversationLoadState({ ...input, sendError: new Error("access check") }),
  ).toBe("thread");
});
