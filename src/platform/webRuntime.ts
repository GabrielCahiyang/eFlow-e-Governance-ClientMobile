import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking, Platform } from "react-native";
import { appEvents } from "./events";
import { backendConfig } from "./config";
import { createTimerBridge } from "./timers";

// Explicit adapters for browser APIs used by the preserved *headless* layer.
// These are imported by generated modules, never installed as a fake DOM.
const local = new Map<string, string>(),
  session = new Map<string, string>();
const storage = (values: Map<string, string>, persist: boolean) => {
  const api = {
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
      if (persist) void AsyncStorage.setItem("web-pref:" + key, String(value));
    },
    removeItem: (key: string) => {
      values.delete(key);
      if (persist) void AsyncStorage.removeItem("web-pref:" + key);
    },
    clear: () => {
      const keys = [...values.keys()];
      values.clear();
      if (persist)
        void AsyncStorage.multiRemove(keys.map((k) => "web-pref:" + k));
    },
  };
  return new Proxy(api, {
    get: (target, property) =>
      property === "length" ? values.size : Reflect.get(target, property),
    ownKeys: () => [...values.keys()],
    getOwnPropertyDescriptor: (_target, property) =>
      typeof property === "string" && values.has(property)
        ? { enumerable: true, configurable: true, value: values.get(property) }
        : undefined,
  });
};
export async function hydrateWebPreferences() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
    k.startsWith("web-pref:"),
  );
  const rows = await AsyncStorage.multiGet(keys);
  rows.forEach(([key, value]) => {
    if (value !== null) local.set(key.slice(9), value);
  });
}
export const nativeDocument: any = {
  visibilityState: AppState.currentState === "active" ? "visible" : "hidden",
  hidden: AppState.currentState !== "active",
  addEventListener: appEvents.addEventListener.bind(appEvents),
  removeEventListener: appEvents.removeEventListener.bind(appEvents),
};
export const nativeWindow: any = {
  // Available only in the RN Web preview; device capture uses the local PCM module.
  get AudioContext() {
    return Platform.OS === "web" ? globalThis.AudioContext : undefined;
  },
  addEventListener: appEvents.addEventListener.bind(appEvents),
  removeEventListener: appEvents.removeEventListener.bind(appEvents),
  dispatchEvent: appEvents.dispatchEvent.bind(appEvents),
  localStorage: storage(local, true),
  sessionStorage: storage(session, false),
  document: nativeDocument,
  ...createTimerBridge(globalThis),
  location: {
    origin: backendConfig.webOrigin,
    hostname: backendConfig.webOrigin
      ? new URL(backendConfig.webOrigin).hostname
      : "native-app",
    pathname: "/",
    search: "",
    hash: "",
  },
  open: (url: string) => {
    void Linking.openURL(url);
    return null;
  },
};
AppState.addEventListener("change", (state) => {
  nativeDocument.visibilityState = state === "active" ? "visible" : "hidden";
  nativeDocument.hidden = state !== "active";
  appEvents.dispatchEvent({ type: "visibilitychange" });
  if (state === "active") appEvents.dispatchEvent({ type: "focus" });
});
