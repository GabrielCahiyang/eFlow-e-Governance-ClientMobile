import { test, expect, jest } from "@jest/globals";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppearanceProvider, useAppearance, useTheme } from "../Appearance";
import { colors, darkColors } from "../theme";
import { Button } from "../Button";
import { Text } from "../Typography";
import { statusColors } from "../Status";
import { Choice } from "../Fields";
import { MotionProvider } from "../../../shared/motion";
jest.mock("lucide-react-native/icons/check", () => ({
  __esModule: true,
  default: ({ color }: { color: string }) => {
    const React = require("react"),
      { View } = require("react-native");
    return React.createElement(View, {
      testID: "selected-icon",
      style: { borderColor: color },
    });
  },
}));
jest.mock("lucide-react-native/icons/x", () => ({
  __esModule: true,
  default: ({ color }: { color: string }) => {
    const React = require("react"),
      { View } = require("react-native");
    return React.createElement(View, {
      testID: "close-icon",
      style: { borderColor: color },
    });
  },
}));

function contrast(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.match(/[a-f\d]{2}/gi)!.map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("brand and semantic text retain normal-text contrast in both themes", () => {
  for (const theme of [colors, darkColors]) {
    for (const background of [theme.background, theme.surface]) {
      for (const foreground of [
        theme.text,
        theme.muted,
        theme.mutedLabel,
        theme.primary,
        theme.blue,
      ]) {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const [foreground, background] of [
      [theme.onPrimary, theme.primary],
      [theme.onDanger, theme.danger],
      [theme.primaryDark, theme.primarySoft],
      [theme.blue, theme.blueSoft],
      [theme.success, theme.successSoft],
      [theme.warning, theme.warningSoft],
      [theme.danger, theme.dangerSoft],
      [theme.review, theme.reviewSoft],
      ...[theme.heroStart, theme.heroMiddle, theme.heroEnd].map((color) => [
        colors.onPrimary,
        color,
      ]),
    ]) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  }
});

function Controls() {
  const theme = useTheme(),
    appearance = useAppearance();
  return (
    <>
      <Text testID="theme" style={{ color: theme.text }}>
        {appearance.preference}
      </Text>
      <Button onPress={() => void appearance.setPreference("dark")}>
        Use dark
      </Button>
    </>
  );
}

test("the dark appearance chooser uses readable selected and close icons", async () => {
  await AsyncStorage.setItem("eflow.appearance", "dark");
  try {
    const result = await render(
      <AppearanceProvider>
        <MotionProvider reduceMotion>
          <Choice
            label="Color theme"
            value="dark"
            options={[{ value: "dark", label: "Dark" }]}
            onChange={() => {}}
          />
        </MotionProvider>
      </AppearanceProvider>,
    );
    await waitFor(() =>
      expect(result.getByText("Color theme")).toHaveStyle({
        color: darkColors.text,
      }),
    );
    await fireEvent.press(result.getByRole("button", { name: "Color theme" }));
    expect(result.getByTestId("selected-icon")).toHaveStyle({
      borderColor: darkColors.primary,
    });
    expect(result.getByTestId("close-icon")).toHaveStyle({
      borderColor: darkColors.text,
    });
  } finally {
    await AsyncStorage.removeItem("eflow.appearance");
  }
});

test("saved appearance hydrates and changing theme updates explicit control colors and storage", async () => {
  await AsyncStorage.setItem("eflow.appearance", "light");
  const result = await render(
    <AppearanceProvider>
      <Controls />
    </AppearanceProvider>,
  );
  await waitFor(() =>
    expect(result.getByTestId("theme")).toHaveTextContent("light"),
  );
  await fireEvent.press(result.getByRole("button", { name: "Use dark" }));
  await waitFor(() =>
    expect(result.getByTestId("theme")).toHaveTextContent("dark"),
  );
  expect(await AsyncStorage.getItem("eflow.appearance")).toBe("dark");
  expect(result.getByTestId("theme")).toHaveStyle({ color: darkColors.text });
  expect(result.getByText("Use dark")).toHaveStyle({
    color: darkColors.onPrimary,
  });
});

test("status words use exact meanings, so inactive and locked cannot become successful by substring", () => {
  for (const theme of [colors, darkColors]) {
    expect(statusColors("inactive", theme).foreground).toBe(theme.muted);
    expect(statusColors("locked", theme).foreground).toBe(theme.muted);
    expect(statusColors("completed", theme).foreground).toBe(theme.success);
    expect(statusColors("for_review", theme).foreground).toBe(theme.review);
    expect(statusColors("changes_requested", theme).foreground).toBe(
      theme.danger,
    );
  }
});

test("a busy button exposes its state, retains its label and refuses duplicate presses", async () => {
  const action = jest.fn(),
    result = await render(
      <Button busy onPress={action}>
        Save changes
      </Button>,
    );
  const button = result.getByRole("button", { name: "Save changes" });
  expect(button.props.accessibilityState).toEqual({
    disabled: true,
    busy: true,
  });
  await fireEvent.press(button);
  expect(action).not.toHaveBeenCalled();
});
