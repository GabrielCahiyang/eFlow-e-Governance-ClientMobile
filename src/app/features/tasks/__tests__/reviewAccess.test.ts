import { expect, test } from "@jest/globals";
import { independentReviewAllowed } from "../reviewAccess";
import type { Task } from "../../../../core/web/app/features/tasks/taskTypes";
import type { ReviewSubmission } from "../../../../core/web/app/features/reviews/types";

test("review requires the exact pending submission and excludes the worker even with a Head route", () => {
  const task = {
    id: "task",
    reviewerId: "head",
    reviewRouteMode: "organization_default",
    status: "for_review",
    latestSubmission: { id: "latest" },
  } as Task;
  const submission = {
    id: "latest",
    taskId: "task",
    status: "pending",
    submitterId: "worker",
  } as ReviewSubmission;
  expect(independentReviewAllowed(task, submission, "head", "head")).toBe(true);
  expect(
    independentReviewAllowed(
      task,
      { ...submission, submitterId: "head" },
      "head",
      "head",
    ),
  ).toBe(false);
  expect(
    independentReviewAllowed(
      task,
      { ...submission, id: "old" },
      "head",
      "head",
    ),
  ).toBe(false);
  expect(
    independentReviewAllowed(
      task,
      { ...submission, taskId: "other" },
      "head",
      "head",
    ),
  ).toBe(false);
  expect(
    independentReviewAllowed(
      task,
      { ...submission, status: "approved" },
      "head",
      "head",
    ),
  ).toBe(false);
  expect(independentReviewAllowed(task, submission, "outsider", "member")).toBe(
    false,
  );
});
