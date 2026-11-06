import { test, expect } from "@jest/globals";
import { themedStyle, themeText } from "../Appearance";
import { colors, darkColors } from "../theme";
test("dark surfaces and existing static text styles remap while preserving white button labels", () => {
  expect(
    themedStyle(
      { backgroundColor: colors.surface, borderColor: colors.border },
      true,
    ),
  ).toEqual({
    backgroundColor: darkColors.surface,
    borderColor: darkColors.border,
  });
  expect(themedStyle({ color: colors.text }, true)).toEqual({
    color: darkColors.text,
  });
  expect(
    themedStyle({ color: "#fff", backgroundColor: colors.primary }, true),
  ).toEqual({ color: "#fff", backgroundColor: colors.primary });
  expect(themeText(undefined, true)[0]).toEqual({ color: darkColors.text });
});
test("light presentation leaves source styles intact", () => {
  const style = { color: colors.text, backgroundColor: colors.surface };
  expect(themedStyle(style, false)).toBe(style);
});
