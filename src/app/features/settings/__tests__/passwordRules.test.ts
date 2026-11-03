import { test, expect } from "@jest/globals";
import { passwordChangeError } from "../passwordRules";
test("password changes preserve the source current-password, length and confirmation checks", () => {
  expect(passwordChangeError("", "abcdefghijkl", "abcdefghijkl")).toContain(
    "current password",
  );
  for (const size of [0, 11, 129])
    expect(
      passwordChangeError("current", "a".repeat(size), "a".repeat(size)),
    ).toContain("12 to 128");
  expect(
    passwordChangeError("current", "a".repeat(12), "b".repeat(12)),
  ).toContain("do not match");
  for (const size of [12, 128])
    expect(
      passwordChangeError("current", "a".repeat(size), "a".repeat(size)),
    ).toBe("");
});
