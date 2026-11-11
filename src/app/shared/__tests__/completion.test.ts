import { expect, test } from "@jest/globals";
import { completionPercent } from "../completion";

test("only full child completion can display 100 percent", () => {
  expect(completionPercent(2, 3)).toBe(67);
  expect(completionPercent(199, 200)).toBe(99);
  expect(completionPercent(200, 200)).toBe(100);
  expect(completionPercent(0, 0, "for_review")).toBe(0);
  expect(completionPercent(0, 0, "completed")).toBe(100);
});
