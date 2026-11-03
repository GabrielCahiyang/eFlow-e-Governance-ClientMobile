# Native delivery receipt — 28 October 2026

> **Superseded Android artifact:** install [standalone build 3](../artifacts/eFlow-android-standalone-v3.apk). It fixes the native `document` lifecycle crash and retains removal of Expo's development launcher. See [the build-3 report](NATIVE_DOCUMENT_CRASH_2026-10-28.md) and `STANDALONE_V3_APK_VERIFICATION.json`. The v1 receipt below is preserved as historical evidence.

## Installable Android QA build

`artifacts/eFlow-android-arm64-2026-10-28-qa.apk`

- Standalone **release** APK with embedded Hermes code. Metro is not needed to launch it. Authentication, database, email and AI services still need their normal network/server access.
- Package `com.eflow.mobile`; version `1.0.0` / code `1`; Android API 24 minimum, target 36; **arm64-v8a**.
- 56,051,578 bytes (about 56 MB).
- SHA-256: `29dc98a86459a04292672192e373d22b855d6895eeb3bb4b0c61d0b607e8a997`.
- Signature verified by Android `apksigner`; internal QA uses the Android Debug certificate. This is not a store-signed release. Android metadata reports no debuggable application flag.
- The embedded Hermes bundle matches the generated release bundle. Its source map matches the final membership terms, project invitation, allocation decision and app-root source modules. Native WebRTC libraries are packaged; source maps are not packaged in the APK.

## Checks completed

| Check | Result / evidence |
| --- | --- |
| TypeScript and Metro exclusion checks | Passed — `final-parity-check.log` |
| Local regression suite | **83 tests, 33 suites passed** — `remaining-parity-tests.log` |
| Android and iOS Hermes exports | Passed — `remaining-native-exports.log`; outputs `dist/android` and `dist/ios` |
| Production executable audit | Both exports **and the embedded APK bundle** checked: development account literals absent — `docs/NATIVE_RELEASE_AUDIT.json` |
| Android native compilation/packaging | Passed — aggregate `BUILD SUCCESSFUL` (1,077 tasks), including app, PCM, PDF extraction and WebRTC release assembly. Details: `DELIVERY_RECEIPT_2026-10-28.json` / `android-standalone-build.log`. |
| APK signature/package/source checks | Passed — `apk-signature-verification.log`, `apk-package-metadata.log`, machine-readable receipt |
| Real device/browser workflow | **Not run in this pass** — the user owns this walkthrough |
| iOS Swift/pods/IPA | **Not compiled/produced** — this Windows host has no Xcode |

Earlier development APKs and historical web-preview screenshots are not evidence for this build. See `REMAINING_PARITY_IMPLEMENTATION_2026-10-28.md` for changes and limitations, and `MANUAL_MOBILE_VERIFICATION.md` for the walkthrough.

## Source fixes made during native build

The Android PDFBox port requires `Path.FillType` for graphics callbacks. The initial desktop-style integer signatures failed compilation and were corrected. Release shrinking also identified two exact optional/generated references. The managed `withNativeReleaseRules` plugin retains targeted rules across prebuilds: optional PDFBox JPX image decoding is unused by text/vector extraction; the installed Jitsi 155.0.1 AAR contains an unreferenced generated Dav1d JNI shim without the corresponding Java decoder/interface. Installed archive references were inspected before adding the narrow rules. Native build failures are retained in `android-native-first-failure.log` and `android-native-r8-failure.log`.

For future APK builds, target **`:app:assembleRelease`** rather than the root `assembleRelease`: the root task additionally builds every dependency's AAR after the APK is already assembled. Keep the Windows CMake path/job-pool plugin; do not clean caches for routine JS changes.

## Actual remaining setup

- Personal-work eligibility: isolated source fix prepared, **not applied** to the hosted backend. See `delivery/personal-eligibility` and the recorded finding.
- Remote push: native client and isolated server source package prepared, **not live**. Needs reviewed deployment, dispatcher scheduling, EAS ID and FCM/APNs credentials.
- Calls: foreground implementation; remote networks require STUN/TURN setup. Background call wake-up is not implemented.
- HTTPS invitation app links: domain/platform association remains configuration work.
- iOS: run the native prebuild/pods/build on a Mac, then perform real-device acceptance. A Hermes export does not validate Swift or native permissions.

These are separate from manual checks. This receipt does not declare full one-to-one or production acceptance.
