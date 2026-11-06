# M0 login connection fix — Personal QA follow-up

4 November 2026, Asia/Singapore. **IMPLEMENTED / AWAITING PERSONAL QA. M1 has not started.** This follow-up supersedes the earlier emulator APK for login testing. Original baseline receipts remain historical.

## Cause and actual changes

The approved project's public routing RPC returns a retired Cloudflare Quick Tunnel hostname that fails DNS on Windows as well as Android. The app correctly requires the checked eFlow gateway for sign-in; direct Supabase password sign-in would bypass account protection and was not substituted.

For this emulator test, the existing local gateway runs on this PC at 127.0.0.1:8322 and reaches the sole approved project. Its login router/service Git blobs match canonical web commit b8d9fd8a7195b50fe7446b45092c9528586b0778 (router d158cb5de7ebed5fb6c7c7e0d2aba8a12162c1ee; service a7ac0b396e64a09de5d10c7d42300a7d4ca401b9). Private keys remain in the server's existing configuration. Its unrelated PDS document worker is disabled through EFLOW_PDS_WORKER_ENABLED=false; no web/server source was changed. No new tunnel, public publishing or hosted setting write was performed.

The QA APK explicitly embeds http://127.0.0.1:8322 and uses adb reverse to reach the PC. The opt-in Android network policy permits HTTP only to 127.0.0.1 and denies other cleartext traffic. Normal prebuild removes this QA policy; normal Android/iOS JS exports retain published discovery. This emulator APK depends on the local gateway and ADB forwarding; it is not a deployable public-gateway fix or a phone build.

Native login now replaces DNS/network/timeout diagnostics with a useful connection message, retains entered fields after request failure and allows a deliberate retry. Server account/lockout messages and single-request behavior remain intact. No generated web-core source was edited.

Source changes: app.json (opt-in plugin registration), plugins/withLocalGatewayQa.js, authentication/loginError.ts, useNativeLogin.ts, LoginScreen.test.tsx and tests/__tests__/localGatewayQa.test.js. Documentation/evidence adds this package, fix baseline, APK receipt and release audit, plus pointers in the main M0 package/index/tracker. No source was retired. No visual redesign was performed; only connection-error text changes.

## Exact source and artifact

- Working-tree identity: M0-login-fix-2026-11-04-working-tree; main at 6d4f19fc1829e9470d8dca2de524a2041b93521d. No new commit/push/deployment.
- Source/test/config/script tree SHA-256: faeea3a36aa33fa1fde83dd9756938650daed743a0f779a1483079eec6f68443; exact algorithm/file hashes in [fix baseline](M0-login-fix-baseline.json).
- Original dirty package-lock.json remains byte-identical: 534949216a0cd9e0902738f3aee24b71338d7060c18b019ed428755508036a22.
- [Corrected emulator APK](../../artifacts/M0/eFlow-Mobile-M0-QA-login-fix-x86_64.apk), 60,857,493 bytes, x86_64 release, non-debuggable, embedded Hermes, no Metro/dev launcher/menu.
- Version 1.0.0 / versionCode 5; local QA Android debug certificate; signer SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
- APK SHA-256: 9404e142246f3f2ecad75b98a3ecc13dc50cb58232673823f6be91d85a517150.
- [Artifact/source/signature/launch receipt](M0-login-fix-apk-verification.json); [credential audit](M0-login-fix-release-audit.json).

## Verification

| Check | Result / evidence |
| --- | --- |
| npm run check | VERIFIED: TypeScript + 9 Metro exclusions; artifacts/M0/login-fix-check.log |
| npm test | VERIFIED: 38 suites / 97 tests; artifacts/M0/login-fix-tests.log and login-fix-jest-results.json |
| Meaningful regression cases | DNS/network/timeout messages, draft retention, one request/no auto retry, lockout decision, exact local-QA opt-in and normal-policy removal |
| Both native JS exports | VERIFIED, normal published routing; artifacts/M0/login-fix-export-android.log and login-fix-export-ios.log |
| Android native build | VERIFIED x86_64 release; artifacts/M0/login-fix-assemble-x86_64.log |
| Actual APK | VERIFIED signature, ABI, current embedded startup sources, no dev launcher/menu, no env/key files; local policy and embedded gateway inspected |
| Credential audit | VERIFIED: 3 current bundles, zero known development credential literals |
| Device → gateway | VERIFIED on emulator-5556: health 200, empty login payload 422, protected Admin read 401; no credentials submitted |
| Install / launch | VERIFIED on eFlow_M0_QA Android 16 / API 36; app remains foreground at native login |
| Actual sign-in / actor workflows | NOT TESTED by agent; user retry required |
| iOS native / physical ARM64 | NOT TESTED; Mac/Xcode/device unavailable; older phone APK has no local-gateway fix |

## Your retest

The corrected APK is already installed and open in the dedicated eFlow_M0_QA emulator. No uninstall or data wipe was used. It keeps versionCode 5 and the same QA signer. Re-enter your authorized test credentials after the restart. Do not repeatedly retry an account/lockout rejection; its server decision is authoritative.

| Action | Expected result | Pass / Fail / Blocked; notes |
| --- | --- | --- |
| Confirm emulator is eFlow_M0_QA and eFlow is open | Existing native login screen, no raw Java error on launch | Pending |
| Sign in once using your authorized test account | Request reaches the existing checked gateway; authorized session opens or a meaningful server decision appears | Pending |
| If sign-in is denied/locked | Preserve the exact decision; no bypass or automatic repeated password submission | Pending |
| If connection is unavailable | Clear connection message; fields retained; button enabled for a deliberate retry | Pending |
| Continue the baseline read-only walkthrough in M0-personal-qa.md | Record actual role/navigation/context behavior; redesign is still pending | Pending |

Actual native login screenshot: [login-fix-emulator-login.png](../../artifacts/M0/login-fix-emulator-login.png). It is Android emulator evidence, not RN Web. No screenshot/recording of a signed-in account was taken.

## Reopen or rebuild this local QA setup

Keep the gateway process and emulator running. If ADB/emulator restarts, re-establish forwarding with:

~~~powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" -s emulator-5556 reverse tcp:8322 tcp:8322
& "$env:ANDROID_HOME\platform-tools\adb.exe" -s emulator-5556 shell am start -n com.eflow.mobile/.MainActivity
~~~

To restart only the gateway, use its existing private environment/configuration; never copy a server key to mobile. From the sibling web server directory:

~~~powershell
$env:EFLOW_PDS_WORKER_ENABLED='false'
& .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8322
~~~

To rebuild this explicitly labeled emulator QA APK from mobile root:

~~~powershell
$env:EFLOW_LOCAL_GATEWAY_QA='1'
$env:EXPO_PUBLIC_EFLOW_GATEWAY_URL='http://127.0.0.1:8322'
npx.cmd expo prebuild --platform android --no-install
Push-Location android
.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=x86_64' --console=plain
Pop-Location
# Only after BUILD SUCCESSFUL:
Copy-Item android/app/build/outputs/apk/release/app-release.apk artifacts/M0/eFlow-Mobile-M0-QA-login-fix-x86_64.apk
& "$env:ANDROID_HOME\platform-tools\adb.exe" -s emulator-5556 install -r artifacts/M0/eFlow-Mobile-M0-QA-login-fix-x86_64.apk
Remove-Item Env:EFLOW_LOCAL_GATEWAY_QA
Remove-Item Env:EXPO_PUBLIC_EFLOW_GATEWAY_URL
~~~

Do not reuse the ignored generated QA manifest for an ordinary release. Run normal prebuild without those overrides to remove the local QA policy. This was done after packaging the delivered APK. Keep prior APK receipts separate when running the existing verifier, which writes historical-style filenames.

The public routing hostname still needs a reachable deployed gateway maintained by its owner before ordinary phone builds can sign in through discovery. Hosted configuration/schema/RLS/accounts/migrations and financial operations were unchanged. No account password from the user's screenshot was replayed. Scope questions remain in the main M0 package; this bugfix does not accept M0 or authorize M1.
