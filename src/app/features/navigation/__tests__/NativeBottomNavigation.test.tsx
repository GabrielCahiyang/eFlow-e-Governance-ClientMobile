import { test, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { NativeBottomNavigation } from "../NativeBottomNavigation";

test.each([
  ["head", ["Home", "My Work", "Projects", "Inbox", "More"]],
  ["member", ["Home", "My Work", "Projects", "Inbox", "More"]],
  ["accounting_staff", ["My Work", "Accounting", "Projects", "Inbox", "More"]],
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
    await fireEvent.press(screen.getByRole("tab", { name: "Projects" }));
    expect(onSelect).toHaveBeenCalledWith("projects");
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

test("pointer hover and selection use the same rounded highlight without filling the tap area", async () => {
  const onSelect = jest.fn();
  const screen = await render(
    <NativeBottomNavigation role="head" selected="home" onSelect={onSelect} />,
  );
  const tab = screen.getByRole("tab", { name: "Projects" });
  expect(StyleSheet.flatten(tab.props.style).backgroundColor).toBeUndefined();
  expect(screen.getByTestId("tab-highlight-projects")).toHaveStyle({
    borderRadius: 15,
    opacity: 0,
  });

  await fireEvent(tab, "hoverIn");
  expect(screen.getByTestId("tab-highlight-projects")).toHaveStyle({
    borderRadius: 15,
    opacity: 0.55,
  });
  await screen.rerender(
    <NativeBottomNavigation
      role="head"
      selected="projects"
      onSelect={onSelect}
    />,
  );
  await fireEvent(screen.getByRole("tab", { name: "Projects" }), "hoverOut");
  expect(screen.getByTestId("tab-highlight-projects")).toHaveStyle({
    borderRadius: 15,
    opacity: 1,
  });
  expect(screen.getByTestId("tab-highlight-home")).toHaveStyle({ opacity: 0 });
});
