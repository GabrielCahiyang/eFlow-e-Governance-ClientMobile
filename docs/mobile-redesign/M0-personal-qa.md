# M0 Personal QA Package

Date: 4 November 2026, Asia/Singapore. Status: **IMPLEMENTED / AWAITING PERSONAL QA** for the contract/audit package. **M1 has not started. No user acceptance is recorded.** Native build/device/configuration gates are separate below.

Follow-up: the requested Android 16 QA emulator now has a verified x86_64 installation and native login launch. See [emulator evidence and APK](M0-emulator-qa.md). Initial build-time observations below remain historical; physical ARM64 and authenticated workflows are still unverified.

## What changed

**Current retest build:** the reported expired-gateway DNS error is addressed for the emulator in [M0 login-fix QA](M0-login-fix-qa.md). It includes a native error-message fix, an explicit local-gateway QA build, updated checks and a separate working-tree identity. The original runtime hashes/build results below describe the initial audit, before this user-requested bugfix. M0 still awaits personal acceptance.

Updated the mobile development contract from full web-feature replication to **shared backend contracts and business-rule parity, intentional mobile feature selection, and native mobile UX**. Audited current mobile and pinned canonical web source, classified v1 features, mapped all 40 legacy routes plus embedded views, specified role-based navigation/design/components, and established test/evidence/acceptance gates. Preserved the incoming lockfile edit and all native runtime/generated-core source.

Created in `docs/mobile-redesign/`: README, mobile-feature-scope, design-system, route-migration-map, phase-progress, implementation-plan, test-plan, source-comparison, this QA package, M0-baseline.json, M0-release-audit.json and M0-apk-verification.json. Raw command logs, temporary source extracts and per-file runtime hashes are ignored under `artifacts/M0/`.

Modified: root `AGENTS.md`, `README.md`, `.gitignore` (new native-module Gradle cache/build-output exclusions), and supersession notices in `docs/PORTING_STATUS.md`, `NATIVE_BUILD_AND_QA.md`, `MOTION_PARITY.md`, `MANUAL_MOBILE_VERIFICATION.md`, `MOBILE_CATCHUP_SLICE.md`, `REMAINING_PARITY_IMPLEMENTATION_2026-10-28.md`. Created ignored local `.env` containing only the approved project public URL and publishable key selected from the existing local web configuration; all other values excluded. No file retired. No interface or service contract changed. No push/merge/deployment, sign-in, live fixture creation or hosted operation was performed.

## Visual before/after for this phase

Before and after M0 the application is the same existing native interface: My Work/Workspaces/Inbox/permission-filtered Accounting/More, a larger desktop-like menu/sidebar, card-heavy work views, 12 project tabs and a broad budget workspace. M0 changes instructions/specifications only. The proposed after-design is five destinations, compact work rows, contextual task/branch inspectors and focused Accounting. It is specified in [design-system.md](design-system.md), **not implemented or visually verified**.

## Exact source identity

Baseline ID: `M0-2026-11-04-working-tree`; mobile `main` at `6d4f19fc1829e9470d8dca2de524a2041b93521d`, matching observed origin HEAD. The checkout was already dirty in package-lock.json: 90 deletions of optional-platform libc metadata. Its preserved SHA-256 is `534949216a0cd9e0902738f3aee24b71338d7060c18b019ed428755508036a22`.

Runtime/config/package source tree: 1,073 tracked files; SHA-256 `6daa07ae21ff88a6e38fd9112eb580baa6f9505217ee2d87f23e337cf7bc4409`. Excludes 353 already-tracked generated Android module build files. Algorithm, separate ignored public-configuration hash and artifact hashes are in [M0-baseline.json](M0-baseline.json). Native runtime source diff excluding the pre-existing lockfile edit is empty. Documentation is uncommitted; no new source commit was created. Exact-ref canonical web source is `b8d9fd8a7195b50fe7446b45092c9528586b0778`, with inspected Git blob IDs and comparisons in the baseline.

## Automated verification

| Command | Result | Local evidence |
| --- | --- | --- |
| `npm run check` | VERIFIED: TypeScript and 9 Metro exclusion checks pass | artifacts/M0/check.log |
| `npm test` | VERIFIED: 37 suites / 90 tests pass | Initial run; final JSON run below |
| `npm.cmd test -- --json --outputFile=artifacts/M0/jest-results.json` | VERIFIED: 37 suites / 90 tests, 7.614s final run | artifacts/M0/tests.log, jest-results.json |
| `npm run build:android` | VERIFIED: production Hermes JS export with prepared public configuration | artifacts/M0/export-android.log, dist/android |
| `npm run build:ios` | VERIFIED: production Hermes JS export with prepared public configuration | artifacts/M0/export-ios.log, dist/ios |
| `npm run verify:release` equivalent `node scripts/verify-native-release.mjs` | VERIFIED: three current bundles (Android/iOS exports and actual APK), zero development credential literals | artifacts/M0/release-audit.log; M0-release-audit.json |
| `npx expo prebuild --platform android --no-install` | VERIFIED: generated ignored Android project; no package.json change | artifacts/M0/prebuild-android.log |
| Android `:app:assembleRelease -PreactNativeArchitectures=arm64-v8a` | VERIFIED: standalone release assembly | artifacts/M0/assemble-release-final.log |
| `python scripts/verify-standalone-apk.py artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk` and signature/ABI checks | VERIFIED: current embedded source, non-debuggable, no dev launcher/menu, ARM64, signature valid | [M0-apk-verification.json](M0-apk-verification.json) |
| `adb devices -l` | No devices connected at audit; no install/launch | Local observation |
| Documentation integrity, `git diff --check`, lockfile SHA-256 comparison | VERIFIED: all 40 routes mapped, local document links resolve, no whitespace errors, entry lockfile preserved | Local source/document inspection; baseline hashes |

The PowerShell npm wrapper omitted JSON arguments in the initial test run; `npm.cmd` generated the final machine-readable test result. Tests were rerun for evidence capture, not because runtime code changed. Exports do not establish Android/iOS compilation, installation or workflows. Credential audit covers six known development credential literals in both final exports and the actual APK bundle; it is not a complete penetration test. Both exports were refreshed after preparing public configuration.

## Android artifact and build environment

**Installable baseline APK:** [eFlow-Mobile-M0-QA-arm64.apk](../../artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk). Built locally from the existing runtime, with an embedded Hermes bundle; Metro is not required. Full verification receipt: [M0-apk-verification.json](M0-apk-verification.json). This file is ignored by Git and available in this checkout only. No historical APK existed at entry.

| Field | Baseline value / requirement |
| --- | --- |
| Architecture | VERIFIED: arm64-v8a only |
| Build type | VERIFIED: release, non-debuggable, embedded Hermes bundle, no development launcher/menu |
| App/version | com.eflow.mobile, version 1.0.0, Android versionCode 5 (unchanged baseline) |
| Signing | VERIFIED signature; local Android debug certificate used by generated release configuration. QA only, not production signing. Certificate SHA-256: fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c |
| APK path / size / SHA-256 | `artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk`; 56,167,806 bytes; SHA-256 `99dd47a3f563a3e0fad18332ad169d87d8710820d093c86b327821b65bb6c38b` |
| Native toolchain | Windows; Node v22.17.0, npm 10.9.2, Temurin JDK 21.0.12, Expo ~58.0.19, RN 0.88.0 |
| Android dependencies | RN requests Gradle 9.4.1, AGP 9.2.1, compile SDK/build tools 37, NDK 27.1.12297006; platform 37.0 installed by Gradle after existing license acceptance; build tools 37.0.0, NDK 27.1 present |
| Public configuration | Missing at entry; prepared ignored .env from existing local web public URL/publishable key for the approved target. Configuration SHA-256: 19ac84626a28d6f3289ea1cd65d7296dd509b70cee1ee28e53330022b32f64c5. No server secrets/account credentials copied; hosted connection/sign-in NOT TESTED |
| Device evidence | No connected device/emulator; install, launch, screenshots and signed-in workflow NOT TESTED |

The first wrapper download was resumed and verified against the official Gradle 9.4.1 SHA-256 (`2ab2958f2a1e51120c326cad6f385153bb11ee93b3c216c5fccebfdfbb7ec6cb`). The next assembly failed after 21m58s on a Google Maven read timeout for `androidx.activity:activity:1.8.1`; the cached retry succeeded in 9m23s. Logs remain in `artifacts/M0/assemble-release*.log`. Dependency deprecation/manifest warnings were emitted; they did not fail assembly. Gradle also reported that the daemon would restart after exhausting its configured 512 MiB metaspace; this did not fail the build, and no memory setting was changed. No runtime or dependency version was changed to bypass warnings.

## Exact local standalone build instructions

Use the current checkout and preserve its dirty lockfile. Dependencies were already installed for M0; fresh environments use `npm ci`. Configure a JDK/Android SDK compatible with the pinned installed Expo/RN source. Obtain the pinned Gradle distribution and Android platform 37 via the approved SDK/toolchain installers; do not downgrade project versions to bypass a missing dependency.

For a fresh checkout, copy `.env.example` to ignored `.env` (preserve the public-only `.env` already prepared here) and set only approved **public** client values for `ixnfphgjyelhckjwjkdv`: public URL/key, optional public gateway and approved HTTPS web origin. Do not copy an entire web .env, server secrets, service-role keys, test account passwords or signing keys. Re-export/rebuild after public configuration changes because it is embedded at build time.

```powershell
Set-Location C:\Users\james\projects\eFlow-e-Governance-ClientMobile
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot'
$env:ANDROID_HOME = 'C:\Users\james\AppData\Local\Android\Sdk'
npx.cmd expo prebuild --platform android --no-install
Push-Location android
.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a' --console=plain
Pop-Location
New-Item -ItemType Directory -Force artifacts/M0 | Out-Null
Copy-Item android/app/build/outputs/apk/release/app-release.apk artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk
Get-FileHash artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk -Algorithm SHA256
python scripts/verify-standalone-apk.py artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk
& "$env:ANDROID_HOME\build-tools\37.0.0\apksigner.bat" verify --verbose --print-certs artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk
```

Run copy/verification only after Gradle reports BUILD SUCCESSFUL. `verify-standalone-apk.py` also writes historical-style receipts under docs; keep fresh phase receipts distinct and preserve prior evidence. Audit the actual APK's ABI, non-debuggable manifest, launch activity, absence of dev launcher/menu, embedded source and credential literals before calling it standalone. The build embeds the approved public URL/publishable key. Hosted connectivity, sign-in, optional gateway/web origin and credentials are not established by successful assembly.

## Installation on your Android phone

Transfer the verified phase-named APK above to an ARM64 phone and compare SHA-256. Open it from Files and permit installation from that source if Android requests it. Or enable USB debugging/connect the phone, confirm it appears in `adb devices`, then:

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r artifacts/M0/eFlow-Mobile-M0-QA-arm64.apk
```

The baseline remains versionCode 5 and uses a local QA certificate. If an installed app has another signing certificate or higher version, update installation may be rejected. Use a dedicated QA device/profile or the matching authorized signing context; do not uninstall an existing app or discard its drafts/data merely to force installation. Launch without Metro. ARM64 builds do not install on an x86_64-only emulator; produce a separately labeled x86_64 build when needed.

## Roles, fixtures and personal walkthrough

Read-only baseline inspection needs your authorized Head, Member and Accounting Staff test accounts plus accessible existing project/task/subitem and Office/personal workspace. Public client configuration is prepared; account access/fixtures were not supplied or exercised in M0. Signed-in steps remain BLOCKED pending those prerequisites and a device. No passwords belong here. Task/Subitem Lead and unrelated-actor fixtures are required for later phases. Do not approve real work, send messages, create projects, edit membership or execute finance during this baseline walkthrough.

Mark one result per row using Pass / Fail / Blocked and add device/build/context notes. Documentation rows can be reviewed without an APK; device rows require a verified artifact/configuration. Expected current behavior is baseline observation, not acceptance of a finished redesign.

| # | Your action | Expected result | Pass / Fail / Blocked; notes |
| --- | --- | --- | --- |
| 1 | Read feature scope and revised AGENTS.md | Work/evidence/reviews/context/focused finance retained; advanced desktop/Admin surfaces web-only; no security weakening | Pending |
| 2 | Review route map and per-role navigation | Head/Member Home–My Work–Inbox–Projects–More; Accounting My Work–Inbox–Accounting–Projects–More; all 40 old names mapped | Pending |
| 3 | Review design-system and screen/component plan | eFlow teal/Figtree/status identity; compact lists, focused details, depth-eight drill-down, theme/motion/accessibility specified | Pending |
| 4 | Review source comparison, especially direct subitem completion | Current canonical behavior governs; no invented approval stage or weakened parent/root review | Pending |
| 5 | Obtain/verify/install the M0 APK linked above | Matching SHA/ABI/signature; installs without replacing incompatible app data | Ready for personal install; no device connected during M0 |
| 6 | Cold launch with Metro stopped | Existing native startup/login appears; report any connectivity/configuration error; no redesign expected | Not tested |
| 7 | Sign in to each supported test role with prepared public config | Only authorized baseline destinations/data; record actual menu/tab behavior for comparison | Blocked pending accounts/device; connection not tested |
| 8 | Open an existing project, task and subitem, then back | Record actual title/context/tab/back behavior; report broken exact-node routing as baseline finding | Blocked pending prerequisites |
| 9 | Open current More and switch authorized Office/personal context | Record existing desktop menu and context changes; no new authority; do not create new workspace/project | Blocked pending prerequisites |
| 10 | Inspect available finance summary read-only | No release/payment/settlement mutation; unavailable backend remains unavailable | Blocked pending safe read access |
| 11 | Review test/build/platform gates and provide scope feedback | JS exports distinct from native/device/user acceptance; iOS remains pending | Pending |

## Limitations and captured media

The initial package captured no current native media. The follow-up [Android 16 native login screenshot and receipt](M0-emulator-qa.md) now verify emulator startup only. No iOS screenshot or recording was captured. Historical `docs/evidence/2026-10-28` files are RN Web previews; earlier emulator screenshots/APKs are not present here and are not republished as current proof. No native compilation/launch/workflow or hosted-capability outcome is inferred from historical documents.

Windows has no Mac/Xcode/iOS device track. Native iOS compilation and acceptance are BLOCKED; iOS JS export passed. Safe accounts, current hosted eligibility/finance capabilities, reachable gateway/push/AI and installed native SDK dependencies need separate evidence. NW11 reconciliation and all hosted mutations remain out of scope.

## Decisions and acceptance

1. Confirm the proposed mobile scope/navigation and native design specification, or identify changes before M1.
2. Current web source explicitly retires legacy subitem review discovery while mobile includes direct completion and parent final review. Confirm preserving the current backend/capability-driven flow; the brief's subitem review examples will apply only where actually supported, without adding a new server transition.
3. Identify safe test accounts/fixtures through an appropriate secure channel when ready. Public client configuration is prepared; a public gateway/web origin is still needed for features requiring those endpoints. No account credentials are requested in Git documents.

**Stop here.** If satisfied after review/personal testing, reply **“M0 accepted. Proceed to M1.”** Otherwise report failures/blocked items or requested contract changes; revisions stay within M0. Acceptance is yours and has not been inferred.
