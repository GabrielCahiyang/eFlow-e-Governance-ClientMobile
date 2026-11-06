import { expect, jest, test } from "@jest/globals";
import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppearanceProvider } from "../../../components/ui/Appearance";
import { colors, darkColors } from "../../../components/ui/theme";
import { WorkspaceNavigationContext } from "../../workspaces/WorkspaceNavigation";
import { OverviewScreen } from "../OverviewScreen";
let mockLoading = false;
const mockRefresh = jest.fn<() => Promise<void>>();

jest.mock("../../authentication", () => ({
  useAuth: () => ({
    profile: { id: "qa-head", full_name: "QA Head", role: "head" },
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
  test(`${mode} Home keeps one uniform recent-project surface and Workspaces entry`, async () => {
    await AsyncStorage.setItem("eflow.appearance", mode);
    const navigate = jest.fn();
    try {
      const view = await render(
        <AppearanceProvider>
          <OverviewScreen navigate={navigate} />
        </AppearanceProvider>,
      );
      await waitFor(() =>
        expect(view.getByTestId("recent-projects-card")).toHaveStyle({
          backgroundColor: palette.glassSurface,
        }),
      );
      expect(view.queryAllByTestId("glass-card-sheen")).toHaveLength(
        mode === "light" ? 1 : 0,
      );
      expect(view.getByText("QA Project")).toBeOnTheScreen();
      expect(view.queryByText("Nothing needs your attention here")).toBeNull();
      expect(view.queryByRole("button", { name: "Browse My Work" })).toBeNull();
      expect(
        view.getByRole("button", { name: "Browse workspaces" }),
      ).toBeOnTheScreen();
      await fireEvent.press(
        view.getByRole("button", { name: "Project: QA Project" }),
      );
      expect(navigate).toHaveBeenLastCalledWith({
        name: "project",
        id: "qa-project",
      });
    } finally {
      await AsyncStorage.removeItem("eflow.appearance");
    }
  });
}

test("Home keeps a background poll silent and shows the native circle only for the user's pull", async () => {
  const view = await render(<OverviewScreen navigate={jest.fn()} />);
  const control = () =>
    view.container.queryAll((node) => !!node.props.refreshControl)[0].props
      .refreshControl;
  expect(control().props.refreshing).toBe(false);
  try {
    mockLoading = true;
    await view.rerender(<OverviewScreen navigate={jest.fn()} />);
    expect(view.getByText("QA Project")).toBeOnTheScreen();
    expect(control().props.refreshing).toBe(false);
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
      void control().props.onRefresh();
    });
    expect(control().props.refreshing).toBe(true);
    await act(async () => finish());
    expect(control().props.refreshing).toBe(false);
    mockLoading = true;
    await view.rerender(<OverviewScreen navigate={jest.fn()} />);
    expect(control().props.refreshing).toBe(false);
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
  await fireEvent.press(
    view.getByRole("button", { name: "Workspace: QA Office" }),
  );
  expect(openWorkspace).toHaveBeenCalledTimes(2);
  expect(navigate).not.toHaveBeenCalled();
});
