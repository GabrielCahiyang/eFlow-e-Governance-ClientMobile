# M7 My Work scroll paging

[Android APK v37](../../artifacts/M7/eFlow-Mobile-M7-My-Work-v37-arm64-x86_64.apk)

| Area | Before | Build 37 |
| --- | --- | --- |
| My Work list | Passed every matching assignment to the virtualized list. | Starts with up to 40 matching assignments and reveals up to 40 more as you scroll, in the existing group order. |
| Search and date filters | Evaluated the complete authorized work snapshot. | Search and filters still evaluate the complete available snapshot before slicing rows. Summary cards and group counts use full counts for their respective scopes. |
| Network | Loaded the shared Office and Personal work snapshot before displaying it. | Continues to use that snapshot and its session cache. Scrolling only changes how many rows the list can display. |

Use an approved **Head, Member, or Accounting Staff** account with more than 40 assigned QA tasks or subitems. Include multiple date groups, Office and Personal assignments where available, and a uniquely named assignment sorted beyond row 40. These checks are read-only.

1. Open **My Work** and compare the Today, Overdue and Upcoming cards with the available assignments. Scroll across two groups and confirm more rows appear in order. Continue to the last matching item and check for duplicates.
2. Return to My Work and search for the uniquely named item without scrolling first. Confirm it appears and the summary cards keep their counts. Clear the search, tap a date card, and switch workspaces from the filter sheet. Confirm the list and group counts reflect the chosen filters.
3. Open an assignment and an assigned nested subitem. Confirm each opens the correct project and record. An unassigned ancestor should not appear as your assignment merely because you own a descendant.
4. Pull to refresh and check that background refreshes remain quiet. Check both themes, large text, reduced motion, and TalkBack or VoiceOver.

## Network paging prerequisite

The authorized work snapshot currently combines Office task rows, assigned work roots, nested trees, project and workspace metadata, and Personal project snapshots. Inbox also consumes the same snapshot for decision routing. No existing read endpoint returns the combined assignment feed with a cursor, global filters and complete counts.

True network paging requires an approved read contract for the authenticated actor. It needs to return authorized assignments in stable group and row order, apply search and workspace/date filters before paging, and return totals independent of the visible page. It must preserve branch eligibility, ancestor context, history and workspace time zones. No hosted change is included in build 37.

## Verification

- **VERIFIED** on an Android API 36 emulator using an 83-row local fixture. The first screen showed 50 Today and 33 Upcoming. Scrolling passed the first two windows and reached assignment 83. Search found assignment 83 without scrolling first and kept the card counts unchanged. [First page](../../artifacts/M7/build37-mywork-first.png) · [Last rows](../../artifacts/M7/build37-mywork-last.png) · [Search](../../artifacts/M7/build37-mywork-search.png)
- **VERIFIED** for TypeScript, Metro, both production JS exports, and 260 tests across 82 suites in two runs. Automated tests covered row windows across date groups, duplicate scroll events, full counts, search beyond the first window, and filter reset.
- **VERIFIED** for the signed Android APK and credential audit. The APK contains the production My Work source and opened to sign-in on the emulator. [APK verification](../STANDALONE_V37_APK_VERIFICATION.json) · [Credential audit](M7-my-work-v37-release-audit.json) · [Sign-in screenshot](../../artifacts/M7/build37-release-login.png)
- **BLOCKED** for signed-in My Work testing with an approved actor and a large hosted QA fixture, and native iOS compilation and device tests. The Android fixture used no server-confirmed account.
- **NOT TESTED** for personal device acceptance, accessibility services, alternate themes, font scaling and reduced motion in this slice.
