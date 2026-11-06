# M7 - Plain feedback, slow connections and display caching

Updated 6 November 2026, Asia/Singapore. Historical build-20 behavior and verification follow. The user released the packaging hold and build 20 included this change. Build 21 changes resume/freshness behavior; see [M7 resume/cache QA](M7-resume-cache-qa.md) for the current contract. Personal acceptance remains pending.

## Before and after

| Area | Before | Updated behavior |
| --- | --- | --- |
| Shared error panels, action feedback, validation and toast errors | Raw Error.message or converted service strings could reach the screen | Public message boundary supplies static, plain guidance for unrecognized failures. Useful reviewed validation and account decisions remain specific. |
| Login connection failure | Named a secure sign-in service that could not be reached | Says "We couldn't connect. Check your internet connection and try again." A timeout says sign-in is taking longer than expected. No hostnames, providers or infrastructure details. |
| Slow login | Busy button without a longer-wait explanation | After eight seconds, a neutral waiting notice appears. It clears on completion or failure. The form remains busy; passwords are never automatically retried or cached. |
| Account denial / lockout / rate limit | Could forward an account-error message | HTTP decision selects reviewed incorrect-password, confirm-email, locked-account or wait guidance. The denial itself is preserved; an arbitrary supplied error detail is never displayed. |
| Work recovery and password notices | Showed request revisions, internal command names, request IDs or implementation explanations | Explains how to check the previous attempt, avoid duplicate work, refresh or contact the Office Head. Financial settlement versus review authority remains explicit in ordinary business terms. |
| Home / My Work / Inbox display reads | Same mounted view retained data during refresh; remount discarded it | Account-scoped, short-lived memory cache reuses recent assignment and notification display data, immediately revalidates, and labels a last update while waiting or after a failed refresh. |
| Other authorized reads | Could wait indefinitely from the view's perspective | Read waits are bounded at 25 seconds. No automatic write or request replay is added. Existing mounted data is retained on refresh failure; permissions and capabilities remain uncached. |

No destination or business operation was removed or added. Original error objects remain available to internal recovery/permission logic; presentation translation does not change receipt classification or allow a previously denied action. Authored work notes, conversations, evidence, financial records and audit history are preserved, rather than filtered as error feedback. Hosted policies, grants, schema, migrations, accounts and deployed functions were not changed.

## Cache contract

- Memory only, maximum 24 completed entries; an entry expires five minutes after its successful read. The opt-in caches are the signed-in person's work feed and recent Inbox notifications. Other `useFacts` reads do not enter the shared display cache.
- Every cache policy names the actor and every enabled call uses an actor-specific key. Sign-out, identity changes, failed account-access verification and role/Office/permission changes clear the cache. Work/access update events also invalidate it. A previous account's late response cannot refill it.
- Cached work rows contain display fields and exact navigation IDs only. Task, subtask, personal-work, tree, participant and capability source records are removed; `actionable` is false. Cached rows cannot supply a review permission. New detail/action checks continue through the original authorized flow.
- Each cache hit revalidates. Concurrent consumers of the same cached read share the in-flight request. Stale content is labeled "Showing your last update"; errors are still shown. Account/workspace authorization is not inferred from a cached row, selected tab or filter.
- Successful responses replace the displayed last update. Failed reads do not become an empty/success state. Context changes, disabled reads and out-of-order responses cannot publish another record's data. Permission checks fail closed on a missing or timed-out read.
- No disk persistence of work/notification data, no offline sign-in, no cached passwords or login responses, no cached financial execution/review authority, and no queue that blindly replays writes. Existing secure session storage and explicit evidence/financial recovery remain unchanged.
- The read deadline bounds the view's wait; it does not claim to cancel every underlying transport. A late timed-out read is not accepted as the visible result or saved to the display cache. No timeout is applied to writes by this helper.

## Verification

| Check | Result |
| --- | --- |
| TypeScript / Metro | VERIFIED: `npm run check`, nine Metro exclusions. |
| Automated regression suite | VERIFIED: 212 tests in 67 suites. Includes slow-login timing/no duplicate submission, error redaction, cache projection, expiry/bounds, deduplication, context switching, disabled reads, account clearing and stale-response rejection. |
| Android / iOS production JS exports | VERIFIED: both exports passed after restoring the real application entry. This is not iOS compilation or workflow verification. |
| Two-export credential audit | VERIFIED: development account literals absent from both exports. [Audit receipt](M7-messages-cache-release-audit.json). |
| Android light/dark feedback rendering | VERIFIED in an isolated native component preview on emulator-5554 using the existing version-19 debug build. No actor/account and no backend calls. |
| Slow-login timing, no duplicate credentials, last-update retention, timeout, cache expiry/deduplication, actor isolation and late-response rejection | Automated scenarios only; not signed-in emulator workflow acceptance. |
| Real-account login on a throttled or disconnected connection; cache behavior through actual sign-out/account/Office changes | BLOCKED: no approved QA accounts/fixtures were supplied. After restoring the development server, the existing local session account check encountered a connection/DNS failure; no role was verified. |
| iOS native rendering, TalkBack/VoiceOver, actual form keyboard and personal device acceptance | NOT TESTED for this revision |
| New APK / install | NOT BUILT under the existing packaging hold |

Native screenshots show examples side by side, including separate waiting and error messages. In the real login flow the waiting notice appears only while busy; the connection error appears after failure. These images do not establish a successful login or network workflow:

- [Light feedback preview](../../artifacts/M7/messages-cache-preview-light.png)
- [Dark feedback preview](../../artifacts/M7/messages-cache-preview-dark.png)

## Personal QA checklist

Use your approved Head, Member or Accounting Staff account through normal sign-in. No new account is required to review your own permitted screens. Separate safe worker/reviewer identities remain necessary for consequential review/assignment tests; no production writes are authorized by this checklist.

1. Disconnect internet before sign-in. Enter your own details privately. Verify plain connection guidance, retained fields and a usable explicit retry after reconnecting. No technical address or service error should be displayed.
2. Throttle the connection and sign in once. After eight seconds, expect a neutral waiting notice, one busy form and no repeat submission. If it times out, expect clear retry guidance. Wrong-password, locked and restricted-account decisions must remain distinct; use dedicated QA accounts rather than deliberately locking your normal account.
3. With a verified session, load My Work and Inbox. Leave and return to them while the connection is slow. Recently read content may remain visible with a last-update label while it rechecks. Restore the connection and confirm the label disappears when the update succeeds.
4. Change the search/filter and open an authorized record. Its exact destination must remain correct. A timed-out read or cached assignment must not unlock review, approval, settlement or other actions.
5. Sign out and sign in with a second approved account from another Office. Verify none of the first person's cached assignments or notifications appear. Repeat an authorized Office switch and check context labels and exact record navigation.
6. After an authorized safe work change, verify the affected lists update. A delayed older read must not restore the earlier state. No real financial operation is needed for this cache check.
7. On Android and iOS separately, inspect light/dark appearance, large text, screen-reader announcements and keyboard behavior. Record the exact actor, server-confirmed role, Office, connection condition and result. Keep blocked integrations and personal acceptance separate from automated checks.

The normal development app entry was restored after the preview. Metro needed a restart with an IPv4-accessible listener after its temporary preview graph became stale. The app then reached its account-access check and displayed the new plain connection guidance when that read failed. This verifies the public error rendering, not successful account verification or login. React Native developer LogBox diagnostics are separate from release app feedback; no new release APK was assembled.
