import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { FavoriteStar } from "../FavoriteStar";
let mockReduced = false,
  mockActive = true;
jest.mock("../../../shared/motion", () => ({
  motionDuration: { expressiveShort: 250 },
  motionEase: { state: [0.4, 0, 0.2, 1] },
  useMotionPreferences: () => ({ reduced: mockReduced, active: mockActive }),
}));
test("star feedback starts only on a tap; reduced motion and background preserve the checked state without replay", async () => {
  const toggle = jest.fn();
  const view = await render(
    <FavoriteStar
      label="Favorite workspace QA"
      checked={false}
      onToggle={toggle}
    />,
  );
  const motion = () => view.getByTestId("favorite-star-motion").props.style;
  expect(motion().animationName).toBeUndefined();
  await fireEvent.press(
    view.getByRole("checkbox", { name: "Favorite workspace QA" }),
  );
  expect(toggle).toHaveBeenCalledTimes(1);
  expect(motion().animationName).toBeDefined();
  await view.rerender(
    <FavoriteStar label="Favorite workspace QA" checked onToggle={toggle} />,
  );
  expect(view.getByRole("checkbox").props.accessibilityState.checked).toBe(
    true,
  );
  try {
    mockReduced = true;
    await view.rerender(
      <FavoriteStar label="Favorite workspace QA" checked onToggle={toggle} />,
    );
    expect(motion().animationName).toBeUndefined();
    await fireEvent.press(view.getByRole("checkbox"));
    expect(toggle).toHaveBeenCalledTimes(2);
    expect(motion().animationName).toBeUndefined();
    mockReduced = false;
    await view.rerender(
      <FavoriteStar label="Favorite workspace QA" checked onToggle={toggle} />,
    );
    expect(motion().animationName).toBeUndefined();
    mockActive = false;
    await view.rerender(
      <FavoriteStar label="Favorite workspace QA" checked onToggle={toggle} />,
    );
    mockActive = true;
    await view.rerender(
      <FavoriteStar label="Favorite workspace QA" checked onToggle={toggle} />,
    );
    expect(motion().animationName).toBeUndefined();
  } finally {
    mockReduced = false;
    mockActive = true;
  }
});
