import { expect, jest, test } from "@jest/globals";
import { act, render, fireEvent } from "@testing-library/react-native";
import { PersonalWorkFeedScreen } from "../PersonalWorkFeedScreen";

let mockError: Error | undefined;
let mockLoading = false;
let mockRows: import("../../../../core/web/app/features/personal-work/types").WorkRow[] =
  [];
const mockRefresh = jest.fn();
jest.mock("../WorkFeedProvider", () => ({
  useMobileWorkFeed: () => ({
    data: { rows: mockRows, issues: [], unavailable: [], workspaces: [] },
    error: mockError,
    loading: mockLoading,
    refresh: mockRefresh,
  }),
}));

test("an empty assignment search offers a working clear action and then refreshes the actor's feed", async () => {
  const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
  expect(view.getByText("Your work starts here")).toBeOnTheScreen();
  await fireEvent.changeText(
    view.getByPlaceholderText("Search assignments"),
    "qa-no-match",
  );
  expect(view.getByText("No matching assignments")).toBeOnTheScreen();
  await fireEvent.press(view.getByRole("button", { name: "Clear filters" }));
  expect(view.getByPlaceholderText("Search assignments")).toHaveDisplayValue(
    "",
  );
  expect(view.getByText("Your work starts here")).toBeOnTheScreen();
  await fireEvent.press(
    view.getByRole("button", { name: "Refresh assignments" }),
  );
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

test("My Work refresh circle stays off for automatic reads and tracks only the pending pull", async () => {
  const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
  const control = () =>
    view.container.queryAll(
      (node) =>
        typeof node.props.refreshing === "boolean" &&
        typeof node.props.onRefresh === "function",
    )[0];
  try {
    mockLoading = true;
    await view.rerender(<PersonalWorkFeedScreen navigate={jest.fn()} />);
    expect(control().props.refreshing).toBe(false);
    let finish!: () => void;
    mockRefresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await act(async () => {
      void control().props.onRefresh();
    });
    expect(control().props.refreshing).toBe(true);
    await act(async () => finish());
    expect(control().props.refreshing).toBe(false);
  } finally {
    mockLoading = false;
  }
});

test("a failed source cannot masquerade as a successfully empty assignment feed", async () => {
  mockError = new Error("Work source unavailable");
  try {
    const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
    expect(
      view.getByText("Assignments could not be checked"),
    ).toBeOnTheScreen();
    expect(view.queryByText("Your work starts here")).toBeNull();
    expect(
      view.getByText("We couldn't load this information. Please try again."),
    ).toBeOnTheScreen();
    await fireEvent.press(
      view.getByRole("button", { name: "Refresh assignments" }),
    );
    expect(mockRefresh).toHaveBeenCalled();
  } finally {
    mockError = undefined;
  }
});

test("Today card filters visible assignments, exposes selected state, and toggles back without a floating plus", async () => {
  const base = {
    kind: "office-task" as const,
    workspaceId: "office",
    projectTitle: "QA work",
    workspaceName: "QA Office",
    timezone: "Asia/Singapore",
    status: "in_progress",
    progress: 0,
    mine: true,
    leading: false,
    actionable: true,
    history: false,
    relation: "Contributor",
  };
  mockRows = [
    {
      ...base,
      key: "today",
      id: "today",
      rootId: "today",
      title: "Inspect today",
      due: new Date().toISOString(),
    },
    {
      ...base,
      key: "past",
      id: "past",
      rootId: "past",
      title: "Inspect overdue",
      due: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
  try {
    const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
    expect(
      view.queryByRole("button", { name: "Filter work or options" }),
    ).toBeNull();
    const today = () => view.getByRole("button", { name: "Today, 1 items" });
    await fireEvent.press(today());
    expect(today().props.accessibilityState.selected).toBe(true);
    expect(view.getByText("Inspect today")).toBeOnTheScreen();
    expect(view.queryByText("Inspect overdue")).toBeNull();
    expect(
      view.getByRole("button", { name: "Date filter: Today" }),
    ).toBeOnTheScreen();
    await fireEvent.press(today());
    expect(view.getByText("Inspect overdue")).toBeOnTheScreen();
    expect(
      view.getByRole("button", { name: "Date filter: All dates" }),
    ).toBeOnTheScreen();
  } finally {
    mockRows = [];
  }
});
