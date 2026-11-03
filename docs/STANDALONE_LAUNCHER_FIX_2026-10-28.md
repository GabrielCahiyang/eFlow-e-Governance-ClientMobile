# Android development-launcher report — build 2

> **Superseded by build 3:** build 2 removed the launcher but had a subsequently reported native lifecycle crash. Install [build 3](../artifacts/eFlow-android-standalone-v3.apk); see [the crash fix and verification](NATIVE_DOCUMENT_CRASH_2026-10-28.md). The build-2 receipt below is historical evidence.

## Verified replacement

- APK: `artifacts/eFlow-android-standalone-v2.apk` — 56,051,486 bytes; version `1.0.0`, Android build **2**, ARM64.
- SHA-256: `bcdce422fbac91009ffc5d49087552ba6f66b01ac0ed2f6396e7f57c56c2a81a`.
- Native build: **BUILD SUCCESSFUL**, 750 tasks; `standalone-v2-android-build.log`.
- Actual APK inspection passed: non-debuggable, launch activity `com.eflow.mobile.MainActivity`, no Expo development-launcher/menu manifest or DEX references, embedded Hermes bundle matches generated release output, and startup/login sources match the release source map.
- Signature verified; certificate SHA-256 matches the previous QA key: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Evidence: `standalone-v2-signature.log`.
- TypeScript/Metro checks, **84 tests in 34 suites**, and both platform exports passed. Logs: `standalone-v2-check.log`, `standalone-v2-tests.log`, `standalone-v2-exports.log`.
- Production executable audit passed for both exports and the actual build-2 APK's embedded bundle: development account literals absent. Evidence: `docs/NATIVE_RELEASE_AUDIT.json` and `standalone-v2-release-audit.log`.

Install build 2 over the existing matching package. This fix requires no uninstall or data reset. The older artifacts below are historical evidence, not the replacement to install.

The user's phone showed Expo's development-client launcher instead of eFlow. The screenshot does not establish the installed APK's version or hash. The earlier v1 artifact checks established an embedded release bundle and non-debuggable metadata; they did not prove what opened on that phone.

## Change

- Removed `expo-dev-client` and its `expo-dev-launcher` / `expo-dev-menu` dependencies entirely, including the lockfile entries.
- Regenerated the native Android project. The generated development-client URL scheme is absent.
- Incremented Android versionCode to **2** and retained package `com.eflow.mobile` and the existing QA signing key, allowing an update of the previous matching package.
- Kept the native PCM, PDF and WebRTC modules. A compiled native app does not require a development launcher to use these modules.
- Added a regression test that rejects development-client packages in app dependencies, lockfile or configuration.
- Added `scripts/verify-standalone-apk.py`, which examines the actual APK's Android metadata, manifest, DEX files and embedded app bundle. It rejects developer launcher/menu code, a debuggable app, an unexpected launcher/package/version, or a missing/different embedded bundle.

The authoritative build-2 artifact receipt is `STANDALONE_V2_APK_VERIFICATION.json`. Use the APK path in that receipt rather than an older debug or v1 file. Android signature verification is recorded separately. The package uses internal QA signing, rather than store signing.

No phone was connected to ADB during this fix. These are artifact and source checks; no claim of a completed physical-phone login or workflow test is made. Installing build 2 on the user's phone remains the final startup check.

No database, account, credentials, permissions or financial record was changed.

Reference: [Expo's development-client documentation](https://docs.expo.dev/versions/latest/sdk/dev-client/).
