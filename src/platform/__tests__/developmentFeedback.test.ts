import { expect, jest, test } from "@jest/globals";
import { LogBox } from "react-native";
import {
  configureDevelopmentFeedback,
  expectedConnectionLogs,
} from "../developmentFeedback";

test("expected connectivity failures get one in-app message without hiding programming or authorization errors", () => {
  for (const message of [
    "Network request failed",
    "TypeError: Network request failed",
    'fetch failed: java.net.UnknownHostException: Unable to resolve host "example.invalid"',
    "java.net.SocketTimeoutException: timeout",
    "TypeError: Failed to fetch",
  ])
    expect(
      expectedConnectionLogs.some((pattern) => pattern.test(message)),
    ).toBe(true);
  for (const message of [
    "TypeError: Cannot read property 'id' of undefined",
    "Permission denied",
    "Invariant Violation: root not registered",
    "Unexpected fetch failed parsing response",
  ])
    expect(
      expectedConnectionLogs.some((pattern) => pattern.test(message)),
    ).toBe(false);
  const ignore = jest.spyOn(LogBox, "ignoreLogs"),
    consoleError = console.error;
  try {
    configureDevelopmentFeedback();
    expect(ignore).toHaveBeenCalledWith(expectedConnectionLogs);
    expect(console.error).toBe(consoleError);
  } finally {
    ignore.mockRestore();
  }
});

test("the development-only filter is not installed in a production runtime", () => {
  const runtime = globalThis as unknown as { __DEV__: boolean },
    previous = runtime.__DEV__;
  const ignore = jest.spyOn(LogBox, "ignoreLogs");
  try {
    runtime.__DEV__ = false;
    configureDevelopmentFeedback();
    expect(ignore).not.toHaveBeenCalled();
  } finally {
    runtime.__DEV__ = previous;
    ignore.mockRestore();
  }
});
