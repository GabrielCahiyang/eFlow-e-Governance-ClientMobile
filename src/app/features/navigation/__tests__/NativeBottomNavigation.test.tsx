import { test, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { NativeBottomNavigation } from "../NativeBottomNavigation";

test.each([
  ["head", ["Home", "My Work", "Projects", "Inbox", "More"]],
  ["member", ["Home", "My Work", "Projects", "Inbox", "More"]],
  ["accounting_staff", ["Home", "My Work", "Accounting", "Inbox", "More"]],
])(
  "%s has exactly the approved five destinations, with a real selected More tab",
  async (role, labels) => {
    const onSelect = jest.fn();
    const screen = await render(
      <NativeBottomNavigation
        role={role as string}
        selected="more"
        onSelect={onSelect}
      />,
    );
    expect(
      screen.getAllByRole("tab").map((tab) => tab.props.accessibilityLabel),
    ).toEqual(labels);
    expect(
      screen.getByRole("tab", { name: "More" }).props.accessibilityState
        .selected,
    ).toBe(true);
    const accounting = role === "accounting_staff";
    await fireEvent.press(
      screen.getByRole("tab", { name: accounting ? "Accounting" : "Projects" }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      accounting ? "accounting" : "projects",
    );
  },
);

test("Admin has no operational mobile navigation even with an apparent selected destination", async () => {
  const screen = await render(
    <NativeBottomNavigation
      role="admin"
      selected="projects"
      onSelect={jest.fn()}
    />,
  );
  expect(screen.queryAllByRole("tab")).toHaveLength(0);
});

test("first layout and later renders position the disc on the selected non-Home tab", async () => {
  const onSelect = jest.fn();
  const screen = await render(
    <NativeBottomNavigation role="head" selected="inbox" onSelect={onSelect} />,
  );
  await fireEvent(screen.getByTestId("tab-track"), "layout", {
    nativeEvent: { layout: { width: 350 } },
  });
  expect(screen.getByTestId("tab-selection-indicator")).toHaveStyle({
    transform: [{ translateX: 219 }],
  });
  await screen.rerender(
    <NativeBottomNavigation
      role="head"
      selected="inbox"
      onSelect={jest.fn()}
    />,
  );
  expect(screen.getByTestId("tab-selection-indicator")).toHaveStyle({
    transform: [{ translateX: 219 }],
  });
});

test("one selection disc follows the selected tab and resizes with the bar", async () => {
  const onSelect = jest.fn();
  const screen = await render(
    <NativeBottomNavigation role="head" selected="home" onSelect={onSelect} />,
  );
  const tab = screen.getByRole("tab", { name: "Projects" });
  expect(StyleSheet.flatten(tab.props.style).backgroundColor).toBeUndefined();
  const resize = async (width: number) =>
    fireEvent(screen.getByTestId("tab-track"), "layout", {
      nativeEvent: { layout: { width } },
    });
  const indicator = () => screen.getByTestId("tab-selection-indicator");
  await resize(350);
  expect(indicator()).toHaveStyle({
    borderRadius: 26,
    transform: [{ translateX: 9 }],
  });

  await fireEvent(tab, "hoverIn");
  expect(screen.getByTestId("tab-preview-projects")).toHaveStyle({
    opacity: 0.55,
  });
  expect(indicator()).toHaveStyle({ transform: [{ translateX: 9 }] });
  expect(screen.getByTestId("tab-selected-icon-home")).toHaveStyle({
    opacity: 1,
  });
  expect(screen.getByTestId("tab-selected-icon-projects")).toHaveStyle({
    opacity: 0,
  });

  await screen.rerender(
    <NativeBottomNavigation
      role="head"
      selected="projects"
      onSelect={onSelect}
    />,
  );
  expect(screen.getAllByTestId("tab-selection-indicator")).toHaveLength(1);
  expect(
    screen.getByRole("tab", { name: "Projects" }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(screen.getByTestId("tab-preview-projects")).toHaveStyle({
    opacity: 0,
  });

  // Resize re-renders the styles after the shared selection effect in Jest.
  await resize(260);
  expect(screen.getByTestId("tab-selected-icon-home")).toHaveStyle({
    opacity: 0,
  });
  expect(screen.getByTestId("tab-selected-icon-projects")).toHaveStyle({
    opacity: 1,
  });
  expect(indicator()).toHaveStyle({
    borderRadius: 24,
    transform: [{ translateX: 106 }],
  });
});

test("the Inbox shows an accessible indicator only while there are unread updates", async () => {
  const view = await render(
    <NativeBottomNavigation role="member" selected="work" onSelect={jest.fn()} inboxUnread />,
  );
  expect(view.getByTestId("inbox-unread-indicator")).toBeOnTheScreen();
  expect(view.getByRole("tab", { name: "Inbox" }).props.accessibilityHint).toBe("Unread updates");
  await view.rerender(<NativeBottomNavigation role="member" selected="work" onSelect={jest.fn()} />);
  expect(view.queryByTestId("inbox-unread-indicator")).toBeNull();
});
