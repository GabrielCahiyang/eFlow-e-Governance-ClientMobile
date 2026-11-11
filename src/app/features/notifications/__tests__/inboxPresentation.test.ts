import { expect, test } from "@jest/globals";
import {
  inboxDestinationLabel,
  inboxUpdateMessage,
} from "../inboxPresentation";

test("Inbox renders recorded detail once and retains additional decision feedback", () => {
  const source =
    'Gabriel completed "Letters". Completed subitem.\nLetter delivered';
  expect(
    inboxUpdateMessage(source, "Completed subitem. Letter delivered"),
  ).toBe(source);
  expect(inboxUpdateMessage("Task approved.", "Thank you")).toBe(
    "Task approved.\nThank you",
  );
  expect(
    inboxDestinationLabel({ name: "task", id: "root", nodeId: "subtask" }),
  ).toBe("View subtask");
});
