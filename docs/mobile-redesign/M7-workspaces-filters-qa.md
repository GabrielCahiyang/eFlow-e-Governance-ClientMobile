# M7 — Home, workspace favorites and compact filters (build 23)

Historical build-23 record. [Build 24](M7-favorites-material-qa.md) supersedes the Favorites card/sheet presentation and light Recently visited material. The toolbar, Workspaces entry, filter behavior and authorization boundaries described here are retained.

Implementation complete; personal acceptance pending. This is an authorized M7 UI/UX correction. It does not begin a new phase or change hosted contracts.

## Feature inventory: before / after

| Surface | Before | Build 23 |
| --- | --- | --- |
| Home greeting/profile | Separate greeting/avatar area inside the scroll content; profile was not its action. | Greeting, initials and profile action in the Home toolbar. Current Office/personal workspace remains on its right. Profile opens on the Home stack and Back returns there. |
| Home lower content | Large “Nothing needs your attention here” area; duplicate My Work/Inbox navigation cards; Office attention widget. | These presentations are removed from Home’s normal route and replaced by a compact Workspaces row opening the authorized workspace sheet. My Work, Inbox and their backend operations remain available in their normal tabs. |
| Home favorites | Decorative current-workspace preview, unused page dots and arrows redirecting to Projects. | Real, actor-scoped favorite workspaces. Header/add actions open a native bottom sheet. Star existing authorized workspaces, open a favorite directly, or remove its star. No fake pagination. |
| Recently visited workspace row | Sent the user to Projects. | Opens the workspace chooser. Project rows retain exact Office/personal project navigation. |
| My Work “+” | Floating plus opened filter options. | Removed. No generic task-creation action was invented. Existing date cards toggle the actual date filter and expose selected state. Duplicate date/workspace pill row removed; compact visible current-filter chips and Clear remain. |
| My Work date wording | “This Week” selected every upcoming date. | “Upcoming” matches the retained grouping semantics; it does not imply a seven-day range. |
| Projects filter | Wide button; current default status was not clearly summarized. | Compact control beside search, explicit current-status chip, unique result count and clear action. Filter selection and actual rows update together. |
| Workspace selection | Authorized Office/personal picker; retained original route and tab after switching. | Native sheet now includes search and local favorite stars. Existing selection service, role checks, route/branch retention and out-of-context denial remain. |

No primary tab was removed. No task, subitem, evidence, review, financial or server operation was deleted. The obsolete Home attention/duplicate shortcut UI is no longer reachable through Home; its underlying work data and services are not deleted. Retired report/team code was not expanded.

## Task creation clarification

The existing mobile personal-project editor already exposes Add task to the owner of an active personal project with eligible assignment members. Its task lead defaults to the actor, must remain eligible, and any selected reviewer must be someone else. Server validation still applies. This is a project-scoped workflow, rather than an unrestricted My Work personal to-do composer. It is unchanged in this build. Office task creation/authority is not added by this redesign.

“Add workspaces” in Favorites means adding an existing authorized workspace to a local personal list. It does not create a workspace, add members, alter account roles or grant access. Project favorites in Projects retain their separate existing behavior.

## Authorization, preferences and recovery

- Workspace favorite IDs use the existing local preference adapter, separated by actor and `mobile-workspaces` context. They contain IDs only; no password, token, capability or record payload is stored there.
- Displayed favorites intersect the active authorized workspace list. Missing/revoked workspaces disappear; incomplete loading does not prematurely erase preferences. A different signed-in actor never inherits the first actor’s list.
- Selecting a favorite uses the same validated workspace-selection path as the toolbar. Existing originating-tab and exact task/subitem route handling remains. Stars and navigation are never permission grants.
- Current filtering is display-only. Opening a result still uses the existing protected route and authoritative action checks. No RLS, grants, schema, migrations, hosted accounts/data, finance rules or gateway infrastructure was changed.
- Native sheets use existing `@expo/ui` controls, existing eFlow theme tokens and the installed platform implementation. No new animation recipe was introduced. Existing reduced-motion behavior is retained.

## Results

| Check | Status | Evidence / limit |
| --- | --- | --- |
| TypeScript / Metro | VERIFIED | 9 Metro boundary checks. |
| Automated checks | VERIFIED | 235 tests / 75 suites. Includes workspace favorites, account isolation, hidden/revoked workspace filtering, native-sheet add/remove logic, Today-card filtering, compact Projects filter state/rows, profile Back and original tab/branch recovery. Mock actors only; no hosted mutations. |
| Android / iOS production JavaScript exports | VERIFIED | Separate bundles; iOS export is not native iOS acceptance. |
| Android release build / source / signing / credential audit | VERIFIED | Version 23, ARM64/x86_64; embedded non-debuggable bundle; 172 native sources and the real entry match current files; same local QA signer. Three production bundles pass the credential audit. No preview marker, local override or credential file packaged. [APK receipt](M7-latest-v23-apk-verification.json), [audit](M7-latest-v23-release-audit.json). |
| Actual Android native component screenshots | VERIFIED (limited) | Offline Home light/dark and 1.3 font-scale body, native Favorites/Add sheet, starring a fixture and showing it on Home. No authenticated actor or hosted mutation. Native keyboard/TalkBack, Projects/My Work visual and real navigation acceptance are NOT TESTED. |
| Standalone APK install / launch | VERIFIED | Build 23 installed and launched without Metro on isolated Android API 36/x86_64. Actual logged-out screen inspected. No account or server mutation. |
| Approved Head/Member/Accounting role sessions, workspace switching against hosted membership, real task/review workflows | BLOCKED | Approved dedicated actor-role/fixture mapping unavailable. Source/component results do not establish those workflows. |
| Personal Android acceptance and iOS native runtime/accessibility | NOT TESTED | User phone check pending; Windows has no iOS native runtime. |

## Actual Android screenshots

These are emulator captures of the actual native presentation components using offline props. The caption identifies them as a component preview; “Design Preview” has no hosted identity or server-confirmed role. They are not authenticated workflow results.

- [Home, light](../../artifacts/M7/build23-home-preview-light.png), [Home with a pinned workspace](../../artifacts/M7/build23-home-pinned-preview-light.png).
- [Home, dark](../../artifacts/M7/build23-home-preview-dark.png), [Home, dark at font scale 1.3](../../artifacts/M7/build23-home-preview-dark-large.png).
- [Favorites sheet](../../artifacts/M7/build23-favorites-preview-light.png), [Add to favorites](../../artifacts/M7/build23-add-favorites-preview.png).
- [Actual standalone build-23 logged-out launch](../../artifacts/M7/build23-release-login.png).

The preview initially needed development-server/entry recovery, and its temporary font wait was removed to inspect the presenters. Product startup was unchanged. The real app entry is restored byte-for-byte; the root preview file and isolated server were removed, and release source/string checks exclude fixtures. The existing user emulator was not overwritten. Full native toolbar navigation is verified only by routing tests with mocks; the preview toolbar container is separate from the app's native navigation header. Keyboard/search in the native sheet, TalkBack and signed-in native My Work/Projects appearance remain unexecuted.

## Personal QA / account matrix

| Scenario | Account/context | Safe current-backend check |
| --- | --- | --- |
| Home profile toolbar, Workspaces row and Favorites | Existing authorized Head or Member; at least one available workspace | Read-only navigation and reversible local preference. No extra account required just for this UI check. |
| My Work date/workspace filters | Head, Member or Accounting Staff with assigned work across relevant date groups | Display-only filtering. Use safe fixtures for deterministic Today/past/upcoming counts. |
| Projects status/search and exact project detail | Any supported role with visible projects | Read-only. Office/personal project types must open the correct existing screen. |
| Workspace switch from a task/subitem, Back and return to original branch | Dedicated approved actor authorized for two workspaces; a safe nested task | Navigation-only; no assignment/review mutation is required. Missing membership is BLOCKED. |
| Existing personal task creation (unchanged) | Dedicated personal-project owner who is an eligible member; separate eligible reviewer if review is required | Not exercised in this change. Creation requires approved safe fixtures; do not use production work for a layout check. |

## Personal checklist

1. Install build 23 over your existing standalone APK without clearing app data. Head/Member: open Home. Verify no second greeting in the body, no large attention illustration or duplicate My Work/Inbox cards. Confirm the toolbar shows your profile and the current workspace on the right.
2. Tap your toolbar profile; Back should return to Home with Home still selected. Tap Workspaces (or the recent workspace row); expect an Office/personal workspace sheet rather than Projects.
3. Open My favorites. Add workspaces, star an existing workspace, tap Done and close. The favorite should appear on Home. Reopen and remove its star. Restart the app to check persistence. A second authorized account should have its own favorites; no membership is added by starring.
4. Open a favorite workspace. Confirm the toolbar context changes through the normal authorized selection flow. Switch away from an exact task/subitem and return to its original authorized workspace; the original tab and branch must be preserved. Do not claim access to a record just because the workspace is selected.
5. In My Work, tap Today, Past dates or Upcoming. The selected card and date chip must match the visible rows. Tap the same card again to reset dates. Select a workspace and verify its name is visible; Clear filters must reset date/workspace/search. There must be no floating plus that opens a filter.
6. In Projects, open the compact Filter control. Choose a status such as Archived; confirm the visible chip and results match. Search and clear filters; current projects is the default. Starred project items remain project favorites, separately from Home’s workspace favorites.
7. On Android/iOS separately, test light/dark, large text, reduced motion, long profile/workspace names, empty search, keyboard search inside the sheet, Android Back/swipe dismissal and screen-reader labels. Record exact actor, server-confirmed role, Office and device. Do not count offline preview actors as hosted QA identities.

M7 stays pending explicit user acceptance. No push, merge, deployment or hosted modification was performed.
