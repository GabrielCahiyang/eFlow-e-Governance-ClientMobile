import { expect, jest, test } from "@jest/globals";
import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppearanceProvider } from "../../../components/ui/Appearance";
import { colors, darkColors } from "../../../components/ui/theme";
import { WorkspaceNavigationContext } from "../../workspaces/WorkspaceNavigation";
import { OverviewScreen } from "../OverviewScreen";
let mockLoading = false;
let mockRole = "head";
let mockWorkRows: import("../../../../core/web/app/features/personal-work/types").WorkRow[] =
  [];
jest.mock("../../personal-work/WorkFeedProvider", () => ({
  useMobileWorkFeed: () => ({
    data: { rows: mockWorkRows },
    refresh: async () => {},
  }),
}));
jest.mock("../../projects/services", () => ({
  fetchProjectCompletion: async () => ({ completed: 2, required: 3 }),
}));
jest.mock("../../projects/subscriptions", () => ({
  netProjectUpdates: () => () => {},
}));
jest.mock(
  "../../../../core/web/app/features/workspaces/services/workspaceService",
  () => ({
    fetchPersonalProject: jest.fn(),
  }),
);
const mockRefresh = jest.fn<() => Promise<void>>();

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "qa-head", full_name: "QA Head", role: mockRole },
  }),
}));
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({
    loading: mockLoading,
    workspaces: [{ id: "qa-office", name: "QA Office", state: "active" }],
    refresh: mockRefresh,
    selected: {
      workspace: { id: "qa-office", name: "QA Office" },
      projects: [{ id: "qa-project", title: "QA Project", status: "active" }],
    },
  }),
}));

for (const [mode, palette] of [
  ["light", colors],
  ["dark", darkColors],
] as const) {
  test(`${mode} Home uses the same glass surface for Project progress and Workspaces`, async () => {
    await AsyncStorage.setItem("eflow.appearance", mode);
    const navigate = jest.fn();
    try {
      const view = await render(
        <AppearanceProvider>
          <OverviewScreen navigate={navigate} />
        </AppearanceProvider>,
      );
      await waitFor(() =>
        expect(view.getByTestId("home-attention-card")).toHaveStyle({
          backgroundColor: palette.glassSurface,
        }),
      );
      const workspaceCard = view.getByTestId("workspaces-card");
      expect(workspaceCard).toHaveStyle({
        backgroundColor: palette.glassSurface,
      });
      expect(view.queryAllByTestId("glass-card-sheen")).toHaveLength(
        mode === "light" ? 2 : 0,
      );
      expect(view.getByText("QA Project")).toBeOnTheScreen();
      expect(await view.findByText(/Active · 67%/i)).toBeOnTheScreen();
      expect(view.queryByText("Nothing needs your attention here")).toBeNull();
      expect(view.queryByRole("button", { name: "Browse My Work" })).toBeNull();
      expect(
        view.getByRole("button", { name: "Browse workspaces" }),
      ).toBeOnTheScreen();
      await fireEvent.press(view.getByRole("button", { name: "QA Project" }));
      expect(navigate).toHaveBeenLastCalledWith({
        name: "project",
        id: "qa-project",
      });
    } finally {
      await AsyncStorage.removeItem("eflow.appearance");
    }
  });
}

test("Home keeps background polls silent and uses only the folder for manual refresh", async () => {
  const view = await render(<OverviewScreen navigate={jest.fn()} />);
  expect(
    view.container.queryAll((node) => !!node.props.refreshControl),
  ).toHaveLength(0);
  const scroll = view.container.queryAll(
    (node) => !!node.props.onAccessibilityAction,
  )[0];
  expect(view.queryByLabelText("Refreshing")).toBeNull();
  try {
    mockLoading = true;
    await view.rerender(<OverviewScreen navigate={jest.fn()} />);
    expect(view.getByText("QA Project")).toBeOnTheScreen();
    expect(view.queryByLabelText("Refreshing")).toBeNull();
    mockLoading = false;
    await view.rerender(<OverviewScreen navigate={jest.fn()} />);
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
      view.getByRole("progressbar", { name: "Refreshing", busy: true }),
    ).toBeOnTheScreen();
    await act(async () => finish());
    expect(view.queryByLabelText("Refreshing")).toBeNull();
    mockLoading = true;
    await view.rerender(<OverviewScreen navigate={jest.fn()} />);
    expect(view.queryByLabelText("Refreshing")).toBeNull();
  } finally {
    mockLoading = false;
  }
});

test("Home favorites and workspace actions open their sheets instead of redirecting to Projects", async () => {
  const navigate = jest.fn(),
    openFavorites = jest.fn(),
    openWorkspace = jest.fn();
  const view = await render(
    <WorkspaceNavigationContext.Provider
      value={{
        openFavorites,
        openWorkspace,
        chooseWorkspace: async () => {},
        workspaceChooserOpen: false,
      }}
    >
      <OverviewScreen navigate={navigate} />
    </WorkspaceNavigationContext.Provider>,
  );
  await fireEvent.press(
    view.getByRole("button", { name: "Open favorite workspaces" }),
  );
  expect(openFavorites).toHaveBeenCalledTimes(1);
  await fireEvent.press(
    view.getByRole("button", { name: "Browse workspaces" }),
  );
  expect(openWorkspace).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
});

test("Member Home surfaces open assignments from the selected workspace", async () => {
  mockRole = "member";
  mockWorkRows = [
    {
      key: "assigned",
      id: "assigned",
      rootId: "assigned",
      title: "Priority assignment",
      kind: "office-task",
      projectId: "qa-project",
      projectTitle: "QA Project",
      workspaceId: "qa-office",
      workspaceName: "QA Office",
      timezone: "Asia/Manila",
      status: "todo",
      due: "2020-01-01",
      progress: 0,
      mine: true,
      leading: false,
      actionable: true,
      history: false,
      relation: "Contributor",
    },
  ];
  try {
    const navigate = jest.fn();
    const view = await render(<OverviewScreen navigate={navigate} />);
    expect(view.getByText("My work priorities")).toBeOnTheScreen();
    expect(view.getByText("Overdue · QA Project")).toBeOnTheScreen();
    expect(view.queryByText("Project progress")).toBeNull();
    await fireEvent.press(
      view.getByRole("button", { name: "Priority assignment" }),
    );
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "task",
        id: "assigned",
        projectId: "qa-project",
      }),
    );
  } finally {
    mockRole = "head";
    mockWorkRows = [];
  }
});
