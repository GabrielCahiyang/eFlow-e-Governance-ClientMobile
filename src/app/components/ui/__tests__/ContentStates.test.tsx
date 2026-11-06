import { expect, jest, test } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { Empty } from "../Screen";
import { Button } from "../Button";
import {
  ViewLoadingState,
  type LoadingLayout,
} from "../loading/ViewLoadingState";
let mockReduced = false,
  mockActive = true;
jest.mock("../../../shared/motion", () => ({
  loadingMotion: { pulse: 1600, pulseMinimum: 0.45 },
  useMotionPreferences: () => ({ reduced: mockReduced, active: mockActive }),
}));

test("empty artwork stays out of accessibility navigation, its recovery action stays usable, and continuous motion stops for reduced motion/background", async () => {
  const repeat = jest.spyOn(Reanimated, "withRepeat"),
    cancel = jest.spyOn(Reanimated, "cancelAnimation"),
    refresh = jest.fn();
  const content = (
    <Empty
      kind="inbox"
      title="No updates"
      action={<Button onPress={refresh}>Refresh updates</Button>}
    />
  );
  try {
    const view = await render(content);
    expect(repeat).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId("empty-art-inbox")).toBeNull();
    expect(view.getAllByRole("button")).toHaveLength(1);
    await fireEvent.press(
      view.getByRole("button", { name: "Refresh updates" }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    mockReduced = true;
    repeat.mockClear();
    await view.rerender(
      <>
        {content}
        <></>
      </>,
    );
    expect(repeat).not.toHaveBeenCalled();
    mockReduced = false;
    mockActive = false;
    await view.rerender(content);
    expect(repeat).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  } finally {
    mockReduced = false;
    mockActive = true;
    repeat.mockRestore();
    cancel.mockRestore();
  }
});

test("all retained loading layouts expose one busy region without placeholder actions or announced content", async () => {
  const layouts: LoadingLayout[] = [
    "navigation",
    "recent",
    "workList",
    "projects",
    "work",
    "inbox",
    "project",
    "personalProject",
    "task",
    "tree",
    "summary",
    "request",
    "review",
    "activity",
    "messages",
    "announcements",
    "people",
    "files",
    "form",
    "verification",
  ];
  for (const layout of layouts) {
    const view = await render(
      <ViewLoadingState layout={layout} label="Loading authorized records" />,
    );
    expect(
      view.getByRole("progressbar", { name: "Loading authorized records" })
        .props.accessibilityState,
    ).toEqual({ busy: true });
    expect(view.queryAllByRole("button")).toHaveLength(0);
    await view.unmount();
  }
});
