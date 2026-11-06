import { afterEach, expect, jest, test } from "@jest/globals";

afterEach(() => {
  jest.restoreAllMocks();
});

function readConfig(mode?: string) {
  const env: typeof process.env = {
    ...process.env,
    EXPO_PUBLIC_SUPABASE_URL: "https://ixnfphgjyelhckjwjkdv.supabase.co",
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key",
  };
  delete env.EXPO_PUBLIC_EFLOW_MOBILE_SIGN_IN;
  if (mode !== undefined) env.EXPO_PUBLIC_EFLOW_MOBILE_SIGN_IN = mode;
  jest.replaceProperty(process, "env", env);
  let config!: typeof import("../config");
  jest.isolateModules(() => {
    config = require("../config");
  });
  return config;
}

test.each([undefined, "", "edge"])(
  "native releases select hosted sign-in with mode %s",
  (mode) => {
    const config = readConfig(mode);
    expect(config.backendConfig.mobileSignIn).toBe(true);
    expect(config.configurationError).toBe("");
  },
);

test("the protected gateway requires an explicit transport choice", () => {
  const config = readConfig("gateway");
  expect(config.backendConfig.mobileSignIn).toBe(false);
  expect(config.configurationError).toBe("");
});

test("an unsupported transport fails configuration validation", () => {
  expect(readConfig("typo").configurationError).toMatch(
    /unsupported secure sign-in/,
  );
});
