# eFlow Mobile

eFlow Mobile is the Expo and React Native companion to eFlow Web for LGU Ormoc City. It supports Android and iOS for Heads, Members, and Accounting Staff. System administration is handled in eFlow Web.

The v1 product is **eFlow Mobile — Work, Updates & Approvals**: assigned work, tasks and nested subtasks, evidence, reviews, communication, project/Office context and focused authorized finance. Its contract is shared backend contracts and business-rule parity, intentional mobile feature selection, and native mobile UX. Advanced desktop workspaces stay on eFlow Web.

The redesign is at **M4**, evidence, reviews, activity and text communication. See the [M4 personal QA package](docs/mobile-redesign/M4-personal-qa.md) and the [phase tracker](docs/mobile-redesign/phase-progress.md).

For the reported emulator sign-in DNS failure, see the [local gateway setup](docs/mobile-redesign/M0-login-fix-qa.md). The M4 QA APK uses the protected gateway on the host PC through ADB forwarding.

## Local setup

1. Install Node.js and npm. For Android, install Android Studio with the SDK and a working JDK. For iOS native builds, use macOS with Xcode and CocoaPods.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Set `EXPO_PUBLIC_SUPABASE_URL` and either `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the legacy `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the approved public client values. Configure the gateway and web origin when testing features that use them. Values prefixed with `EXPO_PUBLIC_` can be read from the app bundle.
4. Run `npm run android` or `npm run ios` to launch a native development build. Use `npm start` to start Metro for development.

## Checks

```sh
npm run check
npm test
npm run build
npm run verify:release
```

`npm run build` exports the JavaScript bundles for Android and iOS. Use the native build tools to create an installable app.

## Standalone Android APK

On Windows, configure `JAVA_HOME` and `ANDROID_HOME`, then run from the repository root.

```powershell
npx expo prebuild --platform android
Set-Location android
.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64'
```

The APK is generated at `android/app/build/outputs/apk/release/app-release.apk`. It includes the app bundle and launches without Metro. Use the same signing certificate and a higher Android version code when distributing an update over an installed build. Keep APKs and signing files out of Git.

Earlier APK receipts refer to another machine; no historical APK was present in this checkout at M0 entry. Consult the [current M0 QA package](docs/mobile-redesign/M0-personal-qa.md) for actual build availability, configuration prerequisites and verification status. Build filenames and successful JavaScript exports alone do not establish an installable or tested app.

## Project notes

- [Mobile redesign contract and evidence index](docs/mobile-redesign/README.md) — current scope; supersedes earlier full-feature-parity backlog requirements.
- [Mobile implementation and verification status](docs/MOBILE_CATCHUP_SLICE.md)
- [Native build notes](docs/NATIVE_BUILD_AND_QA.md)
- [Manual mobile verification](docs/MANUAL_MOBILE_VERIFICATION.md)
