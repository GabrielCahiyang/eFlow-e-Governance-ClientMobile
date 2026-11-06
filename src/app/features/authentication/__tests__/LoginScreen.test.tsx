import { test, jest, expect } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import { MotionProvider } from "../../../shared/motion";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppearanceProvider } from "../../../components/ui/Appearance";
import { darkColors } from "../../../components/ui/theme";
import { LoginScreen } from "../LoginScreen";
import { signInWithAccountProtection } from "../../../../core/web/app/features/authentication/services/accountLogin";
jest.mock("../../../../platform/config", () => ({
  configurationError: "",
  backendConfig: { mobileSignIn: false },
}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: { auth: { resetPasswordForEmail: jest.fn() } },
}));
jest.mock(
  "../../../../core/web/app/features/authentication/services/accountLogin",
  () => ({ signInWithAccountProtection: jest.fn() }),
);
jest.mock("../LivingBoard", () => ({ LivingBoard: () => null }));
test("dark sign-in keeps its heading and submit label readable", async () => {
  await AsyncStorage.setItem("eflow.appearance", "dark");
  try {
    await render(
      <AppearanceProvider>
        <MotionProvider reduceMotion>
          <LoginScreen />
        </MotionProvider>
      </AppearanceProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("Sign in to eFlow")).toHaveStyle({
        color: darkColors.text,
      }),
    );
    expect(screen.getByText("Log in")).toHaveStyle({
      color: darkColors.onPrimary,
    });
    expect(screen.getByRole("button", { name: "Log in" })).toHaveStyle({
      backgroundColor: darkColors.primary,
    });
  } finally {
    await AsyncStorage.removeItem("eflow.appearance");
  }
});
test("invalid fields show the existing validation messages without submitting a sign-in request", async () => {
  await render(
    <MotionProvider reduceMotion>
      <LoginScreen />
    </MotionProvider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
  expect(screen.getByText("Enter your email address.")).toBeOnTheScreen();
  expect(screen.getByText("Enter your password.")).toBeOnTheScreen();
  expect(signInWithAccountProtection).not.toHaveBeenCalled();
});
test("remember-session state is exposed correctly to native and web accessibility", async () => {
  await render(
    <MotionProvider reduceMotion>
      <LoginScreen />
    </MotionProvider>,
  );
  const remember = screen.getByRole("checkbox", { name: "Remember me" });
  expect(remember).toBeChecked();
  await fireEvent.press(remember);
  expect(remember).not.toBeChecked();
});
test("repeated taps while signing in send only one request and keep the form busy", async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  jest.mocked(signInWithAccountProtection).mockReturnValue(pending);
  await render(
    <MotionProvider reduceMotion>
      <LoginScreen />
    </MotionProvider>,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Email address"),
    "qa@example.test",
  );
  await fireEvent.changeText(screen.getByLabelText("Password"), "test-only");
  const button = screen.getByRole("button", { name: "Log in" });
  await fireEvent.press(button);
  await fireEvent.press(button);
  await waitFor(() =>
    expect(signInWithAccountProtection).toHaveBeenCalledTimes(1),
  );
  expect(button).toBeDisabled();
  await act(async () => {
    finish();
    await pending;
  });
  await waitFor(() => expect(button).toBeEnabled());
});

test.each([
  new Error(
    'fetch failed: java.net.UnknownHostException: Unable to resolve host "retired.trycloudflare.com"',
  ),
  new TypeError("Network request failed"),
  Object.assign(new Error("The request timed out"), { name: "TimeoutError" }),
])(
  "connection failures preserve the form and allow an explicit retry without leaking native diagnostics: %s",
  async (failure) => {
    jest.mocked(signInWithAccountProtection).mockRejectedValueOnce(failure);
    await render(
      <MotionProvider reduceMotion>
        <LoginScreen />
      </MotionProvider>,
    );
    await fireEvent.changeText(
      screen.getByLabelText("Email address"),
      "qa@example.test",
    );
    await fireEvent.changeText(screen.getByLabelText("Password"), "test-only");
    await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() =>
      expect(
        screen.getByText(
          /We couldn't connect|Sign-in is taking longer than expected/,
        ),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.queryByText(/UnknownHostException|retired\.trycloudflare/),
    ).toBeNull();
    expect(screen.getByLabelText("Email address")).toHaveProp(
      "value",
      "qa@example.test",
    );
    expect(screen.getByLabelText("Password")).toHaveProp("value", "test-only");
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
    expect(signInWithAccountProtection).toHaveBeenCalledTimes(1);
  },
);

test("server lockout decisions remain visible and are not retried", async () => {
  const message =
    "Your account is locked. Contact your Office support team for help.";
  jest.mocked(signInWithAccountProtection).mockRejectedValueOnce(
    Object.assign(new Error(message), {
      name: "AccountSignInError",
      status: 423,
    }),
  );
  await render(
    <MotionProvider reduceMotion>
      <LoginScreen />
    </MotionProvider>,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Email address"),
    "qa@example.test",
  );
  await fireEvent.changeText(screen.getByLabelText("Password"), "test-only");
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
  await waitFor(() => expect(screen.getByText(message)).toBeOnTheScreen());
  expect(signInWithAccountProtection).toHaveBeenCalledTimes(1);
});

test("a slow sign-in explains the wait without retrying credentials and clears the notice when finished", async () => {
  jest.useFakeTimers();
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  jest.mocked(signInWithAccountProtection).mockReturnValueOnce(pending);
  const view = await render(
    <MotionProvider reduceMotion>
      <LoginScreen />
    </MotionProvider>,
  );
  try {
    await fireEvent.changeText(
      view.getByLabelText("Email address"),
      "qa@example.test",
    );
    await fireEvent.changeText(view.getByLabelText("Password"), "test-only");
    await fireEvent.press(view.getByRole("button", { name: "Log in" }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(8_000);
    });
    expect(
      view.getByText(/Sign-in is taking a little longer/),
    ).toBeOnTheScreen();
    expect(signInWithAccountProtection).toHaveBeenCalledTimes(1);
    expect(view.getByRole("button", { name: "Log in" })).toBeDisabled();
    await act(async () => {
      finish();
      await pending;
    });
    expect(view.queryByText(/Sign-in is taking a little longer/)).toBeNull();
    expect(view.getByRole("button", { name: "Log in" })).toBeEnabled();
  } finally {
    finish();
    await view.unmount();
    jest.useRealTimers();
  }
});
