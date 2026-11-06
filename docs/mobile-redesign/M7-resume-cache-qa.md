# M7 — Returning to eFlow and display refresh (build 21)

Historical build-21 behavior follows. Build 22 removes the Updating progress notice and makes automatic read indicators silent; see [current silent-refresh QA](M7-silent-refresh-qa.md). Personal acceptance remains pending. This is an M7 bug fix. No screen, destination, business operation, server contract or hosted configuration was added or removed.

## Before / after

| Area | Build 20 | Build 21 |
| --- | --- | --- |
| Normal app switch | Account checks covered the mounted workspace with the branded startup screen and disabled interaction. | The same workspace stays mounted. Navigation, scroll, filters and open drafts remain available while account access is checked. |
| Slow resume check | Full-screen startup animation. | A small “Updating…” notice appears only after 800 ms. No new motion; reduced-motion users receive the same static notice. |
| Temporary connection failure on resume | Cleared the verified profile and replaced the workspace with an account-access error. | Retains the last verified same-account display context. Plain guidance and Retry appear; new consequential attempts stay blocked until verification succeeds. Actual identity mismatch, inactive/unsupported account or access denial still clears the workspace. |
| Brief interruption such as notification shade | Every active event could start another account read. | Inactive → active alone does not start an account check. A true background → active transition does. |
| Overlapping account checks | Parallel checks with competing results. | One check per actor; ordinary retries share it. An access-change event during a check invalidates that result and queues one new check. |
| Display freshness | Cached work/notifications always fetched on remount or focus. | A successful opt-in display read is fresh for 30 seconds. Fresh remount/focus checks reuse its projected rows. Manual refresh, Realtime and work updates still fetch. |
| Routine work updates | Cache invalidation cleared mounted display rows before fetching. | Data invalidation retains rows while revalidating. Access/identity invalidation clears them. |
| Other reads | Overlapping authority reads could duplicate the same request. | Same-key concurrent reads share only the in-flight request. Completed authorization/finance reads are not cached. |
| Cold launch / Android process recreation | Branded startup while fonts, preferences and account context initialize. | Retained. Returning after Android has killed the process can still show startup. |

## Exact cache and authorization contract

- The shared display cache is RAM only, actor-scoped, LRU-bounded to 24 entries, with five-minute retention and a 30-second freshness window. It covers the work feed and recent Inbox notification display rows. Mounted screen state can remain longer; it is not a durable offline copy.
- Work cache projection removes task/subitem/tree/participant/capability source records and sets `actionable` false. Opening a cached row still uses normal record access checks. Cached content never grants permission.
- Account verification still calls the existing Supabase user/profile/permission/Office flow on every true resume. It is coalesced and bounded by a 25-second read timeout. The display freshness window does not apply to it or financial capabilities.
- A same-account transient network/timeout/server-availability failure retains readable context only. New `useAction`, personal-work commands, financial commands and notification-read writes check the live action gate. Finance checks before writing a receipt and immediately before starting its command. A pre-send access loss is cancelled without recording an unknown transaction. Existing unknown-outcome protection is unchanged.
- Already-sent operations are not automatically cancelled or replayed when the app backgrounds. Existing recovery receipts and authoritative record-specific checks remain necessary.
- Sign-out, identity change, definitive account denial and changed role/Office/permission signature clear cached display data. Delayed old responses cannot refill another actor’s cache. A work-change event retains display while refreshing; an access event clears it.
- Remember Me/session persistence, secure recovery drafts, local preferences and existing Supabase token refresh are unchanged. Passwords and financial capabilities are never added to the display cache.
- Supabase reference: [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [auth state changes](https://supabase.com/docs/reference/javascript/auth-onauthstatechange). No hosted writes were used for this change.

## Verification status

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| TypeScript and Metro boundary checks | VERIFIED | `build21-check.log`; 9 Metro checks. |
| Automated regressions | VERIFIED | 226 tests / 71 suites. Covers continuity of the mounted workspace, actor isolation, background/inactive transitions, retry coalescing, offline recovery, queued access changes, gate enforcement, cache freshness and financial pre-send cancellation. Mock actors: `member-a`, `worker-a`, `worker-b`, `qa-a`, `qa-b`; no hosted accounts or records. |
| Android and iOS production JS exports | VERIFIED | Separate exports; this does not establish iOS native compilation or rendering. |
| Standalone Android compilation, signing, embedded-source and credential audits | VERIFIED | Version 21, ARM64/x86_64; non-debuggable embedded bundle; 166 native source files match; same local QA signer; all three bundles pass the credential audit. [APK receipt](M7-latest-v21-apk-verification.json), [audit](M7-latest-v21-release-audit.json). |
| Fresh Android emulator install and logged-out appearance | VERIFIED | Isolated `eFlow_M7_Resume_QA`, API 36/x86_64. Installed and launched standalone; light/dark screens inspected. Noncredential text `resume-check` survived a Home/background/foreground cycle. No account, password, sign-in attempt or server mutation. This does not verify signed-in resume. |
| Signed-in Android resume, offline access gate and actual role/Office changes | BLOCKED | No approved dedicated account/role/fixture mapping was supplied for this verification. Mock results above are not emulator workflow verification. |
| Personal Android acceptance | NOT TESTED | User must install the new APK and use the checklist below. |
| iOS native appearance/workflows, accessibility services and keyboard/device behavior | NOT TESTED | Windows host; no iOS native runtime available. |

## Actual Android screenshot evidence

- [Light login](../../artifacts/M7/build21-login-light.png), [dark login](../../artifacts/M7/build21-login-dark.png), [form after return](../../artifacts/M7/build21-login-after-return.png). These are actual build-21 emulator captures. They do not establish signed-in workflow acceptance.
- UI hierarchy capture failed because the continuous login motion prevented an idle state. The screenshot files were inspected directly. Large text, screen-reader and native signed-in notice/keyboard layout remain NOT TESTED on this emulator.

## Personal QA — no extra account needed for read-only checks

Use your own authorized Head, Member or Accounting Staff account for steps 1–6. Record the actual server-confirmed role and Office. Do not use Admin. A separate dedicated account is needed only for the optional role-change/security fixture test; do not change production roles or perform real financial actions.

1. Install build 21 over the prior signed standalone APK without uninstalling or clearing data. Launch and sign in normally. A cold launch may still show the branded startup screen.
2. Open Home or My Work. Scroll, select a filter, then open an authorized task or type an unsaved non-sensitive draft. Switch to another app for 5–10 seconds and return. Expect the same screen, position, filter and draft; no full-screen “Getting things done” loader. Repeat on Inbox, Projects and Accounting (Accounting Staff only).
3. Repeat after more than 30 seconds. Existing content should remain while it refreshes. The small Updating notice should appear only if the account check takes at least 800 ms. Pull to refresh explicitly and confirm current content arrives.
4. With the screen loaded, disconnect networking, switch away and return. After the bounded wait, expect the last visible content with plain reconnect/Retry guidance. Browsing remains possible. On a safe dedicated draft, attempting a save must be stopped while access is unverified; do not test with a real approval, release or settlement. Reconnect, tap Retry and confirm the same screen recovers.
5. Open and close the notification shade or a short native permission prompt. It should not restart the app. Also test actual camera/file return in your separately authorized evidence fixture; record whether the underlying operation was already sent or was a new attempt.
6. Repeat in light/dark mode, large text and reduced motion. Confirm the compact notice is readable above the navigation bar and does not hide the current screen or keyboard controls. Use TalkBack personally; automated tree tests do not establish screen-reader acceptance.
7. Optional, approved fixtures only: sign out and use another approved account from another Office. Expect no previous-account records. For actual role/Office changes or revoked access during a pending read, use a separately approved safe setup; production account changes are not authorized here.
8. Force-stop and relaunch separately from ordinary switching. A full startup is expected after process termination because display records are not persisted. No write should be automatically repeated after relaunch.

No Announcements, Office Team gateway, financial infrastructure, migrations, RLS, grants, accounts or backend rules were changed. Existing integration blockers remain recorded separately. M7 remains pending explicit user acceptance.
