import { expect, jest, test } from "@jest/globals";
import { act, render, fireEvent, within } from "@testing-library/react-native";
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
    RefreshSectionList: (props: SectionListProps<WorkRow, WorkSection>) => {
      mockList(props);
      return <real.RefreshSectionList {...props} />;
    },
  };
});

let mockError: Error | undefined;
let mockLoading = false;
let mockRows: import("../displayWorkSnapshot").MobileWorkRow[] = [];
jest.mock("../../../components/ui/SelectionSheet", () => ({
  SelectionSheet: ({
    open,
    options,
    onSelect,
  }: React.ComponentProps<
    typeof import("../../../components/ui/SelectionSheet").SelectionSheet
  >) => {
    const { Pressable, Text } = require("react-native");
    return open
      ? options.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.title}
            onPress={() => onSelect(option.id)}
          >
            <Text>{option.title}</Text>
          </Pressable>
        ))
      : null;
  },
}));
const mockRefresh = jest.fn();
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({ selected: { workspace: { id: "office" } } }),
}));
jest.mock("../WorkFeedProvider", () => ({
  useMobileWorkFeed: () => ({
    data: { rows: mockRows, issues: [], unavailable: [], workspaces: [] },
    error: mockError,
    loading: mockLoading,
    refresh: mockRefresh,
  }),
}));

test("an empty assignment search can be reset without a refresh button", async () => {
  const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
  expect(view.getByText("Your work starts here")).toBeOnTheScreen();
  await fireEvent.changeText(
    view.getByPlaceholderText("Search assignments"),
    "qa-no-match",
  );
  expect(view.getByText("No matching assignments")).toBeOnTheScreen();
  await fireEvent.press(
    view.getByRole("button", { name: "Reset search and filters" }),
  );
  expect(view.getByPlaceholderText("Search assignments")).toHaveDisplayValue(
    "",
  );
  expect(view.getByText("Your work starts here")).toBeOnTheScreen();
  expect(
    view.queryByRole("button", { name: "Refresh assignments" }),
  ).toBeNull();
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
    await fireEvent.press(view.getByRole("button", { name: "Retry" }));
    expect(mockRefresh).toHaveBeenCalled();
  } finally {
    mockError = undefined;
  }
});

test("Today uses the due date and My Work keeps assignments in the selected workspace", async () => {
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
      start: "2026-10-05",
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
    {
      ...base,
      key: "other",
      id: "other",
      rootId: "other",
      workspaceId: "other-office",
      title: "Other workspace",
    },
  ];
  try {
    const view = await render(<PersonalWorkFeedScreen navigate={jest.fn()} />);
    expect(view.queryByText("Other workspace")).toBeNull();
    expect(view.getByText("All work")).toBeOnTheScreen();
    await fireEvent.press(
      view.getByRole("button", { name: "Filter assignments: All work" }),
    );
    expect(view.queryByText("All workspaces")).toBeNull();
    expect(view.queryByText("Other history")).toBeNull();
    await fireEvent.press(view.getByRole("radio", { name: "Today" }));
    const todayFilterButton = view.getByRole("button", {
      name: "Filter assignments: Today",
    });
    expect(todayFilterButton.props.accessibilityState.selected).toBe(true);
    expect(within(todayFilterButton).getByText("Today")).toBeOnTheScreen();
    expect(
      view.getByRole("button", {
        name: /Inspect today, Starts 5 Oct 2026, Due/,
      }),
    ).toBeOnTheScreen();
    expect(view.getByText(/^5 Oct(?: 2026)? to /)).toBeOnTheScreen();
    expect(view.queryByText("Inspect overdue")).toBeNull();
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
      view.getByRole("button", { name: "Filter assignments: All work" }),
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
      view.getByRole("button", { name: "Filter assignments: All work" }),
    ).toBeOnTheScreen();
    await fireEvent.changeText(search, "");
    expect(lengths()).toEqual([[40, 50]]);
  } finally {
    mockRows = [];
  }
});
