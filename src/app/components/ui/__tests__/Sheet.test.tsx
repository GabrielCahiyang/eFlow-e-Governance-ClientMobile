import { render, screen, fireEvent } from "@testing-library/react-native";
import { test, jest, expect } from "@jest/globals";
import { MotionProvider } from "../../../shared/motion";
import { Sheet } from "../Sheet";
import { Text } from "../Typography";
test("a busy operation cannot dismiss its dialog from the close button or backdrop", async () => {
  const close = jest.fn();
  await render(
    <MotionProvider reduceMotion>
      <Sheet open busy title="Import PDF" onClose={close}>
        <Text>Processing the import</Text>
      </Sheet>
    </MotionProvider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Close dialog" }));
  await fireEvent.press(
    screen.getByRole("button", {
      name: "Dismiss dialog",
      includeHiddenElements: true,
    }),
  );
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByText("Processing the import")).toBeOnTheScreen();
});
test("an idle dialog can close through the accessible close control", async () => {
  const close = jest.fn();
  await render(
    <MotionProvider reduceMotion>
      <Sheet open title="Project setup" onClose={close}>
        <Text>Project checks</Text>
      </Sheet>
    </MotionProvider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Close dialog" }));
  expect(close).toHaveBeenCalledTimes(1);
});
