# M7 Office project Board and Agenda paging

[Android APK v38](../../artifacts/M7/eFlow-Mobile-M7-Board-Agenda-v38-arm64-x86_64.apk)

| View | Before | Build 38 |
| --- | --- | --- |
| Board | Downloaded every task before displaying status groups. | Loads up to 50 task rows per page and fills status groups in their existing order. |
| Agenda | Downloaded every task and sorted it by due date on the phone. | Reads a lightweight index of task IDs and date fields, then loads task details by month in pages of up to 50. Tasks without a due date appear after dated tasks. |
| Search and progress | Filtered the loaded task array and showed project completion separately. | Both views search the full authorized project on the server. Project completion totals stay independent of loaded rows. |

Use an approved **Head, Member, or Accounting Staff** account authorized to view an Office QA project with more than 50 tasks across at least two statuses and two months. Include a task with both deadline and due date, a task without a due date, and a task with a unique title beyond the first page. These checks are read-only.

1. Open **Projects → Office QA project → Board**. Scroll past the first window and verify later rows appear in order. Check a status group that spans two pages and confirm there are no duplicates.
2. Open **Agenda**. Scroll from one month into the next. Check that task dates match their headers, that deadline takes precedence over due date, and that undated work is still reachable.
3. Search for the unique task in each view without first scrolling to it. Confirm the project completion card stays the same. Open the result and verify it leads to the correct task.
4. Disconnect before a page boundary. Confirm the loaded rows remain visible. Reconnect and tap **Retry**. Switch views during a later page load and confirm rows from the previous view do not appear in the current view.
5. Open a closed QA project and check historical rows in Board and Agenda. Confirm the Main table still pages and the Task column stays pinned when you swipe horizontally.

Agenda indexes the existing date fields to preserve legacy text dates. It fetches full task rows only when their date window is needed. Both views use the existing project authorization filters.

## Verification

- **VERIFIED** on an Android API 36 emulator with a local 62-task fixture. Board fetched the first 50 rows, then finished To do and loaded In progress. Agenda indexed all 62 dates, loaded the first 50 November rows, then requested the last November row and the December rows separately. Both lists reached task 62 and showed a project total of 62. [Board first page](../../artifacts/M7/build38-board-first.png) · [Board last rows](../../artifacts/M7/build38-board-last.png) · [Agenda first page](../../artifacts/M7/build38-agenda-first.png) · [Agenda last rows](../../artifacts/M7/build38-agenda-last.png)
- **VERIFIED** that search found task 62 without paging in either view, preserved the query when switching between views, and kept the completion total at 62. [Board search](../../artifacts/M7/build38-board-search.png) · [Agenda search](../../artifacts/M7/build38-agenda-search.png)
- **VERIFIED** for TypeScript, Metro, Android and iOS production JS exports and all 264 tests across 82 suites in two runs. Automated coverage includes the request limits, status and date transitions, project-scoped search filters, archive handling, and stable project completion totals.
- **VERIFIED** for the signed Android APK and credential audit. The APK includes the production Board and Agenda sources and opened to sign-in on the emulator. [APK verification](../STANDALONE_V38_APK_VERIFICATION.json) · [Credential audit](M7-board-agenda-v38-release-audit.json) · [Sign-in screenshot](../../artifacts/M7/build38-release-login.png)
- **BLOCKED** for signed-in verification with an approved QA actor and a hosted Office project large enough to cross a page boundary. The Android fixture used no server-confirmed account. Native iOS compilation and device checks require a Mac or iOS device.
- **NOT TESTED** for personal acceptance, screen readers, alternate themes, font scaling or reduced motion in this slice.
