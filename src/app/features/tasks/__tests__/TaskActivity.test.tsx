import { expect, jest, test } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { TaskActivity } from "../TaskActivity";

jest.mock("../../authentication", () => ({ useAuth: () => ({}) }));
jest.mock("../../../shared/useAction", () => ({ useAction: () => ({}) }));
jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: () => ({ on: jest.fn(), subscribe: jest.fn() }),
}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: { removeChannel: jest.fn() },
}));
jest.mock("../EvidenceAttachment", () => ({ EvidenceAttachment: () => null }));
jest.mock("../taskEvidence", () => ({}));
jest.mock("../../../../core/web/app/services/taskDiscussionService", () => ({
  fetchCommentsStrict: async () => [],
  fetchProgressUpdatesStrict: async () => [],
}));
jest.mock(
  "../../../../core/web/app/features/tasks/services/taskActivityService",
  () => ({
    fetchTaskActivityHistory: async () =>
      ["subtask_progress", "subtask_completed", "for_review", "created"].map(
        (action, index) => ({
          id: String(index),
          kind: "activity",
          action,
          details: index === 0 ? "update 1" : "",
          timestamp: 1000 + index,
          userName: "QA Member",
        }),
      ),
  }),
);

test("Activity formats stored event codes and preserves the original notes", async () => {
  const view = await render(
    <TaskActivity
      taskId="qa-task"
      canDiscuss={false}
      verifyDiscussion={async () => {}}
    />,
  );
  expect(await view.findByText("Subtask Progress")).toBeOnTheScreen();
  expect(view.getByText("Subtask Completed")).toBeOnTheScreen();
  expect(view.getByText("For Review")).toBeOnTheScreen();
  expect(view.getByText("Created")).toBeOnTheScreen();
  expect(view.getByText("update 1")).toBeOnTheScreen();
  expect(view.queryByText("subtask progress")).toBeNull();
});
