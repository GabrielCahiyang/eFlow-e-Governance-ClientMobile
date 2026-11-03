# Native feature implementation handoff — 28 October 2026

Scope: eFlow Mobile, Android and iOS, for Head, Member and Accounting Staff. Admin remains web-only. Hosted target remains `ixnfphgjyelhckjwjkdv`.

The user owns the next manual/device walkthrough. No browser walkthrough, PDF import execution, messages, real calls, announcement publication, invitation email, financial mutation or hosted migration was performed in this implementation pass. Compilation and local regression checks are distinct from acceptance.

## Changes implemented

| Area | Native implementation | Important boundary |
| --- | --- | --- |
| Communication | Direct/task/standing Office conversations; authorized colleague selection; realtime messages; actor/channel-scoped retained sends with the same message ID on retry | Server RLS and workplace moderation remain authoritative. Older messages load in timestamp/ID pages and merge by identity. |
| Calls | Native WebRTC audio/video, existing calls-table signaling, incoming answer/decline, mute/camera controls, end/cleanup, unanswered timeout | Foreground only; remote networks need ICE configuration. OS background incoming-call integration is not implemented. No real call was placed. |
| Announcements | Strict authorized reads, read/unread state, publisher audience/expiry editing, existing save/publish/withdraw/delete operations, realtime updates | Publisher controls use existing permissions. Recipient materialization and email/push depend on the existing server/service workflow. Unknown write outcomes require checking the list before retrying. |
| Unified inbox | Task/subitem review actions, assigned independent financial reviews and the existing notification feed | Assigned financial reviews have a dedicated package route, so opening an assignment does not require broad Office Budget navigation. Review approval still does not grant posting authority. |
| Project access | R8 sponsor/request/approval/email delivery/onboarding/private PDS actions; R9 recipient-bound member/viewer grants, membership terms, native link sharing/redemption and reviewed removal | Grants retain the original ID on retry. Sign in as the invited recipient. This does not change permanent roles or grant Office-wide access. Existing Office contact invitations remain manual. |
| Project planning | Milestone create/edit/delete/manual status, task links and milestone ordering; saved personal views; drag/arrow task ordering; CSV/PDF export of the visible task scope | Views are stored per account/project on this device. Reordering saves through the existing RPC. Completion/review rules are not bypassed by moving a card. |
| Native PDF import | Android PDFBox and iOS PDFKit text/coordinate extraction, drawn table rules, shared work/budget layout parsers, source-total checks, saved server sessions, office-name review, Qwen + LAYA assignment and publish receipt | No PDF walkthrough was run. Scanned/locked/rotated PDFs and unreadable financial tables fail explicitly. New offices remain unstaffed until manual invitation. A committed result suppresses stale processing errors. |
| Personal work | Existing R3 task workflow plus membership editing, R9 reviewed removal, sharing, Office shortcut and audit activity | The recorded server eligibility mismatch remains a deployment blocker. The guarded proposal is prepared in `delivery/personal-eligibility`, not applied. |
| Finance | Authorized Office scope selection, request/approval/release/acknowledgment/correction/settled filters, corrections routed to work funding, CSV/PDF financial exports, journal line exports | Existing fiscal locks, funding conservation, receipts, independent review and posting guards remain in force. Cross-Office reads/actions still require server authorization. |
| Presentation | Persisted Light/Dark/Device appearance, source-token remapping for native primitives/static styles, dark dialogs/typography/brand, existing reduced-motion and loading components | Screen-by-screen visual and motion acceptance remains a device checklist item. This is not a claim of a completed pixel comparison. |
| Push | Explicit device permission/token registration, unregister-before-signout, notification-tap routing; isolated registry/outbox/dispatcher source proposal | **Not live.** Needs reviewed backend deployment, EAS project ID, FCM/APNs credentials and a scheduled dispatcher. Missing setup produces an actionable error; it does not pretend to deliver push. |

## Source/build issues corrected during this pass

These are implementation findings, not claims of new live QA reproductions.

| Finding | Correction |
| --- | --- |
| Native Import PDF button navigated to an unrendered import view | It opens a native modal with busy dismissal lock and saved-session recovery. |
| Android PDFBox override used the upstream desktop winding-rule type | Changed the native overrides to Android `Path.FillType`; the native Kotlin module subsequently compiled. |
| Release shrinking stopped on two optional/generated dependency references | Added exact managed ProGuard rules after inspecting the installed AAR: PDFBox optional JPX image decoder is unused by text/vector extraction; Jitsi M155 retains an unreferenced `Dav1dDecoderJni` shim without its Java decoder/interface. No blanket suppression was added. |
| Membership end-date editing used the device timezone and inclusive rendering | Reused the source workspace-timezone `accessEnd`/exclusive-end `accessEndDate` helpers. |
| Plain native PDF text would omit the web parser's financial table markers | Native adapters now return positioned text and drawn rules to the shared table parsers. Recognized but unreadable budget tables and unparsed project-cost totals stop import. No financial amount is inferred by the adapter. |
| Browser-global adaptation renamed a JSON/type property called `document` | The adapter excludes property signatures; the office-extraction payload preserves the server's `document` field. Browser PDF.js export is replaced by a native adapter. |
| Cash correction action was absent in the Office queue | Request cards now open the task/subitem funding flow for correction and re-request. |
| Personal member revocation would use a legacy command rejected by R9 | Native removal now previews responsibilities and submits the checked fingerprint and original removal request. |
| Independent-review navigation could require unrelated Office navigation access | A package-only authenticated route loads only reviews assigned by the server to the current actor. |
| Initial native communication omitted standing Office channels | Channel loading now includes authorized ancestor Office channels as in the web source. |
| A call error dialog could retain its error after End/Close | End clears the error and media resources; async SDP/ICE failures are caught and unanswered calls time out. |
| Static light colors persisted inside animated dialogs | Shared primitives, typography, animated surfaces and brand now respond to the persisted appearance preference. |
| Source announcement reads could silently return an empty list on backend failure | Native reads propagate failures and preserve recipient/Office/expiry filtering. |

## Still requires deployment/configuration, not just a device check

1. Apply the separately reviewed personal eligibility fix through an isolated live-history migration workspace after backup/drift review. Mobile does not override server eligibility.
2. Deploy/configure remote push: registry/outbox, dispatcher schedule, EAS ID and FCM/APNs credentials. The source package is isolated in `delivery/`; it was not executed.
3. Configure STUN/TURN for calls between remote networks. Production TURN credentials should be short-lived.
4. Build/sign iOS on a Mac with Xcode. A Hermes JS export does not compile Swift, link pods, validate APNs or produce an IPA.
5. Universal/app links for deployed HTTPS invitation URLs require domain association and platform signing. The `eflow://` scheme and trusted-origin parsing are implemented.

## Acceptance ownership and evidence

See `MANUAL_MOBILE_VERIFICATION.md` for the user's walkthrough and `DELIVERY_RECEIPT_2026-10-28.md` for current build results/artifacts. Historical web-preview screenshots and old development APKs are not evidence for this version. No automatic live verification was substituted for the user's testing.

This handoff does **not** declare full one-to-one acceptance: background call wake-up, any remaining nested web-only view/actions and platform visual comparisons must remain visible in the backlog. Backend configuration blockers above cannot be described as “only needs testing.”
