import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ProjectsScreen } from "../ProjectsScreen";
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "filter-qa" } }),
}));
jest.mock("../../workspaces", () => ({
  useWorkspace: () => ({
    refresh: async () => {},
    loading: false,
    selected: {
      workspace: { id: "office" },
      projects: [
        {
          id: "active",
          title: "Current inspection",
          status: "active",
          kind: "office",
        },
        {
          id: "archived",
          title: "Archived inspection",
          status: "archived",
          kind: "office",
        },
      ],
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
