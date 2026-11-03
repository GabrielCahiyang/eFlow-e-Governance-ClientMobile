# Native startup crash: browser document accessed by Realtime

## Report and exact source

Opening the standalone APK produced `ReferenceError: Property 'document' doesn't exist`. The supplied Hermes stack was decoded with build 2's generated release source map before rebuilding:

| Generated location | Source |
| --- | --- |
| `1:2485557` | `@supabase/phoenix/priv/static/phoenix.cjs.js:1256–1257`, visibility handler reads `document.visibilityState` |
| `1:2281097`, `1:1140120` | `src/platform/events.ts:12`, dispatching to the listener |
| `1:1480016` | `src/platform/webRuntime.ts:84`, dispatching visibility after a React Native AppState change |
| Remaining AppState/emitter frames | React Native's native lifecycle event delivery |

The native bootstrap installed `addEventListener`, `removeEventListener` and `dispatchEvent` on the global object. React Native aliases `window` to that object. Phoenix 0.4.5 interprets the presence of `window.addEventListener` as browser lifecycle support, subscribes to visibility changes, and reads the nonexistent browser `document` when eFlow's AppState bridge emits an event. The prior APK checks verified packaging, not this lifecycle interaction.

## Fix

Removed the browser event methods from global bootstrap. Preserved `appEvents` and the explicit `nativeWindow` / `nativeDocument` adapters used by generated headless services. These continue to publish native visibility and focus changes. Phoenix no longer registers browser lifecycle callbacks against a native global. No fake DOM or catch-and-ignore handler was introduced. The existing Supabase auth AppState refresh handling remains in place.

The regression runs the real bootstrap, lifecycle adapter and installed Phoenix CommonJS code in an isolated, DOM-free React Native-shaped global. Its negative control restores the old global bridge and reproduces the reported document exception. The fixed case exercises three background/resume cycles and confirms the explicit visibility/focus notifications survive.

## Delivery and verification

Build 3 uses the same package and signing key, with Android versionCode 3. It supersedes build 2. Build 2's APK/receipt remain historical evidence. The actual-APK checker now also compares bundled bootstrap and lifecycle adapter sources to the current files.

Verification completed on 29 October 2026 (Asia/Manila):

- Source checks passed (`standalone-v3-check.log`), and all **86 tests in 35 suites** passed (`standalone-v3-tests.log`), including the negative-control reproduction and fixed lifecycle case.
- Android and iOS Hermes exports passed (`standalone-v3-exports.log`). This is not an iOS native compilation result.
- Android release build **BUILD SUCCESSFUL**, 11m 30s, 750 tasks (`standalone-v3-android-build.log`).
- APK: [eFlow-android-standalone-v3.apk](../artifacts/eFlow-android-standalone-v3.apk), **56,051,274 bytes**, versionCode **3**, ARM64.
- SHA-256: `b2751b105ae36a348a5eb87ef578284e9f3d3a03dfe3e19db8de67645bd79a46`.
- Actual APK inspection passed: normal `com.eflow.mobile.MainActivity` launcher; no development launcher/menu metadata or DEX classes; non-debuggable; embedded Hermes code matches current release output; startup, login, bootstrap and lifecycle sources match the release source map. Evidence: `STANDALONE_V3_APK_VERIFICATION.json`.
- Signature verified with the same internal QA certificate as build 2 (`standalone-v3-signature.log`). No uninstall or data reset is required to update a matching package.
- Production executable audit passed for both platform exports and build 3's actual embedded APK bundle: development account literals absent (`standalone-v3-release-audit.log`, `NATIVE_RELEASE_AUDIT.json`).

No device was connected at investigation time; an isolated runtime regression is not a physical-phone startup test. No database, permissions, credentials, schema or live financial data changed.

Reference: [Supabase React Native setup](https://supabase.com/docs/guides/auth/quickstarts/react-native). Installed package source and the exact release source map are the evidence for this particular failure.
