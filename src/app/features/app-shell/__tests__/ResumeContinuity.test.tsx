import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppRoot } from "../AppRoot";
let mockChecking = false,
  mockAccessError: Error | undefined;
jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));
jest.mock("../../../../platform/webRuntime", () => ({
  hydrateWebPreferences: async () => {},
}));
jest.mock("../../projects", () => ({ ShareLanding: () => null }));
jest.mock("../LoadingScreen", () => ({
  LoadingScreen: () =>
    require("react").createElement(
      require("react-native").Text,
      null,
      "Branded startup",
    ),
}));
jest.mock("../NativeWorkspace", () => ({
  NativeWorkspace: () => {
    const [record, setRecord] = require("react").useState("Home");
    return require("react").createElement(
      require("react-native").Pressable,
      { onPress: () => setRecord("Open task and draft") },
      require("react").createElement(
        require("react-native").Text,
        null,
        record,
      ),
    );
  },
}));
jest.mock("../../authentication", () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
  useNativeEntryLink: () => ({ entry: null, close() {} }),
  useAuth: () => ({
    loading: false,
    checkingAccess: mockChecking,
    accessError: mockAccessError,
    user: { id: "member-a" },
    profile: { id: "member-a" },
    refresh: async () => {},
    signOut: async () => {},
  }),
  LoginScreen: () => null,
}));
test("background checks and connection failure keep the exact workspace instance visible", async () => {
  const view = await render(<AppRoot />);
  await fireEvent.press(await screen.findByText("Home"));
  mockChecking = true;
  await view.rerender(<AppRoot />);
  jest.useFakeTimers();
  try {
    await act(async () => jest.advanceTimersByTimeAsync(3_000));
    expect(screen.queryByText("Updating…")).toBeNull();
  } finally {
    jest.useRealTimers();
  }
  expect(screen.getByText("Open task and draft")).toBeOnTheScreen();
  expect(screen.queryByText("Branded startup")).toBeNull();
  mockChecking = false;
  mockAccessError = new Error("Network request failed");
  await view.rerender(<AppRoot />);
  expect(screen.getByText("Open task and draft")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "You're viewing your last update. Reconnect and retry before making changes.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retry" })).toBeOnTheScreen();
});
