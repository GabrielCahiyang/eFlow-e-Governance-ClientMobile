# M7 project table and archived-project QA

| Surface | Build 24 | Build 25 |
| --- | --- | --- |
| Office project open | The project task list passed an onRefresh callback without the required boolean refreshing prop. React Native throws when it mounts that list, including on archived projects. | The project list uses the shared manual-refresh state. Background updates leave the refresh indicator off. |
| Main table | Task cards showed status, owner, and due date as chips below the title. | Project groups have color rails, counts, repeated column headers, and aligned Task, Status, Owner, Due date, and Office cells. One horizontal scroll keeps the columns aligned across groups. Project controls and group names remain in view. Tap a row to open its task. The loading skeleton uses the same column widths. |
| Bottom tabs | Inbox occupied position three for Head and Member and position two for Accounting Staff. | Head and Member see Home, My Work, Projects, Inbox, More. Accounting Staff see My Work, Accounting, Projects, Inbox, More. |

The visual reference was the canonical eFlow Web checkout at commit 12c334d204da6b4f5e9ab624afa7f0f189837dd9. The native grid adapts its group rails, headers, and column cells to five fields. Desktop inline editing and configuration stay on the web. The archived and completed project notice and task history remain available through existing authorization.

## Personal checklist

1. Install [Android APK 25](../../artifacts/M7/eFlow-Mobile-M7-Latest-v25-arm64-x86_64.apk) over your current standalone build.
2. With an authorized Head or Member account, open Projects, filter to Archived, and open the project that crashed. Expect the read-only notice and the Main table or its empty state.
3. Swipe the table sideways in light and dark mode. Verify the group names remain visible, cells align, and the owner, due date, and Office values agree with the project. Search for a task, then clear the search. Open a historical task and use Back to return to the project.
4. Pull to refresh, then leave the project idle. The refresh circle should appear for the pull and disappear when it finishes. Switch to Board and Agenda and confirm they still open.
5. Tap the fourth icon and confirm it opens Inbox. If you have an authorized Accounting Staff account, check that Accounting is second, Projects third, and Inbox fourth.

Your existing authorized accounts are sufficient for these read-only checks. Use an already archived project you can access.

## Verification

- Automated checks VERIFIED. TypeScript, nine Metro boundary checks, 239 tests across 78 suites, and separate Android and iOS production JavaScript exports passed.
- Android component QA VERIFIED using local offline fixtures on API 36. Checked light and dark layout, group alignment during horizontal and vertical scrolling, the keyboard, search after panning, Clear search, and dispatch to the selected task. The footer preview used the Member tab configuration. No server-confirmed actor was used.
- Android release VERIFIED. Build 25 installed and reached the real sign-in screen with Metro stopped. The existing local QA signer, 175 bundled native source files, and the real entry point were verified. The three-bundle credential audit passed. [APK verification](M7-latest-v25-apk-verification.json) · [Credential audit](M7-latest-v25-release-audit.json).
- Signed-in emulator workflow BLOCKED because an approved dedicated actor with an archived Office project was unavailable. The reported phone crash on that exact project, native iOS, large text, and screen-reader interaction are pending.

Android screenshots from offline component QA: [Light](../../artifacts/M7/build25-table-light.png) · [Dark](../../artifacts/M7/build25-table-dark.png) · [Scrolled columns](../../artifacts/M7/build25-table-pan.png) · [Search recovery](../../artifacts/M7/build25-clear.png). [Standalone sign-in](../../artifacts/M7/build25-release-login.png).

APK SHA-256 `10123f00091856a8e8134049cf902b95ff4a97a1476eb3f7ab4deeee81ac084d`. M7 personal acceptance remains pending.
