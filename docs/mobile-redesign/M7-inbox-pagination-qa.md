# M7 Inbox update pagination

[Android APK v35](../../artifacts/M7/eFlow-Mobile-M7-Inbox-v35-arm64-x86_64.apk)

| Area | Before | Build 35 |
| --- | --- | --- |
| All | Updates stopped after the latest 50. | Updates start with up to 50 and load older batches near the bottom. A failed batch offers Retry under the loaded updates. |
| Unread | Filtered only the 50 recent updates on the phone. | Loads unread updates directly, including older unread updates outside that first All page. |
| Assigned decisions | Separate section and Decisions filter. | Decisions stay separate and retain their existing sources and authority checks. |
| Refresh | Polling and pull-to-refresh replaced the recent list. | Background refresh keeps the loaded suffix when the refreshed first page still overlaps it. Pulling from the top restarts at the newest updates. |

Use an approved **Head, Member, or Accounting Staff** QA account with more than 50 existing safe notifications. Include at least one older unread update and an assigned decision for the account. Only mark a designated QA update read.

1. Open **Inbox → All**. Confirm assigned decisions appear separately above the updates. Scroll through the first batch and check that older updates appear without pressing a button. Continue to the last update and check for duplicates.
2. Open **Unread**. Confirm an older unread update appears even if it falls outside the first 50 in All. Switch to **Decisions** and check that scrolling does not load updates.
3. Mark one designated older QA update read. Confirm it stays visible as **Read** in All and disappears from Unread. Tap **Open related item** on a QA update with an authorized destination and check Back.
4. Disconnect near the end of a loaded batch. Confirm the loaded rows stay visible and Retry appears. Reconnect and check that tapping Retry appends the batch once.
5. Pull to refresh from the top. Confirm newest updates reappear and the Inbox icon stays selected. Check the loading and Retry footer with TalkBack or VoiceOver, large text and both themes.

The native Inbox adapter reuses the canonical notification row mapper. The native core sync script preserves the mapper export. Paging uses the existing recipient-scoped notification read and an ordered timestamp/ID cursor.

## Verification

- **VERIFIED** on an isolated Android API 36 emulator with a local fixture of 62 updates and one decision. A swipe near the end of the first 50 fetched the next batch and showed update 51 under update 50. After relaunching without paging All, Unread fetched update 62. Decisions showed the assigned decision separately. [First page](../../artifacts/M7/build35-inbox-first.png) · [Next page](../../artifacts/M7/build35-inbox-last.png) · [Unread](../../artifacts/M7/build35-inbox-unread.png) · [Decisions](../../artifacts/M7/build35-inbox-decisions.png)
- **VERIFIED** by TypeScript, Metro checks and the final full run of 258 tests across 82 suites. Tests covered same-timestamp cursor ordering, recipient and unread scope, duplicate prevention, retry, and marking an older update read. The first full run passed its tests and logged a SettlementPanel auth teardown error. The full rerun exited successfully.
- **VERIFIED** for both production JS exports, the signed Android APK, and the credential audit. The APK installed and opened to sign-in on the emulator. The embedded bundle contains the production Inbox implementation. [APK verification](../STANDALONE_V35_APK_VERIFICATION.json) · [Credential audit](M7-inbox-v35-release-audit.json) · [Sign-in screenshot](../../artifacts/M7/build35-release-login.png)
- **BLOCKED** for signed-in testing on a hosted Inbox with more than 50 updates and an approved QA account. The local fixture used no server-confirmed account. Native iOS compilation and device checks require a Mac or iOS device.
- **NOT TESTED** for personal device acceptance, TalkBack or VoiceOver, alternate themes, font scaling and reduced motion.
