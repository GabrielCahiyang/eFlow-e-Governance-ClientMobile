/** @jest-environment node */
import { test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Run the actual bootstrap, lifecycle adapter and installed Phoenix runtime in
// a DOM-free RN-shaped global. No auth client, timers or network are started.
function nativeRuntime(legacyGlobalEvents = false) {
  const changes: Array<(state: string) => void> = [];
  const native = {
    Platform: { OS: "android" },
    AppState: {
      currentState: "active",
      addEventListener: (_type: string, callback: (state: string) => void) => {
        changes.push(callback);
        return { remove() {} };
      },
    },
    Linking: { openURL() {} },
  };
  const context = vm.createContext({
    console,
    URL,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    FormData: class { append() {} },
    WebSocket: class {},
  });
  vm.runInContext("globalThis.window = globalThis; globalThis.self = globalThis", context);
  const modules: Record<string, unknown> = {
    "react-native": native,
    "react-native-url-polyfill/auto": {},
    "expo-crypto": { randomUUID() {}, getRandomValues() {}, CryptoDigestAlgorithm: { SHA256: "SHA256" } },
    "@react-native-async-storage/async-storage": {},
    "./config": { backendConfig: { webOrigin: "https://example.invalid" } },
  };
  function evaluate(code: string, filename: string) {
    const module = { exports: {} as any };
    const run = vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename });
    run((name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected runtime dependency: ${name}`);
      return modules[name];
    }, module, module.exports);
    return module.exports;
  }
  function load(file: string) {
    return evaluate(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../../src/platform", file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, file);
  }
  modules["./events"] = load("events.ts");
  modules["./timers"] = load("timers.ts");
  load("bootstrap.ts");
  const runtime = load("webRuntime.ts");
  if (legacyGlobalEvents) {
    const bus = (modules["./events"] as any).appEvents;
    for (const method of ["addEventListener", "removeEventListener", "dispatchEvent"])
      context[method] = bus[method].bind(bus);
  }
  const phoenix = evaluate(fs.readFileSync(require.resolve("@supabase/phoenix"), "utf8"), "phoenix.cjs.js");
  const socket = new phoenix.Socket("wss://example.invalid/socket");
  return { context, runtime, socket, change: (state: string) => changes.forEach((callback) => callback(state)) };
}

test("the old global event bridge reproduces the reported Phoenix document crash", () => {
  const app = nativeRuntime(true);
  expect(() => app.change("background")).toThrow(/document/);
});

test("native background/resume preserves headless events without exposing DOM APIs to Phoenix", () => {
  const app = nativeRuntime();
  expect(app.context.document).toBeUndefined();
  expect(app.context.addEventListener).toBeUndefined();
  const visibility: string[] = [];
  let focusCount = 0;
  app.runtime.nativeDocument.addEventListener("visibilitychange", () => visibility.push(app.runtime.nativeDocument.visibilityState));
  app.runtime.nativeWindow.addEventListener("focus", () => focusCount++);
  expect(() => {
    for (let i = 0; i < 3; i++) {
      app.change("background");
      app.change("active");
    }
  }).not.toThrow();
  expect(visibility).toEqual(["hidden", "visible", "hidden", "visible", "hidden", "visible"]);
  expect(focusCount).toBe(3);
  expect(app.runtime.nativeDocument.hidden).toBe(false);
  expect(app.socket.pageHidden).toBe(false);
});

