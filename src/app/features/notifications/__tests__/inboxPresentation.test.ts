import { expect, test } from "@jest/globals";
import {
  inboxDestinationLabel,
  inboxUpdateMessage,
  workUpdateTitle,
} from "../inboxPresentation";

test("Inbox renders recorded detail once and retains additional decision feedback", () => {
  const source =
    'Gabriel completed "Letters". Completed subitem.\nLetter delivered';
  expect(
    inboxUpdateMessage(source, "Completed subitem. Letter delivered"),
  ).toBe('Gabriel completed "Letters". Completed subtask.\nLetter delivered');
  expect(workUpdateTitle("Subitem progress updated")).toBe("Subtask progress updated");
  expect(inboxUpdateMessage("I called this a subitem in my note.")).toBe(
    "I called this a subitem in my note.",
  );
  expect(inboxUpdateMessage("Task approved.", "Thank you")).toBe(
    "Task approved.\nThank you",
  );
  expect(
    inboxDestinationLabel({ name: "task", id: "root", nodeId: "subtask" }),
  ).toBe("View subtask");
});
