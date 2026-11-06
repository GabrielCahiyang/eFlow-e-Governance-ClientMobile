# M1 personal QA — navigation shell and design system

**Personal acceptance pending.** The user deferred provisioning. The Android emulator restored the provided `bplo.head@gmail.com` session. The app's Profile confirmed `head` in LEDIPO. Device checks used that existing session for read-only navigation. Fresh sign-in, Member and Accounting Staff device checks remain pending.

## What changed

The previous shell used Workspaces as a tab and presented a longer More menu with desktop-style groups. M1 has five stable bottom destinations per supported role, a workspace button in the native header and a shorter More menu with Profile and appearance settings. A child screen stays on the tab it came from. The workspace chooser shows the current Office or personal context, and a switch reloads the authorized context while retaining the active route and record IDs. A mismatch explains how to return to the record's workspace. The shell routes unsupported or denied destinations to an explanation or configured web handoff.

Shared buttons, rows, surfaces, text, loading and status treatments use the eFlow design tokens. The dark palette follows the web reference. The choice sheet uses the native Expo UI implementation on each platform. Existing transactional sheets retain their draft handling. The native stacks honor reduced motion, and the startup and sign-in motion remain in place. The tab bar exposes selection to screen readers and remains present on tablets.

| Area | Files |
| --- | --- |
| App shell | `NativeWorkspace.tsx` simplified, existing feature bodies moved to `MobileContent.tsx` |
| Navigation | Added `MobileNavigator.tsx`, `mobileScope.ts`, `MoreScreen.tsx`, `UnavailableDestination.tsx` and `src/platform/webHandoff.ts`. Updated `NativeBottomNavigation.tsx`, `nativeNavigation.ts` and `src/app/shared/routes.ts`. The old sidebar is no longer mounted from the shell. |
| Workspace and settings | Updated `WorkspaceProvider.tsx` for authorized selection, refresh and recovery. `SettingsScreen.tsx` accepts the Appearance entry. |
| Shared native UI | Updated `Appearance.tsx`, `theme.ts`, `Screen.tsx`, `Button.tsx`, `Typography.tsx`, `Status.tsx` and `loading/Skeleton.tsx`. Added `NavigationRow.tsx` and `SelectionSheet.tsx`. `LoginScreen.tsx` and `loginStyles.ts` resolve readable sign-in colors in both themes. |
| Packaging and checks | Added pinned `@expo/ui` in package and lock files. Android version code 6, iOS build number 4. Added or updated mounted navigation, workspace recovery, theme, bottom navigation, route resolution and web handoff regressions. |

The build uses the M1 working tree on base `6d4f19fc1829e9470d8dca2de524a2041b93521d`, including the accepted M0 login fix. Source identity `63a8b3d0411febfbe715ceed2ee48aaccc01aeb0cd16b60b8752fd028cd66b19`. [Source and export hashes](M1-source-identity.json).

## Build and verification

| Command or check | Result |
| --- | --- |
| `npm run check` | VERIFIED. TypeScript and all nine Metro exclusion checks passed. |
| `npm test` | VERIFIED. 43 suites, 129 tests. Mounted navigation used mocked actors. |
| `npm run build:android`, `npm run build:ios` | VERIFIED. Android and iOS Hermes JS exports. |
| Shared light and dark token contrast | VERIFIED for the 20 checked foreground/background pairs, minimum 4.64:1. This check covers the selected token pairs. |
| Android native release assembly | VERIFIED for ARM64 and x86_64. APK signature, embedded Hermes bytecode and current navigation/workspace source matched. |
| `npm run verify:release` with each APK bundle | VERIFIED. Both JS exports and each embedded APK bundle passed the development credential scan. No credential files are packaged. |
| iOS native compile, install and device workflows | BLOCKED. This host is Windows and no iOS device or simulator was available. |

Both APKs are standalone release builds for QA, version `1.0.0` (Android code `6`), signed with the local Android QA certificate. Certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

| APK | ABI, SHA-256 and evidence |
| --- | --- |
| [eFlow-Mobile-M1-QA-x86_64.apk](../../artifacts/M1/eFlow-Mobile-M1-QA-x86_64.apk) | `x86_64`, `ae68797394be1e5e2c7d666315846bedd53d7f71aff7b47693388f0af68c6531`. [Verification](M1-apk-x86_64-verification.json) · [Credential audit](M1-release-audit-x86_64.json). |
| [eFlow-Mobile-M1-QA-arm64.apk](../../artifacts/M1/eFlow-Mobile-M1-QA-arm64.apk) | `arm64-v8a`, `42b616c9ece08aae7597a232a3ffe1b216ea33b62f2e63b83444bf8f18cc8e88`. [Verification](M1-apk-arm64-verification.json) · [Credential audit](M1-release-audit-arm64.json). Phone installation and workflows pending. |

Use the x86_64 APK for the Android emulator and the ARM64 APK for an ARM64 phone. The device connects to the host's protected login gateway through USB or emulator ADB forwarding. That gateway is required for fresh sign-in because the published tunnel hostname currently fails DNS. [Local gateway setup](M0-login-fix-qa.md).

1. For a phone, enable USB debugging and connect it to the host PC. Use `adb devices` to identify the phone or emulator serial.
2. Install the matching APK with `adb -s <serial> install -r <path-to-APK>`. The emulator is already set up with the same QA signer. An existing build with a different signer requires a separate installation decision to preserve local data.
3. For fresh sign-in, start the local protected gateway using the linked setup, then run `adb -s <serial> reverse tcp:8322 tcp:8322`. Keep the ADB connection during testing. Launch eFlow normally and use the approved account in the role table.

## Role accounts and fixtures

Use a different dedicated account for each permanent role. Confirm role and Office in the signed-in app and record the actor email or ID, role, Office, device and outcome. Leave the password out of all records. Use read-only scenarios and approved fixtures. The second workspace may be an authorized personal workspace or another authorized Office workspace. For the project and return checks, use an existing approved project in that actor's workspace.

| Use this dedicated account | First tab and full tab order | Signed-in device status |
| --- | --- | --- |
| Head, `head`, appointed to an approved QA Office | **Home**, My Work, Inbox, Projects, More | VERIFIED for the listed read-only checks in the restored `bplo.head@gmail.com` session, LEDIPO. Fresh login and separate dedicated fixture pending. |
| Member, `member`, assigned to the QA Office | **Home**, My Work, Inbox, Projects, More | BLOCKED — dedicated actor and Office deferred |
| Accounting Staff, `accounting_staff`, assigned to the QA Office | **My Work**, Inbox, Accounting, Projects, More | BLOCKED — dedicated actor and Office deferred |

Admin is web-only. For later phases, prepare separate worker, Lead and Reviewer actors plus a second Office when authorized. Lead and Reviewer checks use contextual appointments and existing server rules.

| Android emulator check | Actor and result |
| --- | --- |
| Cold launch and session restore | VERIFIED, Android 16 API 36, `eFlow_M0_QA`, x86_64. Restored `bplo.head@gmail.com`, `head`, LEDIPO. |
| All five Head destinations, More → Profile, system Back | VERIFIED for the restored Head. Profile displayed the server-loaded account role and Office. Back returned to More with More selected. |
| Authorized Office/personal switch and project return | VERIFIED for the restored Head. The chooser listed LEDIPO and personal `Test1`. Changing context while viewing the Office project hid its body, retained Projects selection and restored the same project on switching back. System Back returned to the list. On the final APK, Close was visible at half height and dismissed the chooser with the Office still selected. |
| Dark mode, 150% Android text and reduced system animations | VERIFIED for the restored Head's More screen and tab bar. The original Android settings were restored. This is a combined device smoke check. |
| Landscape and keyboard | VERIFIED for the restored Head. Android rotated the shell to 2340×1080, Projects search opened the keyboard, and Back dismissed it. |
| Reports route without a configured web origin | VERIFIED for the restored Head. The route displayed a web explanation and a back path while Home remained selected. The configured browser handoff still needs device exercise. |
| Member and Accounting Staff tabs, More, Back and Profile | BLOCKED on device. Mocked role navigation passed in the automated suite. |
| Fresh sign-in, signed-out keyboard, actual screen reader and iOS native workflow | BLOCKED or NOT TESTED. Protected sign-in validation and roles were exercised in automated tests. |

## Personal checklist

Repeat steps 2–9 for **each** of the three actors above. Record Pass / Fail / Blocked and a short note for any failure.

| # | Actor | Action | Expected result | Your result |
| --- | --- | --- | --- | --- |
| 1 | Signed out | Install the APK for the device and launch eFlow. Focus each field, show and hide the password, then dismiss the keyboard. | Branded login loads. The keyboard and system Back work and sign-in stays reachable. | ☐ Pass ☐ Fail ☐ Blocked |
| 2 | Each role | Sign in through the normal eFlow flow. Check the initial tab and all five tabs. | Tab order and initial selection match the role table. The active tab is highlighted and announced as selected. | ☐ Pass ☐ Fail ☐ Blocked |
| 3 | Each role | Open More, then Profile. Verify the account and Office, then use Back. | Profile belongs to this actor. More stays selected and Back returns to its menu. | ☐ Pass ☐ Fail ☐ Blocked |
| 4 | Each role | Open a permitted secondary item from More, go back, then switch tabs. | Available More items open with a back path. Admin and desktop planning links stay out of the primary tabs. | ☐ Pass ☐ Fail ☐ Blocked |
| 5 | Each role with a project | Open Projects and an authorized project. Move to Inbox and back to Projects, then use Back. | Projects remains the owning tab for its child. The project returns when switching back and Back returns to the Projects list. | ☐ Pass ☐ Fail ☐ Blocked |
| 6 | Each role with two contexts | Open the workspace chooser. Check selected state, cancel once, then choose the other authorized workspace. | Office and personal options are labeled. Cancel leaves context as-is. Selection updates the header and Projects data. | ☐ Pass ☐ Fail ☐ Blocked |
| 7 | Each role with two contexts and a project | Switch while viewing the first workspace's project, then switch back. | The other context shows a useful mismatch state without stale project data. The original project and selected tab resume on return. | ☐ Pass ☐ Fail ☐ Blocked |
| 8 | Each role | In More → Appearance, try Light, Dark and Use device setting. Relaunch, increase font size, enable reduced motion and repeat navigation. | Theme preference persists. Text stays readable, controls stay reachable and reduced motion removes decorative stack movement. | ☐ Pass ☐ Fail ☐ Blocked |
| 9 | Each role | Check the workspace sheet and More with a screen reader, rotate to landscape, then sign out. | Focus reaches labeled actions and selection state, dismiss returns to the app, and sign out returns to login. | ☐ Pass ☐ Fail ☐ Blocked |

## Open acceptance items

- Confirm the actual role and Office of each dedicated QA account when account testing resumes. A second authorized context and a safe project are needed for the corresponding scenarios.
- iOS compilation and device testing require macOS/Xcode and an iOS simulator or device. Repeat the role and accessibility checklist independently on iOS.
- The shell retains route identifiers. M2/M3 still own end-to-end exact work and branch inspectors. Older embedded project, accounting and communication screens retain their existing content pending their scoped redesign. M5 owns focused finance and any installed server prerequisites.
- Review the M1 package and record acceptance before starting M2.

## Emulator captures

- [Home](../../artifacts/M1/emulator-home-light.png) and [More with dark mode and 150% text](../../artifacts/M1/emulator-more-dark-large-text.png).
- [Workspace chooser](../../artifacts/M1/emulator-workspace-chooser.png), [personal-context mismatch](../../artifacts/M1/emulator-workspace-mismatch.png) and [restored Office project](../../artifacts/M1/emulator-project-restored.png).
- [Project search keyboard](../../artifacts/M1/emulator-project-search-keyboard.png) and [landscape shell](../../artifacts/M1/emulator-head-landscape.png).
- [Reports web explanation](../../artifacts/M1/emulator-web-destination.png).
