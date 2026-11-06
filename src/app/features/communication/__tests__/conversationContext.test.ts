import { expect, test } from "@jest/globals";
import { filterConversationContext } from "../conversationContext";

test("project and task contexts never fall back to unrelated or direct channels", () => {
  const channels = [
    { id: "a", name: "A", kind: "task", taskId: "task-a" },
    { id: "b", name: "B", kind: "task", taskId: "task-b" },
    { id: "c", name: "C", kind: "direct" },
  ];
  expect(
    filterConversationContext(channels, undefined, new Set(["task-b"])),
  ).toEqual([channels[1]]);
  expect(filterConversationContext(channels, "task-a")).toEqual([channels[0]]);
  expect(filterConversationContext(channels, "inaccessible")).toEqual([]);
});
