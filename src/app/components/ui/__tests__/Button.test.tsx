import { expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { View } from "react-native";
import { AppearanceProvider } from "../Appearance";
import { Button } from "../Button";
import { colors, darkColors, withOpacity } from "../theme";

test("Button uses pill geometry and circular icon badges across variants", async () => {
  const onPrimary = jest.fn();
  const onOutline = jest.fn();

  const view = await render(
    <View>
      <Button
        variant="primary"
        icon={<View testID="primary-icon" />}
        onPress={onPrimary}
      >
        Add item
      </Button>
      <Button
        variant="outline"
        icon={<View testID="outline-icon" />}
        trailing={<View testID="trailing-chevron" />}
        onPress={onOutline}
      >
        Open item
      </Button>
      <Button
        variant="danger"
        compact
        icon={<View testID="danger-icon" />}
        onPress={() => {}}
      >
        Remove
      </Button>
    </View>,
  );

  const primaryBtn = view.getByRole("button", { name: "Add item" });
  expect(primaryBtn).toHaveStyle({
    borderRadius: 18,
    minHeight: 48,
    backgroundColor: colors.primary,
  });

  const outlineBtn = view.getByRole("button", { name: "Open item" });
  expect(outlineBtn).toHaveStyle({
    borderRadius: 18,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  });
  expect(view.getByTestId("trailing-chevron")).toBeOnTheScreen();

  const primaryBadge = view.getByTestId("primary-icon", {
    includeHiddenElements: true,
  }).parent;
  expect(primaryBadge).toHaveStyle({
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: withOpacity(colors.onPrimary, 0.18),
  });

  const outlineBadge = view.getByTestId("outline-icon", {
    includeHiddenElements: true,
  }).parent;
  expect(outlineBadge).toHaveStyle({
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  });

  const dangerBtn = view.getByRole("button", { name: "Remove" });
  expect(dangerBtn).toHaveStyle({
    borderRadius: 18,
    minHeight: 38,
    backgroundColor: colors.danger,
  });
  expect(
    view.getByTestId("danger-icon", { includeHiddenElements: true }).parent,
  ).toHaveStyle({
    width: 22,
    height: 22,
    borderRadius: 11,
  });

  await fireEvent.press(primaryBtn);
  await fireEvent.press(outlineBtn);
  expect(onPrimary).toHaveBeenCalledTimes(1);
  expect(onOutline).toHaveBeenCalledTimes(1);
});

test("Button resolves dark-theme pill surfaces and custom iconBadgeColor", async () => {
  await AsyncStorage.setItem("eflow.appearance", "dark");
  try {
    const view = await render(
      <AppearanceProvider>
        <Button
          variant="outline"
          iconBadgeColor={darkColors.dangerSoft}
          icon={<View testID="dark-trash" />}
          onPress={() => {}}
        >
          Delete
        </Button>
      </AppearanceProvider>,
    );

    await waitFor(() =>
      expect(view.getByRole("button", { name: "Delete" })).toHaveStyle({
        backgroundColor: darkColors.surface,
        borderColor: darkColors.border,
        borderRadius: 18,
      }),
    );
    expect(
      view.getByTestId("dark-trash", { includeHiddenElements: true }).parent,
    ).toHaveStyle({
      backgroundColor: darkColors.dangerSoft,
    });
  } finally {
    await AsyncStorage.removeItem("eflow.appearance");
  }
});
