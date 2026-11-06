import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { WorkspaceSheet } from "../WorkspaceSheet";
import type { Workspace } from "../../../../core/web/app/features/workspaces/types";
const mockExpand = jest.fn();
jest.mock("@expo/ui/community/bottom-sheet", () => ({
  __esModule: true,
  default: ({ index, children, ref, onClose }: any) => {
    require("react").useImperativeHandle(ref, () => ({
      expand: mockExpand,
      close: onClose,
    }));
    return index >= 0 ? children : null;
  },
}));

test("Favorites immediately lists searchable authorized workspaces and expands on search focus without losing the query", async () => {
  const select = jest.fn(),
    toggle = jest.fn(),
    close = jest.fn();
  const props = {
    open: true,
    mode: "favorites" as const,
    selectedId: "office",
    loading: false,
    onRetry: () => {},
    onClose: close,
    onSelect: select,
    onToggleFavorite: toggle,
    favorites: new Set(["office"]),
    workspaces: [
      {
        id: "office",
        name: "Planning Office",
        kind: "office",
        state: "active",
      },
      {
        id: "personal",
        name: "Personal planning",
        kind: "personal",
        state: "active",
      },
      {
        id: "ended",
        name: "Ended workspace",
        kind: "personal",
        state: "ended",
      },
    ] as Workspace[],
  };
  const view = await render(<WorkspaceSheet {...props} />);
  expect(view.getByText("Planning Office")).toBeOnTheScreen();
  expect(view.getByText("Personal planning")).toBeOnTheScreen();
  expect(view.queryByText("Ended workspace")).toBeNull();
  expect(view.queryByRole("button", { name: "Add workspaces" })).toBeNull();
  expect(view.queryByRole("button", { name: "Done" })).toBeNull();
  await fireEvent.press(
    view.getByRole("checkbox", { name: "Favorite workspace Planning Office" }),
  );
  expect(toggle).toHaveBeenCalledWith("office");
  await view.rerender(<WorkspaceSheet {...props} favorites={new Set()} />);
  expect(view.getByText("Planning Office")).toBeOnTheScreen();
  expect(select).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  await fireEvent.changeText(
    view.getByPlaceholderText("Search workspaces"),
    "personal",
  );
  await fireEvent(view.getByPlaceholderText("Search workspaces"), "focus");
  expect(mockExpand).toHaveBeenCalledTimes(1);
  expect(view.getByPlaceholderText("Search workspaces")).toHaveDisplayValue(
    "personal",
  );
  expect(view.queryByText("Planning Office")).toBeNull();
  expect(view.getByText("Personal planning")).toBeOnTheScreen();
  await fireEvent.press(view.getByRole("button", { name: "Close" }));
  expect(close).toHaveBeenCalled();
});

test("workspace chooser row selects context, while its star never selects or dismisses", async () => {
  const select = jest.fn(),
    toggle = jest.fn(),
    close = jest.fn();
  const view = await render(
    <WorkspaceSheet
      open
      mode="all"
      workspaces={
        [
          { id: "a", name: "Office A", state: "active", kind: "office" },
        ] as Workspace[]
      }
      favorites={new Set()}
      loading={false}
      onRetry={() => {}}
      onSelect={select}
      onToggleFavorite={toggle}
      onClose={close}
    />,
  );
  await fireEvent.press(
    view.getByRole("checkbox", { name: "Favorite workspace Office A" }),
  );
  expect(toggle).toHaveBeenCalledWith("a");
  expect(select).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole("radio", { name: "Office A" }));
  expect(select).toHaveBeenCalledWith("a");
});
