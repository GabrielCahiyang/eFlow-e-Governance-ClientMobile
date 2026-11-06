import "react-native-url-polyfill/auto";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { configureDevelopmentFeedback } from "./developmentFeedback";

configureDevelopmentFeedback();

// Compatibility is limited to the event/crypto APIs used by headless services;
// DOM components and browser document APIs are never mounted in the native app.
if (!globalThis.crypto?.randomUUID || !globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: globalThis.crypto?.randomUUID || Crypto.randomUUID,
      getRandomValues: Crypto.getRandomValues,
      subtle: globalThis.crypto?.subtle || {
        digest: async (_algorithm: string, data: BufferSource) =>
          Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data),
      },
    },
    configurable: true,
  });
if (Platform.OS !== "web") {
  const host = globalThis as unknown as Record<string, any>;
  if (typeof host.Event !== "function")
    host.Event = class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    };
  if (typeof host.CustomEvent !== "function")
    host.CustomEvent = class extends host.Event {
      detail: unknown;
      constructor(type: string, options?: { detail?: unknown }) {
        super(type);
        this.detail = options?.detail;
      }
    };
  // Do not advertise browser window events on the React Native global. Some
  // dependencies (including Phoenix) treat addEventListener as proof of a DOM
  // and subsequently read document. Headless services use the explicit
  // nativeWindow/nativeDocument adapters; AppState events stay on that bus.
  const NativeFormData = globalThis.FormData;
  class ServiceFormData extends NativeFormData {
    append(name: string, value: any, fileName?: string) {
      if (
        value instanceof ArrayBuffer &&
        typeof (value as any).uri === "string"
      )
        return super.append(name, {
          uri: (value as any).uri,
          name: fileName || (value as any).name,
          type: (value as any).type,
        } as any);
      return super.append(name, value, fileName);
    }
  }
  host.FormData = ServiceFormData;
}
