import { Platform } from "react-native";
import { backendConfig } from "./config";
import { supabase } from "./supabase";
export function normalizeNativeGateway(value: string) {
  const url = new URL(value.trim());
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Configure an absolute eFlow HTTP or HTTPS gateway address without credentials.",
    );
  const path = url.pathname.replace(/\/+$/, "");
  return (
    url.origin +
    (path === ""
      ? "/controlpanelEflow/api"
      : path === "/controlpanelEflow"
        ? path + "/api"
        : path)
  );
}
export async function resolveNativeControlBase() {
  if (backendConfig.gateway)
    return normalizeNativeGateway(backendConfig.gateway);
  if (
    __DEV__ &&
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
    return window.location.origin + "/controlpanelEflow/api";
  // This RPC exposes the public routing address only. Account permissions and
  // every protected operation are still checked by the existing gateway.
  const { data, error } = await supabase.rpc("eflow_login_gateway_endpoint");
  if (error || typeof data !== "string" || !data.trim())
    throw new Error(
      "The secure eFlow control service is unavailable. Start the gateway or configure its published address.",
    );
  return normalizeNativeGateway(data);
}
export async function nativeAiRuntimeState() {
  const endpoint = await resolveNativeControlBase();
  try {
    const response = await fetch(endpoint + "/ai/status", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Status unavailable");
    const body = await response.json(),
      value = String(
        body.ai_endpoint_status || body.status || "unknown",
      ).toLowerCase();
    const status = ["online", "offline", "starting", "restarting"].includes(
      value,
    )
      ? (value as "online" | "offline" | "starting" | "restarting")
      : ("unknown" as const);
    return {
      endpoint,
      status,
      message:
        typeof body.ai_endpoint_status_message === "string"
          ? body.ai_endpoint_status_message
          : "",
    };
  } catch {
    return {
      endpoint,
      status: "unknown" as const,
      message: "AI availability will be checked by the secure gateway.",
    };
  }
}
