import { expect, test } from "@jest/globals";
import type { Notification } from "../../../../core/web/app/services/notificationService";
import { inboxUpdateRoute } from "../inboxDestinations";

const update: Notification = {
  id: "notification",
  title: "Subtask progress updated",
  type: "status_change",
  message: "Progress changed",
  createdAt: 1,
  read: false,
  taskId: "root",
  projectId: "project",
};

test("an update retains exact project, task and node identity for every mobile role", () => {
  for (const role of ["head", "member", "accounting_staff"])
    expect(inboxUpdateRoute({ ...update, workNodeId: "node-8" }, role)).toEqual(
      {
        name: "task",
        id: "root",
        projectId: "project",
        nodeId: "node-8",
        view: "subitems",
      },
    );
  expect(inboxUpdateRoute(update, "admin")).toBeUndefined();
  expect(
    inboxUpdateRoute(
      { ...update, taskId: undefined, workNodeId: "orphan" },
      "member",
    ),
  ).toBeUndefined();
});

test("task decisions and financial records retain distinct destinations", () => {
  expect(
    inboxUpdateRoute(
      { ...update, title: "Task ready for review", type: "approval_needed" },
      "head",
    ),
  ).toMatchObject({
    name: "task",
    id: "root",
    projectId: "project",
    view: "review",
  });
  expect(
    inboxUpdateRoute(
      {
        ...update,
        financialRecordId: "review-id",
        financialRecordType: "independent_liquidation_review",
      },
      "accounting_staff",
    ),
  ).toEqual({ name: "financial_reviews", id: "review-id" });
});
