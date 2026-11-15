import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { backendConfig } from "./config";
import { authStorage } from "./authStorage";

export const supabase = createClient(
  backendConfig.url || "https://ixnfphgjyelhckjwjkdv.supabase.co",
  backendConfig.publicKey || "configuration-required",
  {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
    global: { headers: { "X-Client-Info": "eflow-mobile-native/1.0" } },
  },
);
if (Platform.OS !== "web")
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });

// React Native Storage uploads use ArrayBuffer rather than File/Blob, so
// @supabase/storage-js defaults contentType to text/plain unless supplied.
const storage = supabase.storage as unknown as {
  from?: (bucketId: string) => {
    upload?: (
      path: string,
      body: unknown,
      options?: { contentType?: string } & Record<string, unknown>,
    ) => unknown;
    update?: (
      path: string,
      body: unknown,
      options?: { contentType?: string } & Record<string, unknown>,
    ) => unknown;
  };
};
if (typeof storage?.from === "function") {
  const originalFrom = storage.from.bind(storage);
  storage.from = (bucketId: string) => {
    const bucket = originalFrom(bucketId);
    const withContentType = (
      method: "upload" | "update",
      original: NonNullable<(typeof bucket)["upload"]>,
    ) =>
      ((path, body, options) => {
        const bodyType =
          body && typeof body === "object" && "type" in body
            ? (body as { type?: unknown }).type
            : undefined;
        const nextOptions =
          !options?.contentType &&
          typeof bodyType === "string" &&
          bodyType.trim()
            ? { ...options, contentType: bodyType.trim() }
            : options;
        return original.call(bucket, path, body, nextOptions);
      }) as NonNullable<(typeof bucket)["upload"]>;
    if (typeof bucket?.upload === "function")
      bucket.upload = withContentType("upload", bucket.upload);
    if (typeof bucket?.update === "function")
      bucket.update = withContentType("update", bucket.update);
    return bucket;
  };
}
