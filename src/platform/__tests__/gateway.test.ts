import { test, expect, jest, beforeEach } from "@jest/globals";
import {
  normalizeNativeGateway,
  resolveNativeControlBase,
  nativeAiRuntimeState,
} from "../gateway";
import { backendConfig } from "../config";
import { supabase } from "../supabase";
jest.mock("../config", () => ({ backendConfig: { gateway: "" } }));
jest.mock("../supabase", () => ({ supabase: { rpc: jest.fn() } }));
beforeEach(() => {
  backendConfig.gateway = "";
  jest.clearAllMocks();
});
test("normalizes gateway roots and preserves the existing API path", () => {
  for (const value of [
    "https://example.com",
    "https://example.com/",
    "https://example.com/controlpanelEflow",
    "https://example.com/controlpanelEflow/api/",
  ])
    expect(normalizeNativeGateway(value)).toBe(
      "https://example.com/controlpanelEflow/api",
    );
});
test("rejects relative paths and embedded credentials instead of routing to a phone loopback", () => {
  for (const value of [
    "/api",
    "javascript:alert(1)",
    "https://name:password@example.com",
    "https://example.com?secret=x",
  ])
    expect(() => normalizeNativeGateway(value)).toThrow();
});
test("an explicit native gateway is honored without querying settings", async () => {
  backendConfig.gateway = "https://example.com";
  expect(await resolveNativeControlBase()).toBe(
    "https://example.com/controlpanelEflow/api",
  );
  expect(supabase.rpc).not.toHaveBeenCalled();
});
test("an ordinary signed-out native caller discovers only the public gateway route", async () => {
  jest
    .mocked(supabase.rpc)
    .mockResolvedValue({ data: "https://example.com", error: null } as never);
  expect(await resolveNativeControlBase()).toBe(
    "https://example.com/controlpanelEflow/api",
  );
  expect(supabase.rpc).toHaveBeenCalledWith("eflow_login_gateway_endpoint");
});
test("an unavailable published address fails clearly", async () => {
  jest
    .mocked(supabase.rpc)
    .mockResolvedValue({ data: null, error: null } as never);
  await expect(resolveNativeControlBase()).rejects.toThrow(
    "control service is unavailable",
  );
});
test("a lost status response is unknown, while the authenticated gateway can still decide availability", async () => {
  backendConfig.gateway = "https://example.com";
  const original = globalThis.fetch;
  globalThis.fetch = jest.fn(async () => {
    throw new Error("Network lost");
  }) as typeof fetch;
  try {
    expect(await nativeAiRuntimeState()).toMatchObject({
      endpoint: "https://example.com/controlpanelEflow/api",
      status: "unknown",
    });
  } finally {
    globalThis.fetch = original;
  }
});

