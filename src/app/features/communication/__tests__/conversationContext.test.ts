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

test("the whole-project chat is distinct from the project's task chats", () => {
  const project = {
    id: "p",
    name: "Project",
    kind: "project",
    projectId: "project-a",
  };
  const task = {
    id: "t",
    name: "Task",
    kind: "task",
    projectId: "project-a",
    taskId: "task-a",
  };
  const unrelated = {
    id: "o",
    name: "Other project",
    kind: "project",
    projectId: "project-b",
  };
  expect(
    filterConversationContext(
      [project, task, unrelated],
      undefined,
      undefined,
      "project-a",
    ),
  ).toEqual([project, task]);
  expect(
    filterConversationContext([project, task, unrelated], "task-a"),
  ).toEqual([task]);
});
