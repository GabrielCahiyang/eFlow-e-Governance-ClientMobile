# M0 emulator follow-up — 4 November 2026

User request: run the emulator for personal testing. M0 remains awaiting acceptance; M1 has not started. No runtime source was changed.

The dedicated **eFlow_M0_QA** Android 16 / API 36 emulator is running on `emulator-5556`. The **native x86_64 release** APK installed successfully, cold-launched without Metro, displayed the existing eFlow login screen and remained foreground with a live process. This is installation/startup smoke evidence only; authenticated workflows, physical ARM64 phone behavior and iOS remain unverified.

- [Emulator APK](../../artifacts/M0/eFlow-Mobile-M0-QA-x86_64.apk), 60,856,325 bytes, version 1.0.0 / versionCode 5, local QA debug certificate.
- APK SHA-256: `edb3e2e18917e47283cf8d0e0224bcb9c15fe6cee6be4797ef75a3f1d9354c92`.
- [Artifact, signature, source and launch receipt](M0-emulator-apk-verification.json).
- [Actual native login screenshot](../../artifacts/M0/emulator-android16-login.png), 1080 × 2340; Android emulator, not RN Web.
- Embedded bundle is byte-identical by SHA-256 to the previously credential-audited M0 phone bundle. Non-debuggable manifest, no dev launcher/menu, correct startup source and signature/ABI checks passed.

The original ARM64 phone APK installed on the older x86_64 emulator through translation but crashed loading `libreactnative.so`. This does not establish physical ARM64 behavior. The separate x86_64 build resolves that emulator mismatch. Updating the existing Medium Phone AVD then failed its low-storage check (309 MB free); cache trimming did not free space. Its other apps/data were retained. A new QA AVD with a 12 GB data partition was created from the existing Pixel hardware configuration and installed API 36 Google APIs system image. The earlier Pixel/API 37 startup attempt was stopped; existing AVDs were not wiped.

The x86_64 build succeeded in 9m30s; log: `artifacts/M0/assemble-emulator-x86_64.log`. Task-generated changes to tracked module outputs were restored. No hosted operation, sign-in, account change or financial action was performed by the agent. APKs/screenshots/logs remain local and ignored by Git.

Use the running emulator to sign in with an authorized test account and follow [M0 personal QA](M0-personal-qa.md). Agent startup evidence does not mark your checklist or M0 accepted. No M1 work is authorized by this emulator request.

To reopen this same QA emulator later:

```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd eFlow_M0_QA -port 5556 -gpu swiftshader -no-audio -scale 0.4
& "$env:ANDROID_HOME\platform-tools\adb.exe" -s emulator-5556 shell am start -n com.eflow.mobile/.MainActivity
```
