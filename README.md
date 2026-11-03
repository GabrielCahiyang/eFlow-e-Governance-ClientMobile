# eFlow Mobile

eFlow Mobile is the Expo and React Native companion to eFlow Web for LGU Ormoc City. It supports Android and iOS for Heads, Members, and Accounting Staff. System administration is handled in eFlow Web.

The app includes projects, tasks and subtasks, My Work, approvals, Office Budget, cash workflows, and delivery analytics. It uses the same eFlow backend and account permissions as the web app.

## Local setup

1. Install Node.js and npm. For Android, install Android Studio with the SDK and a working JDK. For iOS native builds, use macOS with Xcode and CocoaPods.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the approved public client values. Configure the gateway and web origin when testing features that use them. Values prefixed with `EXPO_PUBLIC_` can be read from the app bundle.
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

The current local APK is `artifacts/latest mobile eflow andres bading.apk` (build 5). Physical-phone startup and signed-in workflows are pending manual verification.

## Project notes

- [Mobile implementation and verification status](docs/MOBILE_CATCHUP_SLICE.md)
- [Native build notes](docs/NATIVE_BUILD_AND_QA.md)
- [Manual mobile verification](docs/MANUAL_MOBILE_VERIFICATION.md)
