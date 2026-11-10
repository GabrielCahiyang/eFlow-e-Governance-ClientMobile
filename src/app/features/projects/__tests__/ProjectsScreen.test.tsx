import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { ProjectsScreen } from "../ProjectsScreen";
import type { SectionListProps } from "react-native";
import type { WorkspaceProject } from "../../../../core/web/app/features/workspaces/types";

const mockSections =
  jest.fn<
    (
      props: SectionListProps<
        WorkspaceProject,
        { data: readonly WorkspaceProject[] }
      >,
    ) => void
  >();
jest.mock("../../../components/ui/FolderRefresh", () => {
  const real = jest.requireActual<
    typeof import("../../../components/ui/FolderRefresh")
  >("../../../components/ui/FolderRefresh");
  return {
    ...real,
    RefreshSectionList: (
      props: SectionListProps<
        WorkspaceProject,
        { data: readonly WorkspaceProject[] }
      >,
    ) => {
      mockSections(props);
      return <real.RefreshSectionList {...props} />;
    },
  };
});
const mockDefaultProjects = [
  {
    id: "active",
    title: "Current inspection",
    status: "active",
    kind: "office",
    home_workspace_id: "office",
  },
  {
    id: "archived",
    title: "Archived inspection",
    status: "archived",
    kind: "office",
    home_workspace_id: "office",
  },
] satisfies WorkspaceProject[];
let mockProjects: WorkspaceProject[] = mockDefaultProjects;
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "filter-qa" } }),
}));
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({
    refresh: async () => {},
    loading: false,
    selected: {
      workspace: { id: "office" },
      projects: mockProjects,
    },
  }),
}));
jest.mock("../../../components/ui/SelectionSheet", () => ({
  SelectionSheet: ({ open, options, onSelect }: any) =>
    open
      ? options.map((item: any) =>
          require("react").createElement(require("react-native").Button, {
            key: item.id,
            title: item.title,
            onPress: () => onSelect(item.id),
          }),
        )
      : null,
}));
test("compact project filter exposes the current status, changes visible rows and clears back to the default", async () => {
  const view = await render(<ProjectsScreen navigate={jest.fn()} />);
  expect(
    view.getByRole("button", { name: "Project status: Current projects" }),
  ).toBeOnTheScreen();
  expect(view.getByText("Current inspection")).toBeOnTheScreen();
  expect(view.queryByText("Archived inspection")).toBeNull();
  await fireEvent.press(view.getByRole("button", { name: "Filter projects" }));
  await fireEvent.press(view.getByRole("button", { name: "Archived" }));
  expect(
    view.getByRole("button", { name: "Project status: Archived" }),
  ).toBeOnTheScreen();
  expect(view.getByText("Archived inspection")).toBeOnTheScreen();
  expect(view.queryByText("Current inspection")).toBeNull();
  await fireEvent.press(view.getByRole("button", { name: "Clear filters" }));
  expect(view.getByText("Current inspection")).toBeOnTheScreen();
});

test("directory pages projects after filtering, keeps the full count and opens a later Personal shortcut", async () => {
  mockProjects = Array.from({ length: 45 }, (_, i) => ({
    id: String(i + 1),
    title: `Directory project ${i + 1}`,
    status: "active",
    kind: i === 44 ? "personal" : "office",
    home_workspace_id: i === 44 ? "personal-workspace" : "office",
    shortcut: i === 44,
  }));
  const navigate = jest.fn();
  const list = () => mockSections.mock.lastCall![0];
  const ids = () =>
    list().sections.flatMap((section) =>
      section.data.map((project) => project.id),
    );
  try {
    const view = await render(<ProjectsScreen navigate={navigate} />);
    expect(ids()).toHaveLength(40);
    expect(view.getByText("45 projects")).toBeOnTheScreen();
    const end = list().onEndReached!;
    await act(async () => {
      end({ distanceFromEnd: 0 });
      end({ distanceFromEnd: 0 });
    });
    expect(ids()).toEqual(mockProjects.map((project) => project.id));
    expect(list().onEndReached).toBeUndefined();
    await fireEvent.changeText(
      view.getByPlaceholderText("Search projects"),
      "Directory project 45",
    );
    expect(ids()).toEqual(["45"]);
    expect(view.getByText("1 project")).toBeOnTheScreen();
    await fireEvent.press(view.getByText("Directory project 45"));
    expect(navigate).toHaveBeenCalledWith({
      name: "personal_project",
      id: "45",
      title: "Directory project 45",
    });
  } finally {
    mockProjects = mockDefaultProjects;
  }
});
