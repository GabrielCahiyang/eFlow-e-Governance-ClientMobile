# M7 Office project table pagination

[Android APK v34](../../artifacts/M7/eFlow-Mobile-M7-Main-Table-v34-arm64-x86_64.apk)

| Area | Before | Build 34 |
| --- | --- | --- |
| Office Main table | The app fetched every task page before opening the table. | The first request supplies up to 50 rows. Scrolling near the bottom fetches and appends the next batch in project group order. A failed next batch offers Retry below the existing rows. |
| Task search | Search filtered the full task array in memory. | Search matches title, description, and assignee across authorized tasks on the server. Each search starts its own sequence of pages. |
| Completion and group counts | All counts were calculated from the task array. | Completion uses project-wide counts independent of search and paging. Group labels count the rows currently loaded while more results are available. |
| Other views | Board and Agenda used the full task array. | Board and Agenda still use the full task array and load it when opened. Personal project views keep their existing workspace snapshot. |

Use a dedicated **Head or Member** authorized to read an Office QA project with more than 50 visible tasks. Include at least two groups, a task in a later group with a unique title, and completed and cancelled tasks. Use an archived Office QA project to check historical rows. These checks are read-only and need existing approved fixtures.

1. Open **Projects → the Office QA project → Main table**. Confirm the first rows appear, the completion count matches the project, and the group names and pinned Task column are in their expected positions.
2. Scroll toward the bottom and confirm more tasks appear automatically. Continue across group boundaries and to the final task. Confirm no duplicate rows and no new rows inserted above your current position during pagination.
3. Reopen the project and search for the unique title in a later group before scrolling. Verify the task appears and the completion count stays the same. Clear search and confirm the unfiltered table returns. Check search while the keyboard is open.
4. Temporarily disconnect before reaching a page boundary. Confirm existing rows remain visible, then reconnect and tap **Retry**. Verify the missing page appends once.
5. Pull to refresh from the top. Confirm the table starts again from its first batch and the selected navigation tab stays highlighted. Try dark mode, larger text and reduced motion. Check the loading and Retry footer with TalkBack or VoiceOver.
6. Open an archived project and check that its historical rows remain visible and read-only. Open **Board** and **Agenda** and check their full project views still load.

## Verification

- **VERIFIED** on an isolated Android API 36 emulator with a local 62-task fixture and no hosted account. The first view showed 50 loaded rows and a project total of 62. A vertical swipe reached the footer and triggered the next request. The final screen included row 62. Searching from the first page found row 62 while the keyboard was open. [First page](../../artifacts/M7/build34-pagination-first.png) · [Loading](../../artifacts/M7/build34-pagination-loading.png) · [Last rows](../../artifacts/M7/build34-pagination-appended.png) · [Search](../../artifacts/M7/build34-pagination-search.png)
- **VERIFIED** for TypeScript and Metro checks, Android and iOS production JS exports, signed Android APK installation and launch, and the credential audit. The APK includes the production pagination source and excludes the local fixture. [APK verification](../STANDALONE_V34_APK_VERIFICATION.json) · [Credential audit](M7-main-table-v34-release-audit.json)
- **VERIFIED** in automated tests for page boundaries, stable cursor ordering for equal positions, retries, duplicate prevention, archived scope and project-wide completion counts. The final full rerun passed all 256 tests across 81 suites. Earlier runs logged a SettlementPanel auth teardown error after all tests passed. SettlementPanel also passed in isolation.
- **BLOCKED** for live Office pagination on an approved actor session and a hosted QA project with enough rows to cross a page boundary. Native iOS compilation and device behavior require a Mac or iOS device.
- **NOT TESTED** for this change on a personal device, with TalkBack or VoiceOver, or with alternate themes, font scaling and reduced motion. Personal acceptance is pending.
