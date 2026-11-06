# M4 personal QA — retest and acceptance checklist

**M4 remains unaccepted.** This retest stays in M4. Use the checklist below for personal acceptance. Earlier phase evidence is retained in its original receipts.

## What changed in the retest

- Announcements requests only the signed-in actor's recipient rows with their related notice and that actor's own published notices. Audience labels no longer infer access. The first confirmed read timestamp is preserved on retry. The app distinguishes a recursive policy from an empty feed.
- Office Team keeps the shared authenticated gateway and canonical GET route. It validates the roster and distinguishes session expiry, denied access, a missing route, an invalid response, and a connection failure.
- Project conversations still list authorized task threads in the current project. Dedicated project-wide rooms and chat attachments are intentionally unsupported by the installed text-channel contract.
- The prior M4 evidence picker, upload recovery, versioned review, activity, Personal ancestor review and text communication are included. New automated fixtures exercise the evidence and review screens through selection, confirmation, retry and the worker's read-only decision view.

The native changes are in `AnnouncementsScreen.tsx`, `announcementReads.ts`, `OfficeTeamScreen.tsx`, new `officeTeamReads.ts`, `app.json`, and the new tests for announcement reads, Office Team, evidence, review and chat receipt recovery. The base commit is `6d4f19fc1829e9470d8dca2de524a2041b93521d`. Canonical web source was checked at `b8d9fd8a7195b50fe7446b45092c9528586b0778`.

## Build and evidence

| Check | Result |
| --- | --- |
| `npm run check` | VERIFIED. TypeScript and nine Metro exclusion checks passed. |
| `npm test` | VERIFIED. 162 tests across 58 suites passed, including mocked fixture workflows. |
| `npm run build:android` and `npm run build:ios` | VERIFIED. Both Hermes JS exports passed. |
| Working-tree source | `72c35a6b48b2fc992c983a5b2095a751a4dd06f39f4b73de05dc4ac329205459`. [Source and export hashes](M4-retest-source-identity.json). |
| Standalone Android release assembly | VERIFIED. Version 1.0.0, code 10. `arm64-v8a` and `x86_64`, non-debuggable. Embedded source, manifest camera permission and signature verified. [APK receipt](M4-retest-apk-verification.json). |
| Credential audit | VERIFIED for both exports and embedded APK. [Credential audit](M4-retest-release-audit.json). |
| iOS native compile and device acceptance | BLOCKED on this Windows host. No Xcode or device. |

[eFlow-Mobile-M4-Retest-QA-arm64-x86_64.apk](../../artifacts/M4-retest/eFlow-Mobile-M4-Retest-QA-arm64-x86_64.apk) has SHA-256 `b343f25a726bc48bdb017c7d6c5c543e7cb8a1a62eced0f2dc11198de95153f2`. Local Android QA signing certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

Install the standalone package on an ARM64 Android phone or x86_64 emulator with USB debugging. The build embeds JavaScript and uses the protected local QA gateway for fresh login and Office Team.

```powershell
adb -s <serial> install -r artifacts/M4-retest/eFlow-Mobile-M4-Retest-QA-arm64-x86_64.apk
adb -s <serial> reverse tcp:8322 tcp:8322
```

Enter the account password yourself in the app. Keep the owner-run gateway and ADB connected. Use normal protected sign-in. [Local setup](M0-login-fix-qa.md).

## Verified on the emulator

The retest APK installed and cold launched as code 10 on `emulator-5556` (Android 16 API 36, x86_64). Profile confirmed the restored `bplo.head@gmail.com` session, role `head`, LEDIPO. [Actor profile](../../artifacts/M4-retest/profile.png).

| Workflow | Result |
| --- | --- |
| Announcements error handling | VERIFIED. The retest displayed the policy-specific unavailable state and Retry. Reading and marking a notice remain BLOCKED. [Screen](../../artifacts/M4-retest/announcements-policy-blocked.png). |
| Office Team error handling | VERIFIED. The unreachable gateway displayed the connection-specific Retry state while Office attention still loaded. Roster access remains BLOCKED. [Screen](../../artifacts/M4-retest/office-team-gateway-blocked.png). |
| Task Activity and navigation | VERIFIED. Venue Reservation showed an attributed subitem completion event. Its conversation route showed the unavailable state for this actor. Android Back returned to the exact Activity view. [Activity after Back](../../artifacts/M4-retest/task-activity-back.png) · [Conversation](../../artifacts/M4-retest/task-conversation.png). |
| Display | VERIFIED for Office attention in dark mode, at 150% font scale with Android animator duration disabled. Emulator settings were restored. [Display](../../artifacts/M4-retest/office-attention-dark-large-text.png). |
| Live writes and fresh login | BLOCKED. The restored actor was used for read-only checks. Dedicated QA accounts, approved writable fixtures and a working protected gateway are still needed. |
| Physical Android and native iOS | NOT TESTED on a physical Android phone. Native iOS build and device verification are BLOCKED on this Windows host. |

## Backend blockers and separate approvals

| Dependency | Diagnosis and next authorized step |
| --- | --- |
| Announcements | Both tables independently reproduce PostgreSQL `42P17` in authenticated-role query planning. The reciprocal SELECT policies cause recursion before a row is returned. The authorized feed and read-marker operation are blocked until the policy is repaired. |
| Office Team and fresh sign-in | The app uses the canonical `GET /controlpanelEflow/api/office-team`. The emulator forwarding exists and the host has no listener on port 8322. The published discovery hostname also returns NXDOMAIN. The local QA owner must provide the existing private gateway process. Normal device access requires approval of a durable HTTPS gateway deployment or restoration, then separate approval of the shared discovery setting change. |
| Office review concurrency | The installed decision RPC accepts a task ID and resolves the current submission on the server. Mobile re-reads the selected pending version after confirmation and verifies its decision receipt. The backend does not bind the command atomically to an expected submission ID. |

The separate policy proposal includes both reproductions, a candidate repair, permission tests, rollback scope and the precise gateway approvals. It was reviewed against the current catalog and canonical source. No backend change was applied. [Backend proposal](M4-backend-proposal.md).

## QA accounts needed

These are fixture labels, not account names or credentials. Provide the approved account identifier, its server-confirmed role and Office, and the existing QA project or task IDs. Keep all passwords out of source, notes and messages.

| Label | Permanent role and Office | Required contextual access |
| --- | --- | --- |
| **Worker A** | Member in approved QA Office A | Task Lead on QA roots A and B. Subitem Lead on the Personal leaf and its immediate ancestor for the fallback fixture. Active member of the Personal QA project. Participant of the safe task conversation. |
| **Reviewer A** | Head appointed for the Responsible QA Office A | Current server-resolved root reviewer for A and B. Active eligible member and next ancestor Lead in the Personal QA branch, with an optional Personal owner fallback fixture. Participant of the same safe task conversation and the second account for receipt checks. |
| **Member B** | Member in a different approved Office B | No access to roots A and B, their evidence, or the private thread. Use an independently approved cross-Office test project to exercise selected project access separately. |
| **Accounting A** | Accounting Staff in approved Office A | Recipient of an authorized QA announcement and only the project permissions assigned for read-only checks. |
| **Existing LEDIPO Head** | Restored `bplo.head@gmail.com`, role `head`, LEDIPO | Read-only baseline only. The real records already inspected are excluded from write scenarios. |

## Test data needed

| Fixture | Initial state | Safety on the current backend |
| --- | --- | --- |
| **Root A** | Approved Office QA project. Active `in_progress` root with Worker A as Task Lead and Reviewer A as the independent Responsible Office reviewer. Every required descendant is complete, and the root has no outstanding cash, finance fixture or live work. | Upload and approve use the installed protected contracts. Safe only on this approved fixture with a harmless photo/PDF. No financial operation. |
| **Root B** | Separate eligible Office root with the same actors. No unfinished descendants or outstanding cash. Use it for interrupt/retry, return and resubmission. | Same restrictions. Preserve all versions and receipts for inspection. |
| **Personal branch P** | Active approved Personal project, open root and leaf with earlier ordered siblings and required descendants complete. Worker A leads both the leaf and its immediate ancestor. Reviewer A is the next eligible independent ancestor. | Submit and decide only on the approved branch. The hosted work tree and checked command choose the reviewer. Office subitems use direct completion and are a separate case. |
| **Conversation C** | Existing authorized task channel in the QA project with both Worker A and Reviewer A as participants. An existing safe direct thread can also be used. | A dummy text is safe only in the approved thread. No new project-wide room or chat attachment. |
| **Notice N and roster** | Published, unexpired QA announcement with Worker A and Accounting A as recipients and Member B excluded. Roster belongs to the appointed QA Head. | BLOCKED until announcement policy and gateway prerequisites are restored. Fixture setup requires the owner or separate authorization. |

Use a small PDF with harmless text and a photo of a blank sheet. These fixtures and accounts must already be approved before any hosted test writes. No production tasks, financial transfers, changes to account roles, or new fixtures were used in this retest.

## Personal test steps and workflow status

Every entry below distinguishes Android emulator evidence from personal acceptance. Run the same ordered cases on the emulator after the prerequisites are met. Repeat camera, file picker and external viewer behavior on a physical Android phone. Run native iOS separately with Xcode or an approved device build.

| # | Workflow and exact steps | Expected evidence | Emulator | Personal |
| --- | --- | --- | --- | --- |
| 1 | **Worker A, Root A**. Open Projects → QA project → Root A → Details → Submit finished work. Tap Choose files, select the safe PDF, remove it and reselect it. Tap Take photo, cancel once and try again. Test the deny-permission fallback before allowing the camera. | The picker shows filenames and sizes. Cancel preserves the draft. Permission denial offers file selection. Selection alone makes no hosted write. | BLOCKED · worker and task fixture. Mocked selection and denial passed. | NOT TESTED · repeat on physical Android and iOS. |
| 2 | **Worker A, Root B**. Select two safe files. Add a note, confirm, and interrupt emulator network when Uploading appears. Reconnect, reopen Root B if needed, and choose Check and resume submission. | One submission version with the original note and file count. Recovery reuses the original ID and immutable file paths. Verify no duplicate rows or objects with approved read access. | BLOCKED · approved fixture. Mocked interrupted reply and same-draft retry passed. | NOT TESTED |
| 3 | **Worker A, Root A**. Confirm Submit for review. Wait for Evidence submission confirmed. Open Evidence & review. | In review status, exact version, worker attribution and matching file list. Reviewer A receives the assigned item. | BLOCKED · approved fixture and reviewer. | NOT TESTED |
| 4 | **Reviewer A, Root A**. Open Inbox → Decisions → Root A. Open its attached safe PDF/photo and check version/author. Tap Approve work and confirm. | Exact version shows Approved with the reviewer’s recorded identity. Cash and descendant completion checks still apply. | BLOCKED · approved pending submission. Mocked exact approval passed. | NOT TESTED · include native file opening. |
| 5 | **Reviewer A, Root B**. Open the exact Inbox decision. Verify Request changes is disabled with blank feedback. Enter a safe reason, tap Request changes and confirm. | That version records Changes requested, the reason and reviewer. | BLOCKED · approved pending submission. Mocked required reason and return passed. | NOT TESTED |
| 6 | **Worker A**. Reopen Inbox and the two root inspectors after Reviewer A’s actions. Verify A approved and B returned. Resubmit B when ready and compare versions. | Worker sees server status and feedback. Resubmission creates a new version and leaves the previous decision and files intact. | BLOCKED · two approved actors. Mocked worker history view passed. | NOT TESTED |
| 7 | **Worker A, Root A pending**. Run after step 3 and before step 4. Check Inbox Decisions and Evidence & review. Do the same as Member B. | Worker sees own evidence without a decision button. Unrelated Member B cannot read the private evidence or decide. Server rejection requires a separately authorized negative test on the same approved fixture. | BLOCKED · dedicated actors and pending fixture. Mocked self-review exclusion passed. | NOT TESTED |
| 8 | **Worker A and Reviewer A, P**. Worker opens the exact leaf, enters a note and submits for review. Reviewer A opens the Personal subitem in Inbox, verifies its path, then decides. Compare with the worker’s view. | The worker’s ancestor appointment does not allow self-review. The next eligible ancestor gets the decision. History remains on the exact branch. | BLOCKED · approved Personal hierarchy and second actor. Automated capability regression passed. | NOT TESTED |
| 9 | **Worker A and Reviewer A, C**. Open Activity → Open task conversation. Send one uniquely labeled dummy text. Reviewer A opens the same thread and checks the sender, timestamp and single occurrence. Back returns to Activity. | A single authorized message reaches the second account. A same-request retry does not create another message. | BLOCKED · no approved shared thread. Empty/unavailable routing and Back were verified. | NOT TESTED |
| 10a | **Worker A and Accounting A, N**. Open More → Announcements, read the authorized notice, and mark the fixture read. Verify it leaves Unread. Repeat as Member B. | Own confirmed first timestamp persists. Unrelated Member B cannot see N. | BLOCKED · hosted `42P17`. Retest unavailable state verified. | BLOCKED · same policy prerequisite. |
| 10b | **Reviewer A**. With the protected gateway running, open More → Office Team. Match the title and active membership to QA Office A. Check Member B cannot open the roster. | Roster comes from the authenticated Head’s Office. The separate Office attention card remains usable when the roster is unavailable. | BLOCKED · no working gateway. Retest unavailable state verified. | BLOCKED · same gateway prerequisite. |

For each authorized run record the actor identifier, server role, Office, fixture and submission or thread ID, observed result, and time. Record **VERIFIED**, **FAILED**, **BLOCKED**, or **NOT TESTED**. Camera hardware behavior, system file viewers, TalkBack and VoiceOver, and native iOS remain personal-device checks. M4 stays open for your review and explicit acceptance.
