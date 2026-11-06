import { afterEach, expect, jest, test } from "@jest/globals";
import { backendConfig } from "../../../../platform/config";
import { supabase } from "../../../../platform/supabase";
import { signInWithAccountProtection } from "../../../../core/web/app/features/authentication/services/accountLogin";
import { signInOnMobile } from "../mobileSignIn";

jest.mock("../../../../platform/config", () => ({
  configurationError: "",
  backendConfig: {
    mobileSignIn: true,
    url: "https://example.test",
    publicKey: "test-public-key",
  },
}));
jest.mock("../../../../platform/supabase", () => ({
  supabase: { auth: { setSession: jest.fn(async () => ({ error: null })) } },
}));
jest.mock(
  "../../../../core/web/app/features/authentication/services/accountLogin",
  () => ({
    signInWithAccountProtection: jest.fn(),
    AccountSignInError: class extends Error {
      constructor(status: number, message: string) {
        super(message);
        Object.assign(this, { status });
        this.name = "AccountSignInError";
      }
    },
  }),
);

afterEach(() => {
  backendConfig.mobileSignIn = true;
  jest.restoreAllMocks();
});

test("the enabled native path sends a single request to the Supabase function and stores its tokens", async () => {
  const tokens = { access_token: "test-access", refresh_token: "test-refresh" };
  const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => tokens,
  } as Response);

  await signInOnMobile(" worker@example.test ", "test-value");

  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    "https://example.test/functions/v1/mobile-sign-in",
    expect.objectContaining({
      method: "POST",
      headers: {
        apikey: "test-public-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "worker@example.test",
        password: "test-value",
      }),
    }),
  );
  expect(supabase.auth.setSession).toHaveBeenCalledWith(tokens);
  expect(signInWithAccountProtection).not.toHaveBeenCalled();
});

test.each([401, 403, 423, 404, 429, 503])(
  "a %i function response cannot trigger a fallback or establish a session",
  async (status) => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: false, status } as Response);

    await expect(
      signInOnMobile("worker@example.test", "test-value"),
    ).rejects.toMatchObject({ status });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(signInWithAccountProtection).not.toHaveBeenCalled();
  },
);

test("an explicitly selected gateway still uses account protection", async () => {
  backendConfig.mobileSignIn = false;
  const fetch = jest.spyOn(globalThis, "fetch");

  await signInOnMobile("worker@example.test", "test-value");

  expect(signInWithAccountProtection).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
});

test("a network failure never retries credentials through the old gateway", async () => {
  const fetch = jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new TypeError("Network request failed"));
  await expect(
    signInOnMobile("worker@example.test", "test-value"),
  ).rejects.toThrow("Network request failed");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(supabase.auth.setSession).not.toHaveBeenCalled();
  expect(signInWithAccountProtection).not.toHaveBeenCalled();
});
