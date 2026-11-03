import { test, expect } from "@jest/globals";
import { themedStyle, themeText } from "../Appearance";
import { colors } from "../theme";
test("dark surfaces and existing static text styles remap while preserving white button labels", () => {
  expect(
    themedStyle(
      { backgroundColor: colors.surface, borderColor: colors.border },
      true,
    ),
  ).toEqual({ backgroundColor: "#19272b", borderColor: "#3b5053" });
  expect(themedStyle({ color: colors.text }, true)).toEqual({
    color: "#edf5f4",
  });
  expect(
    themedStyle({ color: "#fff", backgroundColor: colors.primary }, true),
  ).toEqual({ color: "#fff", backgroundColor: colors.primary });
  expect(themeText(undefined, true)[0]).toEqual({ color: "#edf5f4" });
});
test("light presentation leaves source styles intact", () => {
  const style = { color: colors.text, backgroundColor: colors.surface };
  expect(themedStyle(style, false)).toBe(style);
});
