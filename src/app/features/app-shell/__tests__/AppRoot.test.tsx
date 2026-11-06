import { test, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AppRoot } from "../AppRoot";
jest.mock("expo-font", () => {
  let attempts = 0;
  return {
    useFonts: () =>
      require("react").useState(() =>
        attempts++ === 0
          ? [false, new Error("Font fetch timed out")]
          : [true, null],
      )[0],
  };
});
jest.mock("../../../../platform/webRuntime", () => ({
  hydrateWebPreferences: async () => {},
}));
jest.mock("../NativeWorkspace", () => ({ NativeWorkspace: () => null }));
// This startup test does not exercise project access or start a real auth client.
jest.mock("../../projects", () => ({ ShareLanding: () => null }));
jest.mock("../LoadingScreen", () => ({ LoadingScreen: () => null }));
jest.mock("../../authentication", () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
  useNativeEntryLink: () => ({ entry: null, close: () => {} }),
  useAuth: () => ({ loading: false, user: null, profile: null, error: null }),
  LoginScreen: () =>
    require("react").createElement(
      require("react-native").Text,
      null,
      "Ready sign in",
    ),
}));
test("startup Retry remounts a failed font loader instead of only retrying preferences", async () => {
  await render(<AppRoot />);
  expect(screen.getByText("This is taking longer than expected. Please try again.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Ready sign in")).toBeOnTheScreen();
});
