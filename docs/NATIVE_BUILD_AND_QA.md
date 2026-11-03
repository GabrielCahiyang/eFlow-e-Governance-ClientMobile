# eFlow Mobile build and QA — 28 October 2026

**Current Android APK:** [standalone build 3](../artifacts/eFlow-android-standalone-v3.apk). The native `document` lifecycle crash is fixed and Expo's development launcher remains removed; native assembly, signature and actual-APK checks passed. Current source validation: 86 tests / 35 suites, TypeScript/Metro checks and Android/iOS exports passed. See [build-3 report](NATIVE_DOCUMENT_CRASH_2026-10-28.md). Earlier artifacts and test counts below are historical.

This receipt covers the React Native project in EflowMobile. The complete one-to-one port is **not finished**. See [PORTING_STATUS.md](PORTING_STATUS.md) for implementation gaps and [MOTION_PARITY.md](MOTION_PARITY.md) for presentation acceptance.

## Automated checks

- TypeScript passed after the Help/timer corrections.
- **57 tests in 22 suites passed** (61.875 seconds in the final run). These exercise native components and service/state boundaries under Jest; they are not device tests.
- Android and iOS production Hermes exports passed. The final bundle audit is recorded in [NATIVE_RELEASE_AUDIT.json](NATIVE_RELEASE_AUDIT.json); it compares exact string-table entries and found no development quick-login account literals.
- EflowWeb's Git working tree remained unchanged in this native slice. No database schema, RLS, migration history or credential changes were made.

## Build artifacts

`artifacts/eFlow-Android-development-arm64.apk` built successfully with the installed Android SDK/JDK. It is an **ARM64 debug development client**, requires Metro and does not embed a standalone production JS bundle. Its checksum and size are in [ANDROID_BUILD_RECEIPT.json](ANDROID_BUILD_RECEIPT.json). Do not call it a production release or a physical-device acceptance result.

A separate x86_64 debug build completed successfully in 6m 38s and installed on Pixel_4a/emulator-5554 (`adb install`: Success). Its artifact is `artifacts/eFlow-Android-emulator-x86_64.apk`; see `ANDROID_EMULATOR_BUILD_RECEIPT.json`. It remains a development client, and installation does not establish an authenticated app workflow or native visual acceptance.

The Windows native-build fix is persisted in `plugins/withWindowsCmake.js`: short CMake staging paths, a 250-character object-path limit and a two-job C++ compile/link pool. Android build outputs and local SDK files are ignored by Git. Regenerating the Android project requires Expo prebuild with this plugin.

This Windows laptop has no Xcode toolchain. The iOS Hermes export checks JavaScript compilation; an iOS binary and device acceptance remain outstanding.

## Visible browser walkthrough

The preview ran at `http://localhost:8081/`, using the existing authenticated gateway on loopback port 8322. The existing LEDIPO Head was used for the walkthrough. The initial pass used Remember me unchecked; the development account picker later signed in using its default preference. The QA session was explicitly signed out after testing, and the Office workspace was restored. The initial walkthrough submitted no workflow mutations. The later personal-workspace check created exactly one labeled QA personal project in existing workspace `Test1`: `QA Mobile — Equipment checkout checklist · 28 Oct 2026`. It stopped before task creation when the server returned the active owner as ineligible. No budget, cash, journal, membership or invitation mutation was submitted; no invitation email was sent.

1. Sign-in, branded startup and the authorized Head dashboard loaded.
2. Opened the existing procurement task's Budget tab: authorized budget ₱1,800; cash released ₱800; actual spending ₱750; available to request ₱1,050. Existing rejection, cancellation, release and corrected receipt history were displayed. This is a read verification, not a new cash-flow execution.
3. Kept that task mounted and opened Office Budget. The duplicate subscription crash no longer occurred.
4. Opened FY2026 annual controls without changing them. Q1 ₱2,400; Q2 ₱3,000; Q3 ₱3,000; Q4 ₱3,600; total ₱12,000. Committed authority ₱2,400 and available Office Budget ₱9,600 remained distinct from settled spending ₱750.
5. Reports showed two operational tasks and eight recorded lifecycle transitions. A transition inspector displayed its actor/reason; its source link opened the correct task and kept Workspaces selected.
6. Help's local timer error was corrected. Its request then reached the gateway and returned “The local AI service is offline.” This does **not** verify an AI answer or Kitten audio playback.

Screenshots in [the evidence gallery](evidence/2026-10-28/GALLERY.html) are labeled **React Native Web preview**, not Android/iOS screenshots. Temporary phone viewport overrides were reset afterward.

7. Downloaded the real Office operations CSV; it contained the two visible task records and all twelve exported columns. Native OS file sharing remains unverified.
8. Verified the tablet sidebar visually, including completed report row widths and scrolling. Starred the existing QA project and observed a single sidebar copy; restored its original unstarred preference.
9. Verified Office → personal workspace routing and creation of the labeled personal QA project. The server returned active owner participation but `eligible: false`; see [PERSONAL_MEMBERSHIP_FINDING.md](PERSONAL_MEMBERSHIP_FINDING.md). No client eligibility override was added.

## Bugs fixed

| ID | Problem and cause | Fix and evidence |
| --- | --- | --- |
| NATIVE-001 | Font Retry kept the failed font loader mounted. | Retry remounts the readiness subtree; font failure/retry regression and browser check. |
| NATIVE-002 | Copied gateway resolution relied on a browser origin rather than the native resolver. | Native adapter uses explicit configuration or the existing public endpoint RPC. Generator adaptation is AST-based and repeatable; gateway tests pass. |
| NATIVE-003 | Source icon aliases produced nonexistent individual Lucide imports. | Alias-aware adaptation resolves installed exports; import validation passes. |
| NATIVE-004 | Empty string/zero JSX guards could render primitive text under native View components. | Native adaptation uses explicit boolean guards. |
| NATIVE-005 | Two mounted budget consumers reused a subscribed Supabase channel, causing an exception when adding bindings. | Unique channel per consumer/effect lifetime and independent cleanup; coexistence/remount regression and task funding → Office Budget browser check pass. |
| NATIVE-006 | Help invoked browser timer functions with the compatibility object as their receiver, causing Illegal invocation before the request. | Timer bridge binds all four methods to their actual host. Receiver-identity regression passes; browser request reaches the server. |
| NATIVE-007 | Development quick-login accounts could enter the production dependency graph. | Production resolver substitutes an empty module; exact Hermes string-table audit finds no development account literals. |
| NATIVE-008 | Budget navigation ignored the explicit destination view supplied by review links. | Explicit route view now takes priority over accounting-section defaults. |

Additional safeguards include Help cancellation on scope/focus changes; spreadsheet formula protection in CSV; HTML escaping in PDF exports; retained uncertain financial receipts; and secure-storage chunk/previous-value protection. These are tested safeguards, not claims that all corresponding live failure scenarios occurred.

## Additional build and layout checks

- Tablet-width sidebar code now uses the same authorized destinations and workspace selection, with persistent Favorites/Projects/Archived disclosure. Favorite projects leave both ordinary and archived lists; duplicate project IDs are collapsed. Native interaction tests verify separate navigation/star controls and Admin isolation.
- Nine Metro path-exclusion checks plus a matching-RegExp-flags check preserve Expo defaults and package `dist` reachability while excluding generated native output. Serve/export file-map caches now have separate directories after a serialized-cache read failure was observed.
- The new sidebar icon alias was corrected through the installed Lucide export map. The final full suite includes its runtime import checks.
- Automatic approval review rejected the attempted emulator port-forwarding command without a detailed reason. No forwarding was applied. The emulator booted and the x86_64 APK installed successfully, but a full native authenticated workflow has not been verified. The emulator also displayed an incompatibility notice for installed Vanguard anti-cheat software. No Windows security or anti-cheat setting was changed.

- Removed raw JSX spacing under native Views in the responsive report filters. A whole-native-source AST regression now catches primitive text children in these containers.
- Personal project views now retain Workspaces as the selected navigation context.
- Switching workspace now opens its project destination rather than leaving the previous Office dashboard visible.
- Personal commands and workspace/project creation retain actor/context-scoped requests across failed connections/restarts; confirmed creation receipts reopen the record without recreating it.

## Mobile role scope correction

The user excluded Admin from mobile. Native Admin screens and routes were deleted, the development chooser omits Admin, and restored Admin/super_admin sessions fail closed before mobile permissions/profile load. Head Office identity/access moved into the team feature with exact-Office targets; global role-default editing is absent. EflowWeb, database accounts and credentials are unchanged. Earlier Admin screenshots are historical evidence only. Build artifacts from before this change must not be used as evidence of current mobile scope.

## Earlier backlog (superseded by the current implementation handoff)

- Complete remaining Office identity/settings and personal membership/share/activity/shortcut workflows. Admin is web-only and outside mobile scope. Personal project creation, task staffing/progress/review/closeout and nested-work UI are implemented, but their hosted flow is blocked by the recorded membership eligibility mismatch.
- Unified action inbox, chat/calls, announcements and push delivery.
- Complete project sharing, milestones, custom views, drag/reorder/export, native PDF extraction/import and office invitation presentation. The existing Import PDF route is not a completed native workflow.
- Full lifecycle/descendant funding views and cross-office accounting/report parity.
- Native Live, ASR/VAD/progressive dictation and remaining motion/appearance parity.

## Verification still required

Android/iOS devices, OS permissions/app links, all supported roles, native secure persistence/restart, keyboard/accessibility/large text/tablets, actual file sharing, invitation acceptance, uncertain financial recovery, live Qwen + LAYA saving/reload, and Help/Kitten responses with the private AI host running. These verification items are separate from the implementation gaps above.

## Remaining-feature implementation pass — 28 October 2026

The user owns the next manual/device walkthrough. The current source implementation, corrected source/build issues, deployment blockers and explicit limitations are recorded in `REMAINING_PARITY_IMPLEMENTATION_2026-10-28.md`. Use `MANUAL_MOBILE_VERIFICATION.md` for the walkthrough and `DELIVERY_RECEIPT_2026-10-28.md` for the current build results/artifacts. Earlier backlog entries above are historical and must not be read as the latest feature matrix.

No live messages/calls, announcements, email invitations, PDF import or financial mutations were executed in this pass. No hosted schema/RLS/credential/history change was applied. The personal membership fix and remote push server package are isolated review proposals, not deployed fixes. Local regression checks are not device acceptance.
