import { test, jest, expect } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import { MotionProvider } from "../../../shared/motion";
import { LoginScreen } from "../LoginScreen";
import { signInWithAccountProtection } from "../../../../core/web/app/features/authentication/services/accountLogin";
jest.mock("../../../../platform/config", () => ({ configurationError: "" }));
jest.mock("../../../../platform/supabase", () => ({
  supabase: { auth: { resetPasswordForEmail: jest.fn() } },
}));
jest.mock(
  "../../../../core/web/app/features/authentication/services/accountLogin",
  () => ({ signInWithAccountProtection: jest.fn() }),
);
jest.mock("../LivingBoard", () => ({ LivingBoard: () => null }));
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
