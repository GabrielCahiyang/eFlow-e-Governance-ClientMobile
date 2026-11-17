import { expect, jest, test } from "@jest/globals";
import * as ReactNative from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AppearanceProvider } from "../../../components/ui/Appearance";
import { TaskActivity } from "../TaskActivity";
import { ActivityTimeline } from "../ActivityEntry";

jest.mock("../../authentication", () => ({ useAuth: () => ({}) }));
jest.mock("../../../shared/useAction", () => ({
  useAction: () => ({ clear: jest.fn() }),
}));
jest.mock("../../../../platform/webRuntime", () => ({
  nativeWindow: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
}));
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
    fetchTaskActivityHistory: jest.fn(async () =>
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
  expect(view.getByText("4 updates")).toBeOnTheScreen();
});

test("TaskActivity renders conversation and work-note pill actions and opens the composer", async () => {
  const onOpenConversation = jest.fn();
  const view = await render(
    <TaskActivity
      taskId="qa-task-actions"
      canDiscuss
      onOpenConversation={onOpenConversation}
      verifyDiscussion={async () => {}}
    />,
  );
  const convoButton = await view.findByRole("button", {
    name: "Open task conversation",
  });
  await fireEvent.press(convoButton);
  expect(onOpenConversation).toHaveBeenCalledTimes(1);

  const noteButton = view.getByRole("button", { name: "Add work note" });
  await fireEvent.press(noteButton);
  expect(await view.findByText("Save work note")).toBeOnTheScreen();
  await fireEvent.press(view.getByRole("button", { name: "Close editor" }));
  expect(
    await view.findByRole("button", { name: "Add work note" }),
  ).toBeOnTheScreen();
});

test("ActivityTimeline groups entries by date, supports 200% font scale and dark mode, and handles unavailable timestamps", async () => {
  const spy = jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
    width: 360,
    height: 780,
    scale: 2,
    fontScale: 2,
  });
  await AsyncStorage.setItem("eflow.appearance", "dark");
  try {
    const day1 = Date.parse("2026-11-14T20:45:00Z"); // Nov 15, 2026 4:45 AM PH
    const day2 = Date.parse("2026-11-13T19:17:00Z"); // Nov 14, 2026 3:17 AM PH
    const view = await render(
      <AppearanceProvider>
        <ActivityTimeline
          entries={[
            {
              id: "1",
              title: "Subtask Completed",
              actor: "Crisostomo Ibarra",
              time: day1,
              body: <ReactNative.Text>Completed item</ReactNative.Text>,
            },
            {
              id: "2",
              title: "Subtask Progress",
              actor: "Cheryl Gallo",
              time: day2,
            },
            {
              id: "3",
              title: "Work update",
              actor: "System",
              time: 0,
            },
          ]}
        />
      </AppearanceProvider>,
    );
    await waitFor(() =>
      expect(view.getByText("Subtask Completed")).toBeOnTheScreen(),
    );
    expect(view.getAllByText("1 update")).toHaveLength(3);
    expect(view.getByText("Date unavailable")).toBeOnTheScreen();
    expect(view.getByText("Completed item")).toBeOnTheScreen();
  } finally {
    spy.mockRestore();
    await AsyncStorage.removeItem("eflow.appearance");
  }
});
