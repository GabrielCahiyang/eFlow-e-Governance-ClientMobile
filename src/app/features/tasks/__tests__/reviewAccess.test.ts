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

test("the server-appointed Project Lead reviews normal work, and the assigned Head reviews the Project Lead's work", () => {
  const review = {
    id: "latest", taskId: "task", status: "pending", submitterId: "task-lead",
  } as ReviewSubmission;
  const assigned = {
    id: "task", reviewerId: "project-lead", status: "for_review",
    latestSubmission: { id: "latest" },
  } as Task;
  expect(independentReviewAllowed(assigned, review, "project-lead", "member")).toBe(true);
  expect(independentReviewAllowed(assigned, review, "head", "head")).toBe(false);
  const projectLeadReview = { ...review, submitterId: "project-lead" };
  const routed = { ...assigned, reviewerId: "head" };
  expect(independentReviewAllowed(routed, projectLeadReview, "head", "head")).toBe(true);
  expect(independentReviewAllowed(routed, projectLeadReview, "project-lead", "member")).toBe(false);
});
