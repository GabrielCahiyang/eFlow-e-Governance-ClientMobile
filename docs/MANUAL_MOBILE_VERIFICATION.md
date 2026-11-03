# Your native mobile verification checklist

Use labeled QA records and the existing supported test accounts. Preserve unrelated projects/accounts. Test both Android and iOS; Admin must remain unavailable. This list is for your walkthrough, not a claim that these checks passed.

Before starting: use the current standalone APK/build from `DELIVERY_RECEIPT_2026-10-28.md`, point the app at `ixnfphgjyelhckjwjkdv`, and make the existing server/AI gateway reachable where needed. See `../delivery/README.md` for actual deployment/configuration blockers.

| Check | Expected result |
| --- | --- |
| Head, Member, Accounting sign-in; remembered session; sign-out/restart; inactive account | Correct role destinations and server permissions. No Admin entry or restored Admin access. Retained requests stay isolated between accounts. |
| Phone/tablet, portrait/landscape, large text, keyboard, reduced motion, dark/light/device theme | Readable tables and dialogs, accessible close controls, no clipped footer/buttons or hidden form fields. Appearance persists after restart and device theme changes. |
| Real-time chat between two accounts; direct/task/Office channels; disconnect during send | Authorized channel visibility. A retry uses the same message ID and does not duplicate the send. No other account's retained draft appears. |
| Audio/video call: answer, decline, mute, camera, end, permissions, unanswered, app background | Media and status clean up. Unanswered calls become missed; foreground calls end on background. Repeat on different networks only after ICE is configured. Background call wake-up is outside this implementation. |
| Announcement draft, audience, expiry, publish, read/unread, edit, withdraw and delete | Only authorized publishers can act; intended recipients receive/read content; expired/withdrawn content is excluded. Check unknown write outcomes in the list before retrying. |
| Inbox task/subitem/independent review links | Correct assigned record/package opens. An independent review does not give permission to settle or post a journal. |
| Project member/viewer shares; recipient acceptance; wrong account, expiry, revoke/remove | Recipient binding and access end terms hold. Viewers cannot mutate work. Reviewed removal lists affected staffing and rejects stale previews. No permanent role promotion. |
| Office contact email invitation — not previously accepted as verified | Verify actual email receipt, correct deployed link, pending → accepted/joined, employee versus representative, project-only access and expiry/revoke. Invitation emails were not sent in this implementation pass. |
| Milestones, linked tasks, derived/manual status, drag/arrow ordering | Changes persist after reopening. Task-dependent status updates correctly; no closed-work lifecycle rule is bypassed. |
| Saved views and task exports | Filters, sort and visible columns restore for this account/project. CSV/PDF contains only the selected authorized scope, escapes source text and shares through the OS. |
| Native PDF source extraction/import — optional when you are ready | Use the native build, not a web preview. Confirm source totals and office names; no office staffing/invites happen automatically. Close is locked while processing. Restart resumes the same batch. Unreadable financial tables must stop rather than guess. |
| Personal owner/member/viewer/guest work | **Requires the server eligibility fix first.** Create, staff, progress, submit, review, close/archive, share, remove with impact review; check shortcut and activity. Expired/revoked/viewer access must remain restricted. |
| Realistic annual budget with Q1–Q4 sections and different sources | Draft/lock/adjust/close restrictions persist. Unrelated fiscal years and Offices do not mix. |
| Two tasks with every column used, source-funded task Budget and subitem caps | Funding reduces available Office Budget once when authorized. Changing/rejecting/re-requesting must conserve funding. Cash release and actual spending remain separate from authorization. |
| Petty cash reject → correct → re-request → approve → schedule/override → release → acknowledge | Correct request identity/status and amounts at every step; reason fields enforced; no double commitment or release on reconnect/retry. |
| Itemized liquidation, receipts, returned cash, changes requested, late review, independent review and settlement | Receipts reconcile; conflicted reviewers cannot approve their own package; review and posting remain separate; actual expenses/journal entries post once. |
| Cross-Office accounting and all queue filters/exports | Only explicitly authorized scopes work. Read access does not imply settlement/posting access. Exports match the chosen Office/year/scope and include both journal debit/credit lines. |
| Archive unused funding; downstream prerequisites and reopening | Server's reviewed business rules apply. Any release is audited; reopening cannot silently invalidate approved dependent work. |
| Push enable/disable, foreground/background, notification tap, sign-out/account switch | **Requires push deployment and platform credentials first.** Generic alerts open the current user's inbox; no sensitive content appears on the lock screen. Verify actual handset delivery separately from provider receipt acceptance. |
| Qwen + LAYA small assignment; save/reload; AI gateway unavailable | Eligible team and membership persist atomically. A failure leaves a recoverable original request, not a partial hidden assignment. |
| Help/Live actual microphone, transcription, response/audio, silence, pause/interrupt/end | Your real microphone works; local silence handling advances turns; pause does not cancel synthesis, while interruption/end do. Check real latency and audio permissions on each OS. |

Record failures with account role, Office/project, platform/build, expected/actual behavior and a screenshot. Keep deployment/configuration failures separate from client bugs and from checks you have not run yet.
