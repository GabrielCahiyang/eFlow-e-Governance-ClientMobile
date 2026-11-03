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
