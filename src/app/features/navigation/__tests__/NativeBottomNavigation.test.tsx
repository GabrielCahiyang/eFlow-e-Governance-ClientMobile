import { test, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { NativeBottomNavigation } from "../NativeBottomNavigation";
test("personal project detail remains in Workspaces and tab selection uses the intended destination", async () => {
  const navigate = jest.fn(),
    screen = await render(
      <NativeBottomNavigation
        role="head"
        can={() => true}
        current="personal_project"
        navigate={navigate}
        onMore={jest.fn()}
      />,
    );
  expect(
    screen.getByRole("tab", { name: "Workspaces" }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(
    screen.getByRole("tab", { name: "My Work" }).props.accessibilityState
      .selected,
  ).toBe(false);
  await fireEvent.press(screen.getByRole("tab", { name: "Workspaces" }));
  expect(navigate).toHaveBeenCalledWith({ name: "projects" });
});
test("Admin has no mobile bottom navigation or Admin Center entry", async () => {
  const screen = await render(
    <NativeBottomNavigation
      role="admin"
      can={() => true}
      current="users"
      navigate={jest.fn()}
      onMore={jest.fn()}
    />,
  );
  expect(screen.queryAllByRole("tab")).toHaveLength(0);
  expect(screen.queryByText("Admin Center")).toBeNull();
});
