# M7 personal QA — final streamlined app

**Personal acceptance pending.** This package records M7 verification separately from M0–M6 implementation and past QA. The Android package is signed for local QA.

## Latest standalone APK — build 41

[Download Android APK 41](../../artifacts/M7/eFlow-Mobile-M7-Subtasks-Projects-v41-arm64-x86_64.apk). It uses the same QA certificate as build 40 and supports upgrades with existing app data. [Changes and role-by-role checklist](#subtasks-project-tables-and-role-priorities).

## Previous standalone APK — build 32: Lottie folder and stable tab highlight

[Download Android APK 32](../../artifacts/M7/eFlow-Mobile-M7-Latest-v32-arm64-x86_64.apk). The refresh indicator uses a bundled LottieFiles folder, and the selected tab stays in place during workspace rechecks.

[Personal steps and verification](M7-lottie-refresh-qa.md).

## Previous standalone APK — build 31: Folder replaces the system spinner

[Download Android APK 31](../../artifacts/M7/eFlow-Mobile-M7-Latest-v31-arm64-x86_64.apk). The folder is the pull-to-refresh indicator from the initial drag through loading. It appears above the content as the list moves down, leaving the My Work cards visible.

[Personal steps and Android emulator evidence](M7-folder-refresh-replacement-qa.md).

## Previous standalone APK — build 30: Folder pull-to-refresh

[Download Android APK 30](../../artifacts/M7/eFlow-Mobile-M7-Latest-v30-arm64-x86_64.apk). Pull and release on a refreshable screen to see the eFlow folder. The page moves while the refresh runs and stays still with Reduce Motion.

Test Home, My Work, Inbox and Projects, then repeat after panning the project table sideways. [Personal steps and Android emulator evidence](M7-folder-refresh-qa.md).

## Previous standalone APK — build 29: Sliding tab highlight and filled icons

[Download Android APK 29](../../artifacts/M7/eFlow-Mobile-M7-Latest-v29-arm64-x86_64.apk). The circular highlight glides between tabs while the selected icon fills and settles. Inbox adds a short bell ring. Reduce Motion gives immediate selection feedback.

Tap adjacent and distant tabs, then repeat quickly and with Reduce Motion enabled. [Motion QA checklist](M7-navbar-motion-qa.md).

## Previous standalone APK — build 28: Pinned Task column and navigation polish

[Download Android APK 28](../../artifacts/M7/eFlow-Mobile-M7-Latest-v28-arm64-x86_64.apk). Main table keeps the Task column visible while the other columns scroll. The toolbar blends into the page, Home Workspaces matches Recently visited, and bottom tab icons respond to presses and selection.

With an authorized account, open Main table and swipe to Office, tap a pinned task, check both Home themes, and switch tabs with and without Reduce Motion. [Screenshots and personal checklist](M7-pinned-table-and-navigation-qa.md).

## Previous standalone APK — build 27: Web catch-up

[Build 27 changes and verification](M7-web-catch-up-2026-11-09.md).

## Previous standalone APK — build 26: Navigation clearance and Activity labels

[Download Android APK 26](../../artifacts/M7/eFlow-Mobile-M7-Latest-v26-arm64-x86_64.apk). The navigation bar has its own space across all tabs and their detail screens. Task Activity displays capitalized headings with “Subitem” terminology. Funding setup has a compact web handoff.

With an authorized account, scroll to the end of each tab and the Activity and subitem screens from Projects. Check that the final entry or action clears the bar. [Screenshots, verification and personal checklist](M7-navbar-activity-qa.md)

## Previous standalone APK — build 25: Project table, archived projects and Inbox position

[Download Android APK 25](../../artifacts/M7/eFlow-Mobile-M7-Latest-v25-arm64-x86_64.apk). Install it over your existing standalone build.

The Office project list now supplies the refresh state React Native requires. Main table shows a horizontal grid with group colors, column headers and status cells. Inbox is fourth for every supported role.

Use your authorized Head or Member account to reopen the archived project you were viewing. Check the read-only notice, swipe to Owner, Due date and Office, then open a task and return. Any supported role can check the fourth icon. [Screenshots, verification and personal checklist](M7-project-table-qa.md).

## Previous standalone APK — build 24: Favorites carousel and frosted Recently visited

[Download APK build 24](../../artifacts/M7/eFlow-Mobile-M7-Latest-v24-arm64-x86_64.apk). Install over your current standalone APK without uninstalling or clearing data.

My favorites returns to the rounded eFlow gradient carousel with a central plus tile, side peeks and actual page dots. Its native sheet immediately shows searchable authorized workspaces and stars, with no intermediate Add/Done step. Stars give immediate fill feedback and a brief pop/tilt, respecting reduced motion. Recently visited in light mode uses a uniform frosted tint and sheen without the old white center patch. Search expands the native sheet to keep the query and results above the Android keyboard. No screen destination, backend contract, permission or financial operation changed.

**VERIFIED:** TypeScript/9 Metro checks; 238 tests in 77 suites; separate Android/iOS production JS exports; Android release compile, source/signature/credential checks and standalone logged-out installation/launch on isolated API 36/x86_64. Offline native component previews verify Home light/dark, carousel proportions, direct list, star checked state and search above the keyboard. These fixtures have no server-confirmed actor/role. **BLOCKED:** signed-in emulator workflows without approved dedicated actors/fixtures. **NOT TESTED:** personal phone acceptance, physical release-device animation feel, native iOS, TalkBack/VoiceOver and large text for this update.

[Before/after inventory, actual screenshots and step-by-step personal checklist](M7-favorites-material-qa.md). [APK receipt](M7-latest-v24-apk-verification.json), [credential audit](M7-latest-v24-release-audit.json). SHA-256: `351e051d4fcf562f034915b74f9c66f4a9c80131b9f738a73966b0a6f675d0c0`. M7 remains pending explicit user acceptance.

Quick personal check: use your existing authorized Head or Member account for Home; any supported role can inspect the Workspaces picker. Open Favorites, search, star/unstar without changing workspace, close and swipe through actual favorite tiles, restart to check persistence, and inspect light/dark and reduced motion. No new account is needed for these local preferences/read-only checks. Account-isolation and consequential workflows still require separately approved dedicated actors and safe fixtures; never Admin.

## Previous standalone APK — build 23: Home, Workspaces and filters

[Download APK build 23](../../artifacts/M7/eFlow-Mobile-M7-Latest-v23-arm64-x86_64.apk). Install over your current standalone APK without uninstalling or clearing data.

Home now uses the toolbar for the profile/greeting, a Workspaces row in place of the large attention area/duplicate shortcuts, and actual local workspace favorites with a native add/remove sheet. My Work no longer uses a floating “+” as a filter; date cards toggle filters with visible selected chips. Projects uses a compact filter beside search with an explicit status and result count. No new task/financial creation capability or hosted change was introduced. Existing personal-project task creation remains subject to eligibility and server rules.

**VERIFIED:** TypeScript/9 Metro checks; 235 tests in 75 suites; both production JS exports; Android release compile, signature, source/entry matching and three-bundle credential audit. The standalone APK installed and launched logged out on isolated Android API 36/x86_64. Native offline component previews cover Home light/dark, large text and the Favorites sheet; they do not establish authenticated role or workspace authorization. **BLOCKED:** signed-in emulator workflows without approved dedicated actors/fixtures. **NOT TESTED:** personal phone acceptance, iOS native, TalkBack/keyboard and native My Work/Projects visual acceptance.

[Before/after inventory, screenshots and personal checklist](M7-workspaces-filters-qa.md). [APK receipt](M7-latest-v23-apk-verification.json), [credential audit](M7-latest-v23-release-audit.json). SHA-256: `45fa513265a6d05e7d1ba9050abc2a7781f373575107c3bec0ba72f1bd62d958`. M7 remains pending explicit user acceptance.

## Previous standalone APK — build 22: quiet refresh

[Download APK build 22](../../artifacts/M7/eFlow-Mobile-M7-Latest-v22-arm64-x86_64.apk). Install over your existing standalone APK without uninstalling or clearing data.

Build 22 removes the Updating progress notice and keeps the native refresh circle for a user’s pull only. Previously, Home’s 30-second background checks and live work updates used the same indicator flag, which made the circle appear while the phone was untouched. Automatic reads now remain silent; cached content, first-load skeletons, account verification, authorization gates and connection-error Retry are retained.

No screen or navigation entry was added or removed. Shared screens, Home, My Work, Inbox, Projects and authorized detail/Accounting screens use the corrected manual-progress behavior. No hosted change or business operation was introduced. [Before/after inventory and personal checklist](M7-silent-refresh-qa.md).

**Build verification:** 229 tests in 72 suites and TypeScript/9 Metro checks pass; Android and iOS production JavaScript exports pass. Android release compilation, non-debuggable packaging, signature and embedded-source checks passed (167 native files); three production bundles passed the credential audit. The APK upgraded build 21 and launched on the isolated Android API 36/x86_64 emulator; logged-out light/dark screens were inspected. [APK receipt](M7-latest-v22-apk-verification.json), [credential audit](M7-latest-v22-release-audit.json). Signed-in idle/pull behavior remains **BLOCKED** for emulator workflow verification without an approved dedicated actor-role/fixture mapping; personal phone and iOS native acceptance are **NOT TESTED**.

Use your existing authorized Head, Member or Accounting Staff account for read-only checks: leave the loaded app untouched for 90 seconds, pull once, then switch apps and return. Expect no automatic circle or Updating toast; expect the native circle while the manual pull is pending. No new QA account is needed just for that inspection. SHA-256: `d82b68c6664d6c717b8ab4f39d8f3ec25c8c250bcfd260114e322e8a07b5b980`. M7 acceptance remains pending.

## Previous standalone APK — build 21: app resume and caching

[Download build 21](../../artifacts/M7/eFlow-Mobile-M7-Latest-v21-arm64-x86_64.apk). Install over your previous standalone APK without uninstalling or clearing app data. The user authorized this rebuild. No hosted configuration or business contract changed.

Ordinary app switching retains the current workspace and its local state. Account access refreshes in the background; a compact Updating notice appears only for a slower check. A connection failure retains readable same-account content with Retry while new consequential attempts remain blocked. Branded startup remains appropriate for cold launch or process recreation. The opt-in work/notification display cache now has a 30-second freshness window within five-minute RAM retention. Manual refresh, Realtime updates and authoritative action checks remain available. No screen or navigation entry was added or removed.

| Build 21 check | Result |
| --- | --- |
| TypeScript / Metro / automated regressions | **VERIFIED**: 9 Metro checks; 226 tests in 71 suites. |
| Android release compilation and package/source checks | **VERIFIED**: version 21, ARM64/x86_64, non-debuggable embedded bundle; 166 native sources match; same local QA signer as prior phone builds. |
| Android/iOS production JS exports and credential audit | **VERIFIED**: separate exports, three audited production bundles including the APK. iOS export is not iOS native verification. |
| Fresh standalone Android install / launch / light and dark login | **VERIFIED**: new isolated API 36/x86_64 emulator with sufficient storage. Logged-out text survived a background/foreground cycle. No account or hosted mutation. |
| Signed-in Android task/draft/scroll preservation, offline gate and role/Office changes | **BLOCKED** for emulator workflow verification: approved dedicated actor-role/fixture mapping unavailable. Automated mock tests pass; they are recorded separately. |
| Personal phone acceptance / iOS native / native accessibility and signed-in notice layout | **NOT TESTED**. |

Use the [step-by-step resume/cache checklist](M7-resume-cache-qa.md). You can do its read-only phone checks with your existing authorized Head, Member or Accounting Staff account; a new account is not required just to switch apps and inspect the UI. Use separately approved dedicated actors/fixtures for saves, reviews, financial operations or deliberate access changes. Do not use Admin.

[APK verification](M7-latest-v21-apk-verification.json), [credential audit](M7-latest-v21-release-audit.json). SHA-256: `4a6626048a41b312e24283300d98b23e79f59b3f4a73d54b4c08cce3705becfc`. M7 remains pending explicit personal acceptance.

## Before and after

| Surface | M6 baseline | M7 candidate |
| --- | --- | --- |
| Head and Member navigation | Home, My Work, Inbox, Projects and More | Same destinations |
| Accounting Staff navigation | My Work, Inbox, Accounting, Projects and More | Same destinations and finance scope |
| Task, project and account experience | Focused inspectors, authorized records, compact lists and contextual web handoffs | Same screens and navigation entries. An older finance notice can open the exact linked subitem funding record when the authorized task data confirms a unique match. |
| Android packaging | M6 QA build 12 | M7 tethered QA build 14 and phone build 29, ARM64 and x86_64 |

M7 makes zero feature-scope changes. No mobile screen or navigation entry was removed. The initial M7 workflow fix was a contextual recovery action for older financial notices; subsequent sign-in repairs are recorded below. Build 13 reproduced the defect. Build 14 contains the fix. The app searches its existing authorized data for the exact request, release or liquidation within the linked task. Ambiguous, unrelated or unavailable records remain unavailable. [M6 before/after inventory](M6-personal-qa.md)

## Install and walk through

### Previous standalone APK - build 20

Updated **6 November 2026, Asia/Singapore**. The user explicitly requested the latest APK, releasing the prior packaging hold. [Download build 20](../../artifacts/M7/eFlow-Mobile-M7-Latest-v20-arm64-x86_64.apk). Install it over build 19 without uninstalling or clearing data. M7 acceptance remains pending.

This standalone package contains the previously queued receipt-review note layout, Home surface correction, native illustrated empty states, content-specific skeletons, plain error feedback, slow sign-in guidance, and scoped display caching. It also filters expected connection diagnostics from React Native's development LogBox and adds safe-area clearance to startup/account-access error screens. The release APK itself is non-debuggable, embeds its JavaScript and does not require Metro. Head/Member/Accounting destinations and backend contracts are unchanged. The filter does not suppress the app's plain connection error or change account lockout/permission decisions; it does not fix an underlying DNS outage.

**Why the bottom banner was still visible:** the Supabase Auth library called `console.error` for a failed host lookup. React Native's development LogBox displayed that console diagnostic separately from the app's translated error panel. The new development filter recognizes expected network/host/timeout failures without replacing console logging or hiding programming errors. Other development warnings can still appear while running a debug build. Install the standalone release to test the actual phone experience.

| Build 20 check | Result |
| --- | --- |
| Android release compilation | **VERIFIED**: ARM64 and x86_64, version code 20. |
| APK / source / signing | **VERIFIED**: non-debuggable, embedded release bundle, 164 native sources match current files, same local QA signer as build 19. No local gateway override or credential file packaged. |
| Automated checks | **VERIFIED**: TypeScript/Metro, 214 tests in 68 suites; separate Android/iOS production JS exports. |
| Credential audit | **VERIFIED**: both exports plus the embedded APK bundle, three bundles total. [Audit receipt](M7-latest-v20-release-audit.json). |
| New standalone install / launch | **BLOCKED**: isolated read-only Android 16/API 36 test emulator has insufficient storage (about 342 MB available). Both install attempts were rejected before launch. The existing user development emulator was not replaced. |
| Real phone / iOS native / role-specific workflows | **NOT TESTED** for this APK. Use the role checklists below and the linked content-state/message inventories. |

[APK verification](M7-latest-v20-apk-verification.json). SHA-256: `b15b0b93f58ef79c43df6ce9a6d2ed7e02149863b42851aa2b2ee8121440b5c0`.

Personal quick check (your approved Head or Member account; Accounting Staff for finance):

1. Install build 20 over build 19, launch eFlow directly, and check normal sign-in with your own credentials entered privately. This package should not ask for Metro or show React Native debug bars.
2. With a slow/disconnected connection, verify the waiting/connection message. Reconnect and retry once. A failed connection must not appear as a wrong-password or successful sign-in result.
3. Inspect Home / Recently visited in light and dark mode. Check illustrated empty states, useful Clear filters / Refresh actions, matched content skeletons, and Remove animations / Reduce Motion.
4. Visit My Work and Inbox, then revisit under a slow connection. Last-read display content must be labeled while it updates. Sign out or switch approved accounts and verify the previous actor's content disappears.
5. For the retained financial UI, use Accounting Staff and authorized safe read fixtures to inspect receipt notes, final action clearance and independent-review restrictions. No consequential write is authorized by this visual checklist.

The following sections retain the historical source-stage evidence. Their earlier references to build 19 and the APK hold describe the stage before the user's build-20 request; the queued code is now included in build 20.

### Pending source change - plain feedback and connection recovery

Updated **6 November 2026, Asia/Singapore**. [Message and cache inventory, limits and personal checklist](M7-messages-cache-qa.md). Login uses plain connection/account guidance and an eight-second waiting notice. Shared feedback hides raw service details. Display-only work/notification caching is bounded, memory-only and account-scoped; authorization and financial execution remain freshly checked. This is queued source, **not included in build 19**. The existing APK hold remains; M7 acceptance is pending.

Validation **PASSED**: TypeScript/Metro, 212 tests in 67 suites, Android/iOS production JS exports and the two-export credential audit. Android light/dark evidence is an isolated native feedback-component preview; no credentials or account mutations were used. Real-account connection/cache acceptance remains **BLOCKED** by missing approved accounts/fixtures; iOS native and personal device acceptance remain **NOT TESTED**.

### Pending source change - Home surfaces, empty states and content skeletons

Updated **6 November 2026, Asia/Singapore**. These changes are in source and the local Metro development session. **Build 19 does not contain them.** The existing instruction to hold new APKs until an explicit request remains in force. M7 personal acceptance remains pending.

See [the content-state inventory, evidence and personal checklist](M7-content-states-qa.md). Home now uses one opaque themed surface for Recently visited. Decorative stars and pagination dots without actions were removed from that card; project/workspace navigation remains. Shared empty states use native eFlow illustrations, optional gentle movement, useful existing actions and reduced-motion/background handling. Retained content regions select skeletons matching lists, grouped work, updates, inspectors, summaries, files, conversations and forms.

Android evidence comes from an **offline native component preview on the existing debug build**, using the real shared controls and the extracted Home card with safe local display data. It establishes rendering only. The emulator is signed out; authenticated page transitions and actual loading-to-data recovery are **BLOCKED** by the missing approved session/fixtures. No sign-in was bypassed, backend data changed or new APK assembled. iOS native rendering and personal device acceptance remain **NOT TESTED**.

Source checks **PASSED**: TypeScript/Metro, 199 tests in 65 suites, both native JS exports and the two-export release credential audit. The preview covered light/dark, twenty loading layouts, compact empty artwork, reduced motion and 150%/200% font scaling. These component results do not establish authenticated workflow acceptance.

### Pending source change — receipt review-note layout

Updated **6 November 2026, Asia/Singapore**. The user reported the cluttered Cash request receipt-review section and explicitly requested **no new APK until their command**. This change is queued in source; **build 19 does not contain it**. Do not assemble/package an updated APK for this or subsequent queued changes until the user explicitly requests it. M7 acceptance remains pending.

The settlement-blocked view now consolidates the overlapping guidance into one warning while preserving the independent Accounting Officer requirement and the distinction between review approval, settlement and journal-posting authority. The shared review-note form appears with the existing available actions; a blocked settlement still permits the separately authorized independent review. The note has a short label, multiline top-aligned input, and a required-note hint, and precedes its action controls. Long decision buttons stack vertically. The same draft survives a temporary loss/recovery of available review context. Cash request and assigned-review screens add safe-area-aware bottom scroll clearance for the floating navigation.

Source validation **PASSED**: TypeScript/Metro (nine exclusions), 193 tests in 62 suites, separate Android/iOS JS exports and the two-export credential audit. No APK build/install, live financial mutation or Android/iOS workflow acceptance was performed for this queued change. Native font scaling, keyboard, screen-reader, theme and reduced-motion checks remain **NOT TESTED** for this source revision. [Export audit](M7-review-note-source-release-audit.json)

When the user authorizes the next APK, use these personal scenarios:

| Approved actor required | Scenario |
| --- | --- |
| Accounting Staff, blocked package with no eligible settler or review action | One settlement warning; no unused note editor; no settlement or journal action becomes available. |
| Assigned independent reviewer, with settlement blocked | Review note and review decision controls remain available under the existing server capability; settlement remains blocked. Required-note validation remains in force. |
| Task Lead / authorized Office Head / Accounting Staff with their respective current action | Note precedes the appropriate endorsement, late authorization or settlement controls; long labels remain readable; actions are distinct and preserve existing contracts. Use safe fixtures only for writes. |
| Each supported permanent role, Android and iOS separately | At small phone width and 150%/200% text, scroll the note and final action clear of navigation. Check keyboard focus/dismissal, light/dark, reduced motion and accessibility. |
| Authorized reviewer, interrupted reads | Retain the draft during context unavailability and recovery; unavailable capabilities must not expose an action. |

### Current phone APK — secure sign-in repair (build 19)

Updated **6 November 2026, Asia/Singapore**. [Download build 19](../../artifacts/M7/eFlow-Mobile-M7-SignIn-Fix-arm64-x86_64.apk) and install over build 18 without clearing application data. The navy/blue theme is retained. Personal acceptance remains **PENDING**.

**Build 18 fresh sign-in is broken.** The earlier description that it used the hosted sign-in path was incorrect. It was built without `EXPO_PUBLIC_EFLOW_MOBILE_SIGN_IN=edge`; the old opt-in default selected the protected gateway. That gateway's published Cloudflare hostname returned **ENOTFOUND**. The user saw the connection error even with working internet. Build 18's restored-session display checks never established fresh sign-in. [Diagnosis receipt](M7-sign-in-fix-diagnosis.json)

Build 19 defaults native password sign-in and reauthentication to the already deployed protected Supabase `mobile-sign-in` endpoint. The old protected gateway now requires the explicit mode `gateway`; invalid modes fail configuration validation before any native fallback. A hosted-sign-in error never retries credentials against the older service. Account lockouts, denial, rate limits and session validation remain authoritative. No hosted function, schema, RLS, role, credential or production data was changed for this repair.

The normal Android/iOS export commands now run `npm run verify:sign-in` first. It resolves the production Expo environment, evaluates the actual native configuration and rejects a gateway QA override or an invalid mode. APK source verification now includes `src/platform/config.ts` and `mobileSignIn.ts`, closing the previous configuration-source evidence gap. Keys and credentials are not printed.

| Check | Result |
| --- | --- |
| TypeScript / Metro | **VERIFIED**: `npm run check`, nine exclusions. |
| Regression tests | **VERIFIED**: 190 tests in 61 suites. Includes absent/empty/edge transport, explicit gateway mode, invalid configuration and no credential fallback after a network error; lockout/denial/session guards retained. |
| Production transport preflight | **VERIFIED** with the flag absent. Explicit gateway and unsupported-mode environments were also rejected by the release preflight. |
| Android and iOS JS/Hermes exports | **VERIFIED** separately with the normal production environment. |
| Live service reachability | **VERIFIED** from the build host: deployed function ACTIVE/version 1, HTTP 405 for GET and 422 for an empty POST; these do not validate account credentials. Published old-gateway discovery returned HTTP 200; its hostname did not resolve. |
| Android standalone source/signature/credential inspection | **VERIFIED**: build 19, ARM64/x86_64, non-debuggable, same signer as build 18, configuration/adapter sources matched. Emulator upgrade and cold launch verified; the signed-out sign-in form rendered. No credentials were entered, so this is not a successful sign-in. [Build 19 sign-in screen](../../artifacts/M7/sign-in-fix-cold-launch.png). [Build 19 APK receipt](M7-sign-in-fix-apk-verification.json) and [credential audit](M7-sign-in-fix-release-audit.json). |
| Real-account fresh sign-in | **BLOCKED** for agent verification pending a dedicated approved account through the protected flow. No real password was entered; existing restored sessions are not a login pass. |
| Physical Android acceptance | **NOT TESTED** by the agent. User should retry on build 19 using the checklist below. |
| Native iOS build/workflows | **BLOCKED** on Windows without Mac/Xcode/device. JS export is separate evidence. |

For each **approved Head, Member and Accounting Staff** account, install build 19 on an Android phone and sign in on Wi-Fi or mobile data. Record exact account, server-confirmed role, Office, device/build, result and whether the existing session was restored or a password was submitted. Expect the normal role tabs and exact Office context. Do not use Admin credentials. Use approved disposable fixtures for deliberate wrong-password/lockout testing, and leave those scenarios **BLOCKED** if fixtures are unavailable. Existing profile/settings/reauthentication permissions remain unchanged. Do not sign out the only working session just to obtain a screenshot.

### Superseded phone APK — logo color theme (build 18)

Updated **6 November 2026, Asia/Singapore**. [Download build 18](../../artifacts/M7/eFlow-Mobile-M7-Brand-Theme-arm64-x86_64.apk). **Superseded for fresh sign-in by build 19.** This standalone ARM64/x86_64 APK uses the existing local QA signer but accidentally selected the old gateway; the prior hosted-sign-in claim was incorrect. Personal acceptance remains **PENDING**.

The user requested the supplied eFlow logo's palette throughout the mobile project. The shared primary is navy `#00006b`, with brand blue `#0073ea`, blue-tinted light neutrals and navy dark surfaces. Buttons, selected navigation, login/mark/startup, cards, ambient gradients, loading states, fields, tables and existing export styles share the palette. Information text uses an accessible darker blue; dark controls use lighter blue and a dark on-primary foreground. A native dark-mode check caught a white floating-action icon on a light blue surface; the final candidate uses the on-primary token. Decorative announcement accents also use blue. Warning, error, completion and review meanings remain distinct. [Native palette specification](design-system.md#m7-logo-palette-revision--6-november-2026)

| Verification for this revision | Result |
| --- | --- |
| TypeScript / Metro configuration | **VERIFIED**: `npm run check`; nine Metro exclusion checks. |
| Automated regressions and color contrast | **VERIFIED**: 182 tests in 60 suites. The regressions include the appearance chooser selected/close icon colors after dark-mode hydration. The contrast regression checks normal-text pairs at 4.5:1 or better in both themes, including semantic feedback and hero gradient stops. |
| Android and iOS production JS exports | **VERIFIED** separately. These are JavaScript/Hermes checks, not native iOS verification. |
| Android standalone compilation and APK inspection | **VERIFIED**: build 18, ARM64/x86_64, non-debuggable, signed, current theme sources embedded, native primary resource navy. [APK receipt](M7-brand-theme-apk-verification.json) |
| Release credential audit | **VERIFIED** for both exports and the actual APK bundle; no development account literals. [Audit](M7-brand-theme-release-audit.json) |
| Native Android display and workflow checks | See the final display evidence below. Full role and fixture workflow acceptance is **NOT TESTED** for this visual revision. |
| Physical Android | **NOT TESTED** by the agent. |
| Native iOS compile, themes, reduced motion, accessibility, font scaling and keyboard | **BLOCKED**: Windows host without Mac/Xcode/iOS simulator or device. |
| TalkBack / VoiceOver and all-role personal acceptance | **NOT TESTED** for this revision; do not carry forward historical passes. |

Final Android display checks use the already restored session for **Gabriel Cahiyang, `gabzcah@gmail.com`, server-profile role `accounting_staff`, LEDIPO** on `emulator-5554`, Android 17 / API 37, x86_64, non-debuggable build 18. The agent did not enter credentials or submit business/financial writes. This existing-session display smoke check does not establish dedicated-account approval, fresh sign-in or full Accounting workflow acceptance. [Profile/role](../../artifacts/M7/brand-theme-final-profile.png) · [My Work, light](../../artifacts/M7/brand-theme-final-my-work.png) · [More, light](../../artifacts/M7/brand-theme-final-more.png). Dedicated role-workflow QA is **BLOCKED** pending approved accounts/fixtures; this restored-session display inspection is separate. Head and Member visual checks still require their approved sessions. The final dark My Work screen was inspected at 150% with Android animator duration set to zero; the floating-action icon uses the corrected dark foreground. [Dark, 150%](../../artifacts/M7/brand-theme-final-dark-150.png). The final appearance chooser was also inspected with readable selected and close icons. [Dark chooser](../../artifacts/M7/brand-theme-final-chooser-dark.png). A 200% dark-mode smoke check also retained the palette; the compact Office label and long task title/context truncate, and date filters scroll horizontally. This is not full large-text acceptance. [Dark, 200%](../../artifacts/M7/brand-theme-final-dark-200.png). Search focus opened the configured Android handwriting toolbar; full software-keyboard typing/layout is **NOT TESTED**. [Input focus](../../artifacts/M7/brand-theme-final-keyboard.png).

Personal checklist — record actor email, server-confirmed permanent role, Office, device/build and VERIFIED/FAILED/BLOCKED/NOT TESTED for each scenario. Approved account credentials are required; do not use Admin or production writes to test colors.

| Account required | Scenario |
| --- | --- |
| Approved Head | Check Home hero/attention, My Work, Inbox, Projects, More, workspace chooser, Profile and Back in light/dark. Blue/navy should replace teal decoration while status meanings remain recognizable. |
| Approved Member | Repeat shared destinations and the permitted task/branch inspector. Check status/deadline chips, selected tabs, sheets, keyboard, placeholders and empty/error states. |
| Approved Accounting Staff | Check My Work, Inbox, Accounting, Projects and More, then authorized read-only funding context. Unavailable finance must remain unavailable; submit no financial operation for color QA. |
| Each supported role, Android and iOS separately | Check device/system/light/dark preference, 150% and 200% font scaling, reduced motion, screen-reader labels/focus, keyboard and predictable Back. Check primary icons/labels against their backgrounds. |
| Signed-out approved device/session | Check startup, sign-in, invalid-field feedback and recovery colors through the normal protected flow. Do not sign out a sole working session merely to collect an image. |

This revision does not accept M7 or authorize another phase. No backend, generated web core, permission or finance contract was changed. The emulator was restored to its original light app preference, 100% font scale, system night mode off and default animator scale. Historical QA below belongs to its stated builds.

### Previous phone APK with updated tab feedback (build 17)

[Download build 17](../../artifacts/M7/eFlow-Mobile-M7-Navigation-arm64-x86_64.apk) and install it over build 16. It uses the Supabase sign-in path described below. No destinations or navigation entries were removed in this update.

| Before | After |
| --- | --- |
| Press tinted the full rectangular tap area. Selection used a separate highlight behind the icon. | Press, mouse hover, and selection use the same rounded highlight behind the icon. Opacity fades over 120 ms with motion enabled and changes immediately with reduced motion. The full tab remains tappable. |

Android emulator **VERIFIED** for upgrade and cold launch, holding Projects while Home is selected, releasing into Projects, Android Back to Home, and the dark-mode selected state with Android animations disabled. Physical Android and native iOS interaction are **NOT TESTED** for this update. All 180 tests, both native JS exports, and the credential audit passed. [Before press](../../artifacts/M7/tab-feedback-before-press.png) · [Build 17 press](../../artifacts/M7/tab-feedback-after-press.png) · [Build 17 selection](../../artifacts/M7/tab-feedback-after-selected.png) · [Back](../../artifacts/M7/tab-feedback-after-back.png) · [APK receipt](M7-navigation-apk-verification.json)

On your phone, tap Home, Projects, and More in succession. Hold a different tab briefly before release and check that the highlight keeps the same rounded shape. Try Android Back, dark mode, and the Android Remove animations setting. If you use a mouse or stylus that supports hover, check that hover uses the lighter version of the same highlight.

### Supabase-hosted sign-in

[Build 16](../../artifacts/M7/eFlow-Mobile-M7-Supabase-SignIn-arm64-x86_64.apk) introduced Supabase sign-in. Connect to Wi-Fi or mobile data and sign in with your authorized eFlow account on build 16 or 17. [APK receipt](M7-edge-phone-apk-verification.json) · [Credential audit](M7-edge-phone-release-audit.json)

The `mobile-sign-in` Edge Function handles native password sign-in and password reauthentication in builds that set `EXPO_PUBLIC_EFLOW_MOBILE_SIGN_IN=edge`. It calls the approved Supabase project over HTTPS. It shares the existing login attempt leases, failed-attempt counters, durable locks, provider ban receipts, and audit records with eFlow Web. Admin lockout management continues to use its existing web route. Invitation acceptance and creation retain their existing contracts.

Read-only inspection of the hosted database verified that the existing `eflow_login_begin`, `eflow_login_finish`, and `eflow_login_admin` functions allow the server role and deny execute access to public and signed-in client roles. The Edge Function uses the server runtime key. The mobile bundle uses the existing public project URL and publishable key.

All 179 mobile tests and eight Deno handler tests passed, including lock denial, threshold and ban receipts, concurrent attempts, provider errors, and unavailable-route handling. Both opt-in native JS exports passed. On 5 November 2026, `mobile-sign-in` version 1 was deployed to `ixnfphgjyelhckjwjkdv`. Live probes verified HTTP 405 for an unsupported method, 422 for an empty request, and 401 for a synthetic nonexistent identity. Each response used `Cache-Control: no-store` and contained no session tokens.

The signed APK upgraded build 15 and cold-launched on the emulator. A fresh Android profile rendered the sign-in screen. An Android system process stopped responding during the follow-up form interaction, so a submission through the emulator UI remains **BLOCKED** for this run. The live HTTP probes were separate. [Sign-in screen](../../artifacts/M7/edge-phone-login.png) · [Android system dialog](../../artifacts/M7/edge-phone-system-anr.png)

For personal acceptance, sign in as Head, Member and Accounting Staff on a phone using Wi-Fi or mobile data. Use approved disposable accounts for tests that deliberately submit wrong passwords. Check the configured threshold, concurrent web and mobile attempts, lock denial with a correct password, and Admin unlock through the existing web flow. Confirm provider throttling gives a retry state and leaves the failed-password counter unchanged. Live sign-in with a real account and physical phone acceptance remain **NOT TESTED** by the agent.

### Historical phone APK with published gateway discovery

[Build 15](../../artifacts/M7/eFlow-Mobile-M7-Phone-arm64-x86_64.apk) used the published gateway discovery route. Discovery returned HTTP 200 and the published Cloudflare hostname failed DNS. Fresh sign-in on build 15 was **BLOCKED**. Android x86_64 emulator upgrade and cold launch were **VERIFIED**. Both native JS exports, 173 tests, and the credential audit passed. [APK receipt](M7-phone-apk-verification.json) · [Credential audit](M7-phone-release-audit.json)

### Tethered QA APK

[Download the M7 tethered QA APK, build 14](../../artifacts/M7/eFlow-Mobile-M7-QA-arm64-x86_64.apk)

This build uses the QA computer's protected gateway for fresh sign-in. On a physical phone, connect it to that computer with USB debugging enabled and approve the Android debugging prompt. Run `adb devices` to find its serial, confirm the gateway is listening on the PC, and run the commands below. Keep the ADB connection active for sign-in. Enter your password directly in the app. [Gateway setup](M0-login-fix-qa.md)

```powershell
adb -s <serial> install -r artifacts/M7/eFlow-Mobile-M7-QA-arm64-x86_64.apk
adb -s <serial> reverse tcp:8322 tcp:8322
```

Without forwarding, build 14 sends the sign-in request to `127.0.0.1:8322` on the phone itself and displays “Secure sign-in could not be reached” if the gateway is unavailable. Android treats build 15 as an upgrade from build 14. A later switch back to build 14 would be a downgrade.

| # | Actor and prerequisite | Steps and expected result |
| --- | --- | --- |
| 1 | Approved Head, Member and Accounting Staff | Sign in as each role. Confirm the bottom tabs, More → Account & settings → Profile, and that Back returns to the originating tab. Sign out before switching actors and verify the next actor has only their own workspace and records. |
| 2 | Head with an accessible Office project and a Personal workspace | In Projects, search with the keyboard open and inspect Main table, Board and Agenda. Open a task, its immediate subitem, Activity and Funding. Verify exact Back through the same project. Switch to an authorized Personal context and back. Office records must appear only in the correct context. |
| 3 | Member assigned a safe task and subitem, with a matching Inbox update | In My Work and Inbox, choose a filter and follow the exact update. Check record identity and Back with the filter retained. Confirm an unrelated actor cannot open that work. Verify the separate second Office boundary with an approved fixture. |
| 4 | Dedicated worker and separate eligible reviewer, including an appointed Subitem Lead where applicable | On an approved fixture, attach safe camera/file evidence, interrupt and retry, submit, then return for changes with a reason or approve from the eligible reviewer. Check history and final state as the worker. Self-review must be denied. |
| 5 | Accounting Staff with approved readable cash records | Open Accounting → Requests & releases and Assigned reviews. Verify exact Office, fiscal year, amount and receipt identity. Verify independent review and settlement stay separate. Use an approved writable fixture for any cash or review mutations. |
| 6 | Two approved participants in a safe text conversation | Open Messages or the exact task conversation. Verify the keyboard leaves the composer reachable. Send a safe text and confirm one receipt on the second account, including retry if the reply is interrupted. |
| 7 | Any approved mobile role on a device | Check light and dark mode, 150% and 200% text, orientation, keyboard, TalkBack or VoiceOver, Back, and background/resume. Check web handoffs when the build has an approved web origin. Repeat separately on Android and iOS. |
| 8 | LEDIPO Head with access to the historical liquidation notice, or an equivalent approved fixture | From Inbox, select **Open related item** on the liquidation notice, then **Open linked subitem funding**. Confirm that the Book Venue record is `FR-00001` for the historical notice. Press Back twice and confirm the same Inbox position. |

Record **VERIFIED**, **FAILED**, **BLOCKED**, or **NOT TESTED** for each step. Include actor role, Office, contextual appointment if applicable, device and build number. Use safe approved test records for writes. The existing production records used for agent verification were read-only.

## Results

| Check | Result |
| --- | --- |
| Source identity | **VERIFIED.** Base commit `6d4f19fc1829e9470d8dca2de524a2041b93521d` with the mobile redesign working tree. Initial M7 build 13 matched the M6 embedded bundle. The final APK receipt records the updated bundle and matching sources for the financial-link repair. |
| TypeScript and Metro | **VERIFIED.** `npm run check` passed with nine Metro exclusion checks. |
| Automated regressions | **VERIFIED.** 173 tests across 59 suites passed. Covered role navigation and Admin exclusion, scope and exact destination, financial command recovery, evidence and review fixtures, and message retry identity. |
| Android and iOS Hermes exports | **VERIFIED.** Both exports passed. The credential audit passed on both exports and the APK bundle. [Credential audit](M7-release-audit.json) |
| Android build, signature and cold launch | **VERIFIED.** Build 14, ARM64/x86_64, non-debuggable, local QA certificate, embedded source, and retired presentation exclusions checked. Installed and cold-launched on `emulator-5556`, Android 16 API 36, x86_64. [APK receipt](M7-apk-verification.json) |

The general read-only and display captures below are from build 13. The affected financial-link path was retested on the final build. Android used the restored `bplo.head@gmail.com` account, server-confirmed permanent role `head`, LEDIPO. No Task Lead or reviewer appointment was assumed. [Role evidence](../../artifacts/M7/profile-role.png)

| Emulator scenario | Result |
| --- | --- |
| Head Home, My Work, More and Profile | **VERIFIED** for the role tabs, Home, My Work empty state, and Account & settings → Profile. [Home](../../artifacts/M7/home.png) · [My Work](../../artifacts/M7/my-work.png) · [Account & settings](../../artifacts/M7/account-settings.png) |
| Projects and exact work navigation | **VERIFIED** for project search with the keyboard, opening the Office project, Venue Reservation → Book Venue, Activity and Back to the task. [Projects](../../artifacts/M7/projects.png) · [Keyboard](../../artifacts/M7/projects-keyboard.png) · [Task](../../artifacts/M7/task.png) · [Subitem](../../artifacts/M7/subitem.png) · [Activity](../../artifacts/M7/task-activity.png) · [Back](../../artifacts/M7/task-after-back.png) |
| Historical liquidation notice | **FAILED** on build 13, which opened the task's Funding view and reported the record unavailable. **VERIFIED** on build 14. The recovery action opened Book Venue `FR-00001` read-only, and two Back presses returned to the original Inbox position. [Build 13](../../artifacts/M7/build13-inbox-financial-before.png) · [Recovery action](../../artifacts/M7/final-inbox-financial-destination.png) · [Exact record](../../artifacts/M7/final-inbox-subitem-funding.png) · [Inbox after Back](../../artifacts/M7/final-inbox-back.png) |
| Office and Personal workspace boundary | **VERIFIED.** Switching from LEDIPO to the authorized Test1 Personal workspace hid the Office task contents and gave a workspace message. Switching back restored the same task. [Boundary](../../artifacts/M7/workspace-personal-blocks-office.png) · [Restored task](../../artifacts/M7/workspace-restored-task.png) |
| Inbox interruption and recovery | **VERIFIED** that existing updates stayed visible through a forced Wi-Fi and mobile-data interruption. Refresh reported unavailable sources and offered Retry. Reconnection restored the Inbox. A Personal decisions warning was visible in the initial reconnect capture and cleared on the later online check. [Offline](../../artifacts/M7/offline-inbox.png) · [Reconnected](../../artifacts/M7/inbox-online-final.png) |
| Background and foreground | **VERIFIED** that Android brought the existing app task to the foreground and the same Venue Reservation task returned after access refreshed. A loading screen briefly covered the app. [Android launch log](../../artifacts/M7/resume.log) |
| Text scaling, orientation, keyboard and reduced motion | **VERIFIED** for Head Home in dark mode at 150% and 200%, a landscape layout smoke check, and Android Projects search keyboard. Android animator duration was disabled during the display checks. At 200% portrait the Projects tab wraps mid-word, and the compact Office label truncates at 200%. The workspace chooser displays the full Office name. [150%](../../artifacts/M7/dark-150.png) · [200%](../../artifacts/M7/dark-200.png) · [Landscape](../../artifacts/M7/landscape-200.png) |
| TalkBack | **BLOCKED** for app focus order and spoken output in this run. Android bound TalkBack and enabled touch exploration. The Android Accessibility Suite notification prompt interrupted the gesture check. [Service state](../../artifacts/M7/talkback-state.log) · [Prompt](../../artifacts/M7/talkback-swipe.png) |
| Announcements and Office Team handoff | **VERIFIED** for clear unavailable states and Back. Live Announcements reads are **BLOCKED** by the hosted policy, and the web handoff needs a configured HTTPS origin. [Announcements](../../artifacts/M7/announcements-unavailable.png) · [Office Team handoff](../../artifacts/M7/office-team-web-unavailable.png) |
| Fresh protected sign-in, sign-out and account switch | **BLOCKED** for full login and account switch. The protected listener and approved role sessions were unavailable. Sign-out from the only working session was **NOT TESTED**. Live Admin login was **NOT TESTED** under the web-only restriction. Automated denial passed. |
| Member and Accounting Staff, second Office and depth-eight live fixtures | **BLOCKED** by missing approved sessions and test data. No live Accounting screenshot. Automated route and authority coverage is separate. |
| Evidence upload, review, messaging, finance writes | **BLOCKED** pending dedicated actor/fixture and backend prerequisites. No production write was performed. |
| Physical Android and native iOS | Physical Android **NOT TESTED** by the agent. Native iOS build and device workflows **BLOCKED** on Windows. Personal acceptance is pending. |

## Office Main table pagination

Build 34 adds automatic task paging to the Office project Main table. See [the before-and-after inventory and personal QA checklist](M7-main-table-pagination-qa.md).

## Inbox update pagination

Build 35 loads older Inbox updates as you scroll. See [the before-and-after inventory and personal QA checklist](M7-inbox-pagination-qa.md).

## Chat history pagination

Build 36 loads older chat messages as you scroll up. See [the before-and-after inventory and personal QA checklist](M7-chat-pagination-qa.md).

## My Work scroll paging

Build 37 reveals My Work assignments in batches from the authorized snapshot. See [the personal QA checklist and network paging prerequisite](M7-my-work-pagination-qa.md).

## Office Board and Agenda paging

Build 38 pages Board by status and Agenda by date. See [the verification and personal QA checklist](M7-board-agenda-pagination-qa.md).

## Projects directory and Personal task paging

Build 39 pages the Projects directory in both workspace types and the Tasks tab inside Personal projects. See [the personal QA checklist and network paging prerequisite](M7-project-directory-personal-pagination-qa.md).

## Sign-in and alert wording

Build 40 shows **Couldn't sign in** and **Email or password is incorrect.** for rejected credentials, account lockout responses, and a confirmed role outside mobile access. The sign-in service does not identify the role when it returns a lockout, so the same wording applies to every locked account. The sign-in button stays labeled **Log in**. A restored Admin session offers **Back to sign in** and does not open a workspace.

Shared alerts now use **Check your details** for form guidance, **Check before retrying** for an unconfirmed result, and more specific headings when an item changed, an upload stopped, or changes were already saved. Before repeating any unconfirmed operation, refresh and check the record.

| Personal check | Expected result | Status |
| --- | --- | --- |
| Approved Head, Member or Accounting Staff with a known good account | On Android and iOS, check the sign-in form and confirm valid credentials reach the workspace. If an approved negative test is available, make one deliberate invalid attempt and check the generic message. | NOT TESTED on a personal device |
| Local mock lockout or restored Admin fixture | Generic credentials message. No workspace access and no automatic retry. Do not use live Admin credentials or deliberately lock an account. | Covered by automated checks |
| Approved Member with a safe task draft | Open a form that requires a work note and leave it empty. Verify **Check your details** and the instruction about the missing note. Check legibility in both themes and with large text and TalkBack or VoiceOver. Use a local fixture for the uncertain-result alert. | NOT TESTED on a personal device |

## Subtasks, project tables and role priorities

11 November 2026, Asia/Singapore. Personal acceptance is pending.

TypeScript and nine Metro checks passed. All 274 tests in 84 suites passed. Android and iOS production Hermes exports passed separately. The credential audit passed on both exports and the APK's embedded bundle. [Credential audit](M7-subtasks-projects-v41-release-audit.json)

Android release compilation, ARM64/x86_64 packaging, signature and source checks passed. The non-debuggable APK upgraded the isolated `eFlow_M7_Resume_QA` emulator from build 39 and cold-launched to the dark sign-in screen on Android API 36/x86_64. No signed-in actor or role was verified on this build. [APK verification](../STANDALONE_V41_APK_VERIFICATION.json)

Native iOS compilation and device workflows require Xcode and an iOS device or simulator.

- Mobile uses **Subtask** in the affected screens. Task details and the project Main table show the existing task start date. New subtasks preselect the Task Lead when the current directory lists that person as eligible.
- Subtask details open directly to a chronological Activity timeline with history, decisions and evidence. Project percentages count completed tasks. Task and subtask details count completed direct children. A leaf uses its own completion status. A record under review contributes zero completed items.
- Projects uses the Main table's row and header styles with Project, Status and Type columns. The Main table replaces Office with Budget and Actual expense and keeps the Task column pinned. Budget sums approved root allocations. Actual expense sums settled cash visible to the account, including authorized records for the task's subtasks. A dash means no amount was available to display.
- Head Home shows up to three current projects in the selected workspace, prioritizing projects on hold and then active projects. Member Home shows up to three open assignments in the selected workspace, with overdue and due-today work first. Accounting Staff has Accounting in the bottom navigation and can open Reviews from More. Notifications offers All and Unread updates.

| Personal check | Account and fixture | Expected result |
| --- | --- | --- |
| Home and Projects | Approved Head in an Office with active, on-hold and completed projects. Approved Member with assignments in two workspaces. | Check project status and percentage, workspace isolation, table headers, search, favorites, scroll paging and Back. Member Home should prioritize due work in the selected workspace. |
| Main table and task details | Approved Head or task Lead with a dated task and authorized approved allocations and settled expenses. | Start date is readable in both screens. Swipe across the table and confirm the task name stays pinned. Compare the authorized amounts with the same records on eFlow Web. |
| Subtask activity and progress | Approved Task Lead, with two completed and one pending-review subtask under a task. Include a nested subtask with historical activity and evidence. | The task shows 67%. Open the nested subtask and confirm the Activity timeline is visible immediately. Verify authors, times, decisions and evidence, then check Back returns to the same branch. |
| Creation and completion | Approved Task Lead on a dedicated writable fixture, and a different approved reviewer. | Check that the eligible Task Lead is selected in Add subtask. Verify the Evidence (optional) label and Mark as complete button. The root task continues to require its independent reviewer. Open Reviews in More and confirm both review buttons fit. |
| Contributor boundary | Approved Member contributor and a separate eligible Subtask Lead. Use a second Office for cross-Office routing when available. | Mobile shows that Lead approval is unavailable and prevents contributor execution from writing changes. Read the same task, subtask and project afterward to verify their status and completion. The Lead can still use existing authorized actions. |
| Accounting and Notifications | Approved Accounting Staff and a safe assigned review. | Accounting is a main tab. More opens the assigned review queue. Notifications shows All and Unread and opens authorized links to their exact records. |

For each supported scenario, check Android and iOS separately in both themes with increased font size, TalkBack or VoiceOver, reduced motion and the keyboard open where applicable. Use only approved role accounts and dedicated fixtures. Fresh role sign-in, signed-in device workflows and personal acceptance are pending unless documented in the platform evidence below.

### Shared backend prerequisites

Verified against authoritative eFlow Web Git revision `4ff217b84e3e8128555ffc87f0514253cd576399`. The hosted target is `ixnfphgjyelhckjwjkdv`.

- **Subtask start date and today default — integration blocked.** The Office and Personal subtask records and the `r7_work_command` and `nw_work_command` create payload accept a due date. The shared contract needs a persisted date on both subtask record types, create validation and calendar default semantics, and projection through `r7_work_tree`. The mobile form reports the unavailable field while retaining supported creation.
- **Contributor submission and nearest-Lead approval — integration blocked.** `save_subtask_work_update` applies state and history immediately. The existing root progress/status and Personal nested-work commands also lack a pending change stage for every contributor execution action. The shared contract needs revision- and actor-scoped pending submissions, authorized nearest eligible Lead routing, a decision and notification surface, and atomic application of accepted changes with receipt recovery. Keep existing self-review, ancestor fallback, descendant completion and Responsible Office Head root-review checks. Mobile blocks the direct contributor execution paths, including retries of uncommitted Personal nested work. Existing finance and independent-review authorities continue to use their own contracts.

## Integration dependencies

- Protected fresh login requires the existing gateway and approved accounts. The local QA listener on port 8322 was unavailable at preflight.
- Member and Accounting Staff logins, dedicated worker/Lead/reviewer identities, approved writable fixtures, and a second Office are required for their respective live workflows.
- Announcements recipient-policy recursion remains a hosted integration issue. Office Team is a web handoff in the final mobile scope. Browser launch requires `EXPO_PUBLIC_WEB_ORIGIN`. [M4 integration record](M4-backend-proposal.md)
- Installed finance/NW11 prerequisites and role-scoped test data apply to the affected finance workflows. [M5 finance dependencies](M5-personal-qa.md)
- Physical Android personal acceptance is pending. Native iOS compile and workflow testing require a Mac/Xcode and simulator or device.
