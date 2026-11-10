import { expect, jest, test } from "@jest/globals";
import { act, render, fireEvent } from "@testing-library/react-native";
import { PersonalWorkFeedScreen } from "../PersonalWorkFeedScreen";
import type { SectionListProps } from "react-native";
import type { WorkRow } from "../../../../core/web/app/features/personal-work/types";

type WorkSection = { total: number; data: readonly WorkRow[] };
const mockList =
  jest.fn<(props: SectionListProps<WorkRow, WorkSection>) => void>();
jest.mock("../../../components/ui/FolderRefresh", () => {
  const real = jest.requireActual<
    typeof import("../../../components/ui/FolderRefresh")
  >("../../../components/ui/FolderRefresh");
  return {
    ...real,
    RefreshSectionList: (
      props: SectionListProps<WorkRow, WorkSection>,
    ) => {
      mockList(props);
      return <real.RefreshSectionList {...props} />;
    },
  };
});

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

test("My Work keeps automatic reads quiet and shows the folder for a manual refresh", async () => {
  const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
  const scroll = view.container.queryAll(
    (node) => !!node.props.onAccessibilityAction,
  )[0];
  try {
    mockLoading = true;
    await view.rerender(<PersonalWorkFeedScreen navigate={jest.fn()} />);
    expect(view.queryByLabelText("Refreshing")).toBeNull();
    let finish!: () => void;
    mockRefresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await act(async () => {
      scroll.props.onAccessibilityAction({
        nativeEvent: { actionName: "refresh" },
      });
    });
    expect(
      view.getByRole("progressbar", { name: "Refreshing" }),
    ).toBeOnTheScreen();
    await act(async () => finish());
    expect(view.queryByLabelText("Refreshing")).toBeNull();
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

test("My Work expands in order while totals and search include rows beyond the first window", async () => {
  const now = Date.now();
  mockRows = Array.from({ length: 83 }, (_, index): WorkRow => {
    const id = String(index + 1).padStart(2, "0");
    return {
      key: id,
      id,
      rootId: id,
      kind: "office-task",
      workspaceId: "office",
      title: `Assignment ${id}`,
      workspaceName: "QA Office",
      projectTitle: "QA project",
      timezone: "Asia/Singapore",
      status: "in_progress",
      progress: 0,
      mine: true,
      leading: false,
      actionable: true,
      history: false,
      relation: "Contributor",
      due: new Date(now + (index < 50 ? 0 : 86400000)).toISOString(),
    };
  });
  const props = () => mockList.mock.lastCall![0];
  const lengths = () =>
    props().sections.map((section) => [section.data.length, section.total]);
  try {
    const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
    expect(lengths()).toEqual([[40, 50]]);
    expect(
      view.getByRole("button", { name: "Today, 50 items" }),
    ).toBeOnTheScreen();
    const end = props().onEndReached!;
    await act(async () => {
      end({ distanceFromEnd: 0 });
      end({ distanceFromEnd: 0 });
    });
    expect(lengths()).toEqual([
      [50, 50],
      [30, 33],
    ]);
    await act(async () => props().onEndReached!({ distanceFromEnd: 0 }));
    expect(lengths()).toEqual([
      [50, 50],
      [33, 33],
    ]);
    expect(props().onEndReached).toBeUndefined();

    const search = view.getByPlaceholderText("Search assignments");
    await fireEvent.changeText(search, "Assignment 83");
    expect(lengths()).toEqual([[1, 1]]);
    expect(view.getByText("Assignment 83")).toBeOnTheScreen();
    expect(
      view.getByRole("button", { name: "Today, 50 items" }),
    ).toBeOnTheScreen();
    await fireEvent.changeText(search, "");
    expect(lengths()).toEqual([[40, 50]]);
  } finally {
    mockRows = [];
  }
});
