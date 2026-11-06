# M7 — Silent automatic refresh and manual pull feedback (build 22)

Implementation complete; personal acceptance pending. This M7 follow-up replaces the Updating notice introduced in build 21. No screen, destination, permission, business operation, backend contract or hosted configuration changed.

## Diagnosis and before / after

The circle in the supplied Home screenshot is Android's native pull-to-refresh indicator. Home passed `facts.loading` to it. The work provider polls stale display data every 30 seconds while the app is active, and Realtime work changes can also trigger reads between polls. Those automatic reads set `loading`, so the circle appeared even when the user never touched the screen. There is no touch-inactivity timer responsible for it. Cache freshness and automatic refresh do not mean the app lost its session.

| Surface | Build 21 | Build 22 |
| --- | --- | --- |
| Home / My Work / Inbox | Native circle could appear for polling, focus or Realtime reads. | Automatic refresh is silent; loaded content remains. The same native circle is retained for a user's pull. |
| Projects and shared detail screens | Indicator used a general query/workspace loading flag. | Indicator tracks the specific manually initiated read until it settles, rather than unrelated queries. |
| Slower account check on resume | Compact Updating notice after 800 ms. | Updating notice removed. Successful account refresh is silent. |
| Resume connection failure | Readable same-account content, plain reconnect guidance and Retry; consequential attempts blocked. | Retained. Removing the progress notice does not hide an actionable failure or authorize an operation. |
| First load with no data | Content-shaped skeleton. | Retained. |
| Cache and account checks | 30-second display freshness, five-minute RAM retention, actor isolation and authoritative checks. | Unchanged. Manual pull still forces a read; the indicator does not determine freshness or authorization. |

## Exact UI changes

- `Screen` owns native pull feedback and awaits its refresh callback. Its consumers return their existing read promise rather than discarding it.
- Home, My Work, Inbox and Projects display the native circle only while their manual pull is pending. Repeated pulls while one is pending are coalesced locally. A failure stops the circle and retains safe error feedback.
- The same shared behavior applies to project details, Task Inspector, linked subitems, conversations, announcements, Accounting overview/queues, assigned financial reviews, and personal project/workspace screens. Obsolete report/team presentation callers received only the read-promise type adaptation; no retired destination was made reachable.
- No mobile screen or navigation entry was added or removed. No authentication/cache/financial command implementation was changed for this follow-up. No generated core or hosted data changes.

## Verification

| Check | Status | Scope |
| --- | --- | --- |
| TypeScript / Metro | VERIFIED | `build22-check.log`; 9 Metro exclusion checks. |
| Automated tests | VERIFIED | 229 tests / 72 suites. Home background loading stays silent; manual pull shows then clears the native circle; My Work has the same behavior; overlapping manual pulls do not duplicate a read; failure permits retry; a prolonged account check has no Updating notice; connection-error Retry and mounted workspace continuity remain. |
| Android / iOS production JS exports | VERIFIED | Separate production exports; this does not establish iOS native compilation or workflow acceptance. |
| Android release compilation / source / signature / credential checks | VERIFIED | Version 22, ARM64/x86_64; non-debuggable embedded bundle; 167 native source files match current source; same local QA signer; three bundles pass credential audit. [APK receipt](M7-latest-v22-apk-verification.json), [audit](M7-latest-v22-release-audit.json). |
| Standalone Android install / launch | VERIFIED | Isolated `eFlow_M7_Resume_QA`, API 36/x86_64. Upgrade from build 21 without clearing data; standalone launch and light/dark login inspected. No account, sign-in attempt or hosted write. This does not verify the signed-in refresh indicator. |
| Signed-in idle/pull behavior on emulator | BLOCKED | No approved dedicated actor-role/fixture mapping was supplied. Automated component regressions above are not a signed-in native workflow result. |
| Personal Android acceptance | NOT TESTED | Use the checklist below with your authorized account. |
| iOS native, TalkBack/VoiceOver, native large text/keyboard/rotation | NOT TESTED | No iOS native runtime on this Windows host; not claimed by exports or tree tests. |

## Actual Android evidence

[Light login](../../artifacts/M7/build22-login-light.png), [dark login](../../artifacts/M7/build22-login-dark.png). These are actual standalone build-22 emulator captures, not mockups. They establish packaging and logged-out appearance only; signed-in Home idle/pull behavior remains blocked for emulator verification.

## Personal QA

Use your existing authorized Head or Member account to inspect Home, My Work, Inbox and Projects. Accounting Staff should inspect My Work, Inbox, Accounting and Projects. No extra account is needed just to check idle/pull appearance. Use separately approved safe fixtures for mutations; do not use Admin or perform real financial actions for this UI check.

1. Install build 22 over the previous standalone APK without uninstalling or clearing data. Sign in normally and load Home (or My Work for Accounting Staff).
2. Leave the phone untouched with its screen on for at least 90 seconds. There should be no spontaneous pull-to-refresh circle and no Updating toast. Authorized live data may update quietly. Repeat on My Work and Inbox.
3. Pull down once. Expect the same native circle shown in your screenshot while that request is pending, followed by its disappearance. Pull again while it is pending; one manual refresh should remain in progress.
4. Repeat on Projects, a task/subitem detail, conversations and your permitted Accounting screens. Initial content may use skeletons; loaded content should not be replaced by a progress toast just because it rechecks.
5. Switch to another app and return. Expect the same screen and no Updating toast. An account check still runs quietly; new consequential attempts must wait for verified access. If Android killed the process, a cold startup remains expected.
6. Disconnect networking after content has loaded and pull again. The circle must stop when the bounded read finishes. Existing content and plain retry guidance should remain. Reconnect and retry; no work/financial action should be repeated automatically.
7. Repeat light/dark, reduced motion and large text. Check that manual progress does not obscure the current navigation. Record the actor's server-confirmed role and Office and whether this was a personal device or emulator check.

M7 remains pending explicit user acceptance. The backend-dependent Announcements, gateway and finance prerequisites remain recorded separately; none were modified here.
