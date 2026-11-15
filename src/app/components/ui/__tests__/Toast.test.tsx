import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Appearance, Pressable, Text } from "react-native";
import { AppearanceProvider } from "../Appearance";
import { colors, darkColors } from "../theme";
import {
  ToastProvider,
  useToast,
  type ToastInput,
  type ToastOptions,
  type ToastType,
} from "../Toast";

function findAlertNode(node: unknown): { props?: Record<string, unknown> } | undefined {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const match = findAlertNode(item);
      if (match) return match;
    }
    return undefined;
  }
  const entry = node as { props?: Record<string, unknown>; children?: unknown[] };
  if (entry.props?.accessibilityRole === "alert") return entry;
  return entry.children ? findAlertNode(entry.children) : undefined;
}

function ToastHarness({
  payload,
  type,
  options,
}: {
  payload: ToastInput;
  type?: ToastType;
  options?: ToastOptions;
}) {
  const { toast } = useToast();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => toast(payload, type, options)}
    >
      <Text>Trigger toast</Text>
    </Pressable>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("renders accessible light/dark variants, eyebrow/title/message notifications, and manual dismiss", async () => {
  const schemeSpy = jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");

  const view = await render(
    <AppearanceProvider>
      <ToastProvider>
        <ToastHarness
          payload={{
            eyebrow: "Inbox",
            title: "New assignment in Inbox",
            message: "Open Inbox to review your updated work assignment.",
            type: "info",
            icon: "bell",
          }}
        />
      </ToastProvider>
    </AppearanceProvider>,
  );

  await fireEvent.press(screen.getByRole("button", { name: "Trigger toast" }));

  const alert = findAlertNode(view.toJSON());
  expect(alert?.props?.accessibilityLiveRegion).toBe("polite");
  expect(screen.getByText("Inbox")).toBeOnTheScreen();
  expect(screen.getByText("New assignment in Inbox")).toBeOnTheScreen();
  expect(
    screen.getByText("Open Inbox to review your updated work assignment."),
  ).toBeOnTheScreen();
  expect(JSON.stringify(view.toJSON())).toContain(colors.surface);

  await fireEvent.press(screen.getByRole("button", { name: "Dismiss notification" }));
  expect(screen.queryByText("New assignment in Inbox")).toBeNull();

  await view.unmount();

  schemeSpy.mockReturnValue("dark");
  const darkView = await render(
    <AppearanceProvider>
      <ToastProvider>
        <ToastHarness payload="Something failed" type="error" />
      </ToastProvider>
    </AppearanceProvider>,
  );

  await fireEvent.press(screen.getByRole("button", { name: "Trigger toast" }));
  const errorAlert = findAlertNode(darkView.toJSON());
  expect(errorAlert?.props?.accessibilityLiveRegion).toBe("assertive");
  expect(screen.getByText("Something failed")).toBeOnTheScreen();
  expect(JSON.stringify(darkView.toJSON())).toContain(darkColors.surface);
});

test("auto-dismisses after variant timeouts, caps stacked toasts at 3, and clears timers on unmount", async () => {
  const clearSpy = jest.spyOn(globalThis, "clearTimeout");

  function StackHarness() {
    const { toast } = useToast();
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          toast("First saved", "success");
          toast("Second warning", "warning");
          toast("Third saved", "success");
          toast("Fourth saved", "success");
        }}
      >
        <Text>Burst</Text>
      </Pressable>
    );
  }

  const view = await render(
    <ToastProvider>
      <StackHarness />
    </ToastProvider>,
  );

  await fireEvent.press(screen.getByRole("button", { name: "Burst" }));
  expect(screen.queryByText("First saved")).toBeNull();
  expect(screen.getByText("Second warning")).toBeOnTheScreen();
  expect(screen.getByText("Third saved")).toBeOnTheScreen();
  expect(screen.getByText("Fourth saved")).toBeOnTheScreen();

  await act(async () => {
    await jest.advanceTimersByTimeAsync(3500);
  });
  expect(screen.queryByText("Third saved")).toBeNull();
  expect(screen.queryByText("Fourth saved")).toBeNull();
  expect(screen.getByText("Second warning")).toBeOnTheScreen();

  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
  expect(screen.queryByText("Second warning")).toBeNull();

  clearSpy.mockClear();
  await fireEvent.press(screen.getByRole("button", { name: "Burst" }));
  await view.unmount();
  expect(clearSpy).toHaveBeenCalled();
});
