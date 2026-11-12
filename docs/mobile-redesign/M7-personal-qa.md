# M7 personal QA — final streamlined app

**Personal acceptance pending.** This package records M7 verification separately from M0–M6 implementation and past QA. The Android package is signed for local QA.

## Follow-up Phases 3–4 — Audit Trail, budget releases and project closeout

- Projects now has a native **Audit Trail** tab and Project options entry. It reads the same authorized, paginated project history as Web and shows the change, actor and time in the workspace timezone.
- Office Budget and Accounting open the release calendar and budget versions from **View budget releases**. Releases become available automatically on their scheduled date. The existing confirmation command is available only for due releases with current Accounting authorization in the Office. The server rejects early releases and stale budget versions.
- Eligible Heads can open **Complete project** or **Archive project** from Project options. The sheet shows current work, finance and governance blockers and rechecks them on confirmation. Project funding shows authorized unused task and project returns. Uncertain funding returns retain their original request and amounts for retry.
- Project creation, AI drafting and PDF import remain Web workflows. The subtask date migration `20261112191530_subtask_schedule_bounds.sql` remains pending in the hosted project. The read-only catalog check confirmed the Audit Trail, budget confirmation, closeout and funding return functions, along with the active scheduled release job.

Mobile TypeScript and nine Metro checks passed. The full Mobile Jest run passed 337 tests in 107 suites. A separate closeout regression passed, and the focused release, funding and navigation run passed 24 tests. The Android and iOS production JavaScript exports and the APK's embedded bundle passed the credential audit. Web TypeScript and the production build passed, along with four Chromium smoke tests against the built app. The isolated date-form test passed with a longer timeout. The broader Web unit run had 2,284 passes, 44 failures, six skips and one unhandled error. Failures included timeouts and assertions for the older Delete subtree label.

Signed Android build 52 upgraded build 51 and cold-launched directly to eFlow sign-in on the x86_64 emulator. The standalone APK includes ARM64 and x86_64, uses the same signing certificate as build 51, and embeds the verified release JavaScript bundle. Physical-device, signed-in and native iOS checks remain pending. [Android APK](../../artifacts/M7/eFlow-Mobile-Alignment-Phase-4-v52-arm64-x86_64.apk) · [APK verification](../STANDALONE_V52_APK_VERIFICATION.json) · [Launch screenshot](../../artifacts/M7/phase-4-v52-launch.png)

| Signed-in check | Expected result |
| --- | --- |
| Head and assigned member open the same project on both clients | Audit Trail shows the same events and respects access after a workspace switch. Search and pagination stay within the current project. |
| Accounting Officer opens a locked budget with two pending dates | The calendar shows both amounts. A future entry is display-only. A due entry can be confirmed with a reference if still pending. A release that the scheduler already confirmed appears in the calendar and budget totals once. |
| Task Lead, Project Lead and Head use an eligible project with unused allocations | The Task Lead returns unused subtask money to its parent. The Project Lead or Head returns unused task allocations. The Head returns the project remainder to Office Budget. Open cash and unfinished work continue to block closeout. |
| Head completes and archives a ready QA project | Completion and archive are separate confirmations and appear in Audit Trail. The server rejects a stale or unauthorized attempt. |
| Contributor updates a task and a subtask | The update appears in activity and the My Work list. The server still enforces final completion and review permissions. |

## Follow-up Phase 2 — My Work and contributor updates

Mobile now uses the Web work feed for assignment and status, and saves contributor updates directly through the shared task and subtask commands. These rules supersede the staged contributor approval and pre-start visibility notes in the earlier M7 walkthrough below.

Signed-in checks remain pending. Compare Assigned work, Leading, Subtasks and History across both clients using the same workspace. Open an assigned subtask before its parent starts. Save an update as a contributor, confirm it appears in activity and the lists, and verify the server still enforces completion and final review permissions. Repeat after a reconnect.

## Follow-up Phase 1 — Subtask dates

- The Web and Mobile subtask editors use the same planned start and due date rules. A new subtask needs both dates when the server exposes the new schedule contract. Existing records can keep a missing start date until the lead edits the schedule.
- The database checks the project, task and every dated parent subtask. It also rejects parent timeline changes that would leave child dates outside the new range. Start dates do not trigger a status transition.
- The prepared Web migration is `20261112191530_subtask_schedule_bounds.sql`. Hosted rollout is pending. An older server continues to expose its current due-date-only contract.

Both TypeScript checks, the Web production build, both Mobile JavaScript exports, 336 Mobile tests, the focused Web form and table tests, and both Chromium subtask checks passed. The isolated database test passed ten date-rejection scenarios. The broader Web test run reported failures, including timeouts and assertions outside the new schedule checks. Signed-in acceptance on the hosted database remains pending.

Signed Android build 51 upgraded the x86_64 emulator and opened directly to eFlow sign-in. It includes ARM64 and x86_64, uses the build 50 signing certificate, and passed the credential audit and source-map checks. [APK](../../artifacts/M7/eFlow-Mobile-Subtask-Dates-v51-arm64-x86_64.apk) · [APK verification](../STANDALONE_V51_APK_VERIFICATION.json) · [Launch screenshot](../../artifacts/M7/subtask-dates-v51-launch.png)

| Check | Expected result |
| --- | --- |
| Project Oct 30–Nov 5 and parent task Nov 1–4 | Nov 1–4 and a same-day range save. Oct 31 or Nov 6 is rejected. Reload Web and Mobile to confirm the same dates. |
| Dated parent subtask | A child cannot start before the parent or finish after it. Shortening the parent, task or project names a conflicting subtask. |
| Older subtask with only a due date | Start is shown as missing. Renaming keeps its stored dates. Editing its schedule requires both dates. |
| Authorized lead and contributor | Verify that an eligible lead can save and a contributor without planning access cannot. Check that the start date does not change task status. |

## Web alignment Phase 4 — Messages and Android delivery

- Type `@` to choose an authorized conversation member. Group chats also offer `@everyone`. The server creates the recipients' Inbox bell alerts. The alert opens the matching conversation and shows the exact message, including older messages outside the loaded page. Message receipt retries preserve the same ID and mention targets.
- Project chats appear under **Pinned** automatically. Pin or unpin other conversations in **Conversation info**. Task chats show their owning project in the list and thread. Unread dots appear on active conversations and the Messages shortcut.
- Long-press your own message and confirm **Delete for everyone**. Both sides keep a placeholder and lose the original content. A completed or archived project and its task chats move to **Archived** as read-only history.
- Authorized leads can change the group name or photo in **Conversation info**. Project and task conversation members can set and clear their own and peers' chat nicknames. Nicknames are scoped to that conversation and appear on messages. The server records changes in the thread.
- Read-only checks confirmed the hosted conversation commands and mention trigger. Mobile uses the deployed Web permissions and project lifecycle. No hosted migrations are required.

TypeScript, nine Metro checks, all 335 tests across 107 suites, and production JavaScript exports for Android and iOS passed. The automated two-participant fixture verifies mentions, exact Inbox links and recipient unread behavior with a mocked backend. Two-account acceptance against the hosted backend, physical Android testing and native iOS compilation are pending.

Signed standalone Android build 50 includes ARM64 and x86_64. It upgraded build 49 and cold-launched directly to eFlow sign-in on the Android API 36 x86_64 emulator. Signature continuity, release source maps, and the credential audit for three production bundles passed. [APK](../../artifacts/M7/eFlow-Mobile-Phase-4-v50-arm64-x86_64.apk) · [APK verification](../STANDALONE_V50_APK_VERIFICATION.json) · [Launch screenshot](../../artifacts/M7/phase-4-v50-launch.png)

| Check | Approved accounts and fixture | Expected result |
| --- | --- | --- |
| Mentions and Inbox | Two members of one project chat and a direct conversation | Send a selected peer mention and then `@everyone` in the group. The recipient sees the unread dot and an Inbox alert for each message. Tap an older alert to open its exact message. The sender receives no self-alert. The direct composer omits `@everyone`. |
| Pins and chat labels | Both accounts and a project with two task chats | The project chat starts pinned for both. A personal pin on one task or direct chat affects only the pinning account. Message pins remain shared. Task chat rows identify their project. |
| Delete and reconnect | Sender and recipient with a text and image message | Delete the sender's message and verify both placeholders. Check the recipient after reconnecting and after loading older history. The content and attachment do not reappear. |
| Group name, photo and nicknames | Project or task lead and another authorized participant | Save and reset the name and photo as the lead. The other member sees the changes and has no group editor. Change and clear a peer's nickname, then check the activity row and display name in that chat. |
| Archive | Head and a participant with a dedicated project ready for completion | Complete the project. Both the project and task chats move to **Archived**. History stays readable and send, reaction, pin and customization controls are unavailable. |

## Web alignment Phase 3 — Projects, people and analysis

- A Head can open a planning project from the Office project directory and continue setup in its Web Settings. Mobile uses the same server readiness check before showing active project work. It checks readiness again before a native task write.
- Project People shows **Can edit** for eligible saved project members who hold the permission. Grant or revoke it in Web Add people. Mobile checks the current roster before a delegated task edit and sends the edit to the restricted Web command. It grants no authority to create tasks, change staffing or allocate money.
- **Projects → project → Analysis** shows the target and actual completion dates, how early or late the project finished, late submissions, pending reviews and typical review time. It uses Web's project timing calculations. The full analysis opens for the same project on Web.
- Project options link to the project's Web Settings for setup and **Draft tasks**, Main table for **Import PDF**, and Audit Trail. The links preserve the project and workspace IDs. Use an HTTPS eFlow Web address in `EXPO_PUBLIC_WEB_ORIGIN` for these links.
- Mobile rechecks an open guest workspace on foreground and every 30 seconds while active. If the server drops the project, Mobile removes it from the workspace and clears affected display data. Realtime membership changes also invalidate access. The hosted guest-maintenance job is active and the shared commands are installed. There were zero registered guest accounts on the hosted target during the check.

TypeScript, nine Metro checks, all 329 tests across 106 suites, Android and iOS production JavaScript exports, and the credential audit of both exports and the embedded Android bundle passed. Signed-in device acceptance and native iOS compilation are pending. This QA build has no configured HTTPS Web origin. URL routing passed with a test origin.

The standalone, QA-signed build 49 upgraded the Android API 35 x86_64 emulator and opened directly to the eFlow sign-in screen. It includes ARM64 and x86_64 libraries and preserves the build 48 signing certificate. Six Phase 3 source-map entries match the Mobile source. [Phase 3 APK](../../artifacts/M7/eFlow-Mobile-Phase-3-v49-arm64-x86_64.apk) · [APK verification](../STANDALONE_V49_APK_VERIFICATION.json) · [Emulator sign-in](../../artifacts/M7/phase-3-v49-launch.png)

| Check | Approved accounts and fixture | Expected result |
| --- | --- | --- |
| Setup and handoffs | Head with one planning project and one ready project in LEDIPO | Planning project opens its Settings on Web. Tasks and people appear after setup is complete. Open shared templates, AI drafting, PDF import and Audit Trail and confirm each Web view uses the original project. |
| Project editing access | Head and a saved LEDIPO project member | Grant Can edit in Web Add people, then open the assigned project's task on Mobile. Edit its title or dates. Revoke the checkbox and verify the person remains on the project and the task edit action disappears. Check an unrelated project and a task in review. |
| Delivery analysis | A project with an early or late completion and a submitted task with a recorded review | Compare target and actual dates with Web. A late submission changes the submission count. Review duration is measured independently. Check a project with missing dates. |
| Guest expiration | An approved temporary guest with a soon-expiring project and a second authorized project | Leave the expiring project open. After expiry, foreground the app or wait for its next access check. The expired project disappears and the second project remains available. A deactivated guest can no longer use the signed-in session. |

## Web alignment Phase 2 — Funding and settlement

Mobile reads the same task funding, Office Budget, settlement and completion records as eFlow Web. The parent Funding tab shows its approved budget, subtask allocations, unallocated and currently allocatable amounts, cash released and actual spending. The assigned Task Lead can manage an allocation from the parent or the subtask. The allocation uses an approved task account and sends the server a durable command ID for retry. Returning unused subtask funding credits the parent and preserves recorded spending.

The Head's escalation review shows a posting success only after the server confirms settlement for that liquidation version. Task review uses the shared cash-clearance decision logic. Active finance screens check for changes through Realtime, local decisions and foreground or periodic checks. Office Petty Cash keeps its existing separate workflow.

The Office Budget summary shows the total, the amount released and the amount pending. The project Funding screen shows the specific cash and unused-funding blockers reported by the server. Return unused subtask funding from the parent task. Use eFlow Web for Office Budget scheduling and early release, project-level funding returns and final project completion. Direct handoffs require a configured `EXPO_PUBLIC_WEB_ORIGIN`.

TypeScript and nine Metro checks passed. The full mobile suite passed 324 tests across 105 suites. Production Android and iOS JavaScript exports passed. Read-only checks confirmed the deployed funding, settlement and closeout commands and the active Office Budget release job. The hosted database was read only during this phase.

The signed standalone APK upgraded the Android API 35 x86_64 emulator from build 47 to build 48 and cold-launched to the eFlow sign-in screen. The APK contains ARM64 and x86_64 libraries. Its signature, release manifest and six Phase 2 source-map entries passed verification. The credential audit passed for both exports and the embedded APK bundle. [Phase 2 APK](../../artifacts/M7/eFlow-Mobile-Phase-2-v48-arm64-x86_64.apk) · [APK verification](../STANDALONE_V48_APK_VERIFICATION.json) · [Credential audit](../NATIVE_RELEASE_AUDIT.json) · [Emulator sign-in screen](../../artifacts/M7/phase-2-v48-launch.png)

| Check | Approved accounts and dedicated fixture | Expected result |
| --- | --- | --- |
| Allocate and adjust | Task Lead on a task funded for ₱50,000, with three subtasks and a contributor on the same project | Allocate ₱45,000 in total. The parent shows ₱5,000 unallocated, and another allocation above its account's availability is blocked. Cash released and actual spending stay unchanged. A contributor can see their authorized funding without changing it. |
| Return and retry | Task Lead on a completed subtask with a partially spent allocation and another with an open cash request | Return only the unused amount to the parent. Open requests prevent edits and returns. On an approved network failure fixture, reopen the form and verify the same saved command. Check the ledger for one adjustment. |
| Settlement | Head and Accounting Staff using an authorized escalation fixture with no independent Accounting Officer | A conflicted Accounting Staff account cannot settle its own package. The eligible Head opens the exact package in Inbox and posts it. Compare the request, liquidation, Accounting queue, task clearance and project completion on Mobile and Web. |
| Office Budget | Head with a dedicated Office Budget containing two scheduled ₱25,000 releases | A ₱50,000 budget with nothing released starts at ₱0 released. Each confirmed server release updates the Mobile totals to ₱25,000 and then ₱50,000. Compare available budget after commitments. |
| Closeout and separate petty cash | Head and Task Lead on a project with unused subtask, task and project funds, plus an Office Petty Cash fixture | The project funding screen names the amounts to return and links to the parent Task Funding and Web budget. Confirm the server reports readiness once its blockers clear. Office Petty Cash activity leaves project and task allocations unchanged. |

Signed-in financial workflow acceptance is pending on both platforms. Use only approved fixtures. Repeat with dark mode, large text, assistive technology, the keyboard open and reconnects.

## Web alignment Phase 1 — Tasks and subtasks

Mobile follows Web's work terminology, status catalog and server-assigned review routes. The native screens and dashboards use the existing layouts. Task and subtask label changes appear in Projects, My Work and work details. Retired custom labels remain readable on existing work. New selections use the scope and order from the Web catalog. Project Board lanes continue to group by workflow state, including work with custom in-progress labels.

Mobile reads the deployed catalog and sends label changes through the same `set_work_custom_status` command as Web. Task and subtask screens refresh after local changes, Realtime updates, reconnects and app foregrounding. Linked Personal subtasks also check periodically while the app is active. The four shared TypeScript modules were refreshed from the reviewed Web working tree at Git base `4ff217b`. The subscription, presentation and native selector are mobile adaptations.

TypeScript and Metro checks passed. All 317 tests in 102 suites passed. Android and iOS production JavaScript exports and the credential audit passed. The hosted catalog, its Realtime publication, the label command and the direct subtask completion command were confirmed through read-only queries. Signed-in device workflows and personal acceptance are pending.

The signed QA APK, version code 47, contains ARM64 and x86_64 native code and an embedded production bundle. Its signature, release manifest, embedded credential audit and six Phase 1 source-map entries passed verification. The APK installed and cold-launched directly to the eFlow sign-in screen on the Android API 35 x86_64 emulator. Native iOS compilation and the physical-phone workflow remain pending. [Phase 1 APK](../../artifacts/M7/eFlow-Mobile-Phase-1-v47-arm64-x86_64.apk) · [APK verification](../STANDALONE_V47_APK_VERIFICATION.json) · [Emulator sign-in screen](../../artifacts/M7/phase-1-v47-launch.png)

| Check | Approved accounts and dedicated fixture | Expected result |
| --- | --- | --- |
| Work terminology and status labels | Member and Head viewing the same active project, with a Web Admin available to change a test label | Projects, task details, Assigned Work and Leading use Task and Subtask. A renamed built-in label and an eligible custom in-progress label appear with the configured color. A retired label stays visible on existing work and leaves the picker. |
| Live status updates | Task Lead and contributor viewing the same task or subtask on different devices | Start work, apply a custom label and move through review. Compare the canonical status in the Main table, details and My Work. Check after reconnecting. |
| Optional evidence and direct completion | Eligible Subtask Lead, parent Task Lead and a separate contributor | On an active branch with prerequisites satisfied, the eligible lead can complete a subtask without a file. A contributor without a lead appointment cannot complete it. |
| Parent task review | Distinct Task Lead, Project Lead and Head, plus a task led by the Project Lead | Submit a completion note with no files. The first task goes to the assigned Project Lead. The Project Lead's own submission goes to the assigned Head. Verify the submitter cannot approve their own task. |

Repeat the role walkthrough on Android and iOS, including large text, screen readers, dark mode, reduced motion and an open keyboard. The hosted scheduled-work contract `m7_office_assignments` is still absent, so the separate shared scheduling and staged contributor approval scenarios remain subject to their existing prerequisites.

## Build 46 shared backend contracts

12 November 2026, Asia/Singapore. The four shared migrations and their disposable SQL runner are in the Web checkout. Build 46 consumes the new contracts when the backend exposes them. The hosted project still serves the existing contracts. The Build 45 notes below describe that earlier package.

[Build 46 APK](../../artifacts/M7/eFlow-Mobile-M7-Shared-Contracts-v46-arm64-x86_64.apk) · [APK verification](../STANDALONE_V46_APK_VERIFICATION.json) · [Credential audit](../NATIVE_RELEASE_AUDIT.json) · [Web implementation handoff](M7-shared-backend-handoff.md)

- The disposable PostgreSQL fixture passed 80 assertions, including direct denied RPC and table calls, schedule and activation, Office and Personal reviews, scoped evidence and assignments, and allocation balances and receipts.
- Mobile TypeScript, nine Metro checks, and 313 tests in 101 suites passed. Android and iOS production JS exports passed separately. The credential audit passed for both exports and the embedded APK bundle.
- The signed, non-debuggable ARM64/x86_64 APK installed and cold-launched as version code 46 on the Android API 36 emulator. Six feature sources in its release source map matched the final workspace files. Native iOS compilation and device workflows remain pending.
- Web type checking and the production build passed. The full Web suite reported 2,301 passing and 23 failing tests across 14 failing suites. A clean-baseline comparison was outside this run.

Use dedicated, approved accounts and fixtures after the shared backend and Web cutover are available in an authorized test environment. Record the exact actor, server-confirmed permanent role, contextual appointment and workspace for each result.

| Personal check | Approved accounts and fixtures | Expected result |
| --- | --- | --- |
| Planned date and activation | Responsible Office Head, appointed Task Lead and separate Subtask Lead/contributor. Use an overdue Task and a Task with eligible and future Subtasks. | Check Today in the workspace timezone, explicit recovery dates, planned date round-trip and actual activation. Confirm the Task Lead starts the parent, eligible descendants activate, and the scheduled job activates future descendants on their date. |
| Contributor and Subtask Lead review | Task contributor, Subtask contributor, Subtask Lead, parent Task Lead and eligible independent Task reviewer. Repeat nested review in a Personal workspace with approved Member accounts. | Check private pending progress and evidence, nearest eligible reviewer, return and resubmission, exact Inbox routes, accepted canonical progress, and audit attribution. Check same-appointed-Lead direct completion and independent final Task review separately. |
| Visibility and assignment publication | Responsible Office Head, Project Lead, appointed Task Lead and affected Members across two Offices. Use a Planning project, an unrelated active Task and a pre-start branch. | Drafts open through authorized Web draft routes. Operational screens, direct queries and financial reads omit them. The Task Lead can prepare pre-start work. The branch assignees see the branch and receive the assignment notice when eligible. |
| Allocation and receipts | Project Lead, Responsible Office Head, parent Task Lead, Subtask Lead and Accounting Staff. Use approved Task and Subtask allocation fixtures. | Check Project Lead Task allocation, Task Lead Subtask allocation, parent balance and exact retry. Check denials for other roles and verify the established Head and Accounting actions with approved fixtures. |

Live PostgREST, Storage, scheduler, push, and installed NW11 role and receipt verification are pending. Verify the role workflows separately on Android and iOS, including theme, font scaling, screen reader, reduced motion and keyboard. Personal acceptance is pending.

## Workflow and assignment revisions

11–12 November 2026, Asia/Singapore. M7 personal acceptance is pending. Web contracts were checked at `4ff217b84e3e8128555ffc87f0514253cd576399` against Web `main`.

TypeScript, nine Metro checks, and all 310 tests in 100 suites passed. Android and iOS production Hermes exports passed separately. The credential audit passed on both exports and the embedded APK bundle. [Credential audit](../NATIVE_RELEASE_AUDIT.json)

The signed, non-debuggable ARM64/x86_64 APK installed and cold-launched on the Android API 36 QA emulator. The restored Andres Manili account displayed the server-confirmed Member role in Profile and LEDIPO as its current Office workspace. Read-only QA verified the My Work toolbar, Today selection, date ranges and the Inbox unread dot. The account had one available workspace. Fresh login, Head and Accounting Staff workflows, physical Android, and native iOS compilation and workflows remain pending.

[Build 45 APK](../../artifacts/M7/eFlow-Mobile-M7-Workflows-v45-arm64-x86_64.apk) · [My Work screenshot](../../artifacts/M7/workflow-v45-my-work.png) · [Today filter](../../artifacts/M7/workflow-v45-today.png) · [APK verification](../STANDALONE_V45_APK_VERIFICATION.json)

- My Work shows the selected workspace. It uses the Projects search-and-filter layout, with pull-to-refresh and a retry control for failed reads. Today matches open assignments whose due date falls on the same calendar day in the work item's workspace timezone. Date-only values keep their saved day. Cards show the saved Task start and due dates as a date range when both are present. The mobile feed uses the exact readable Subtask record's due date when the tree omits it.
- My Work excludes unrelated work and recommendations that did not become appointments. It hides a Subtask assignment from the branch Lead and contributors while its Office root Task is waiting to start. Opening the native branch directly checks the same rule on its current snapshot. Only the assigned Task Lead sees Start work, and Mobile rechecks that assignment before requesting the status change.
- Office task creation uses the same title and project group inputs and `phase3_create_task` RPC as the Web Main table. Native editing uses `phase3_patch_task` for the title and schedule. Both require current scoped project permissions and an active project. A create result without a confirmed receipt locks that form and asks the user to check the task list. Subtask editing uses the existing branch capability and revision checks. The native workflow offers no Task or Subtask delete action.
- The subtask form still defaults to the eligible Task Lead. On an overdue parent, it accepts the existing parent deadline and checks the earliest applicable ancestor deadline. The server still validates lifecycle, branch capability and dates. The Inbox Bell shows a recipient-scoped unread dot, and an assignment received through Realtime while the app is in use produces a generic notice. The device push configuration is independent.
- Planning projects are filtered out of the mobile workspace directory and My Work. Native project and linked work details check the saved Office project status. Funding setup guidance appears as text.

| Personal check | Approved account and fixture | Expected result |
| --- | --- | --- |
| My Work | Member with dated assignments in two authorized workspaces, a recommendation without an appointment and an unrelated task | Switch the toolbar workspace and check search, Today, both dates, pagination and exact links. Try the selection with an unscheduled Subtask and a readable Subtask whose saved due date matches the Web record. |
| Create and edit | Responsible Office Head with an active project and an existing group. Repeat with a Member or a Head outside the authorized project. | Authorized Head can add by group and edit Task title and dates. Unauthorized account has no edit or add control. Check that a Planning project stays out of search and Favorites, including on an authorized Head's account. |
| Start, overdue and Subtask edit | Assigned Task Lead and a separate appointed Subtask Lead/contributor, with an overdue root and a dedicated safe branch | Add a Subtask using the overdue parent deadline. Try a later date and check the specific validation. Verify default Lead, edit availability, visibility before and after start, and absence of delete. Check the existing server guard on descendant completion. |
| Inbox | Member or Accounting Staff who is the recipient of a safe new assignment | From My Work, see the unread dot and generic in-app notice. Open Inbox, follow the exact record, go back, and mark the final unread update read. Confirm the dot clears and a different account does not inherit it. |
| Funding | Project Lead, Task Lead and Accounting Staff using readable dedicated fixtures | Check authorized amounts, the plain Web setup label and exact existing cash record links. Allocation writes and real financial operations require dedicated authorization and backend verification. |

Run each supported scenario separately on Android and iOS. Include light and dark appearance, large fonts, screen reader, reduced motion and the keyboard. No signed-in mutations or full native accessibility pass are recorded for this revision.

### Shared contract and integration gaps

- **Subtask start date.** Office and Personal nodes and the `r7_work_command` and `nw_work_command` create payloads lack a persisted `start_date`. The owner needs to add a field, validation and round-trip read projection before Mobile can save a default of today.
- **Subtask start and publication.** Mobile suppresses pre-start assignments on the covered surfaces. The Web migration `20261102192953_work_status_lifecycle_sync.sql` starts the root after recorded Subtask execution. The requested direction needs a root-start transaction that publishes eligible descendants and changes their actual status while preserving ordered steps and closed branches. Universal draft/pre-start isolation also needs the shared read, notification, conversation and finance contracts to enforce visibility. The client-side presentation controls do not establish a new access policy.
- **Office Subtask Lead review and contributor changes.** The Office `complete_subitem` contract allows direct completion for a Subtask Lead and does not implement the requested Task Lead approval. Mobile limits direct completion to the currently authorized Task Lead and explains the unavailable path to the Subtask Lead. `save_subtask_work_update` applies immediately. Contributor work still needs pending submissions, nearest eligible Lead decisions, atomic apply, notifications and receipt recovery. Preserve independent root review, no self-review and ancestor fallback.
- **Task and Subtask allocations.** `allocate_project_task_funding` authorizes both the Project Lead and appointed Head in Web. Enforcing Project Lead exclusivity requires a shared server capability and write guard. Subtask funding uses `get_task_funding_context` and `set_subtask_budget_cap` with an approved parent allocation line. Hosted NW11 compatibility and role-scoped receipt verification are required for both native write paths. Existing approved amounts and authorized cash workflows remain usable where their current prerequisites are installed.
- **Background push delivery.** Requires `EXPO_PUBLIC_EAS_PROJECT_ID`, Android/iOS platform push credentials, the hosted `register_mobile_push_device` contract and an active dispatcher. Background delivery was not verified.
## Web parity and reliability pass

TypeScript, nine Metro checks, 52 focused tests in 13 suites, the platform exports, and the three-bundle credential audit passed. The signed build 44 APK installed and cold launched on Android. The restored Member session displayed the logo-only header on Projects, Inbox and More, the pinned Project column during a horizontal swipe, a localized Inbox press that opened the intended Subtask, and the Subtask Activity timeline. These display checks used existing records. Web comparison for those same records and signed-in checks for the other roles remain pending.

[Build 44 APK](../../artifacts/M7/eFlow-Mobile-M7-Parity-v44-arm64-x86_64.apk) · [Projects swipe](../../artifacts/M7/parity-v44-projects-swiped.png) · [Inbox press](../../artifacts/M7/parity-v44-inbox-press.png) · [Subtask timeline](../../artifacts/M7/parity-v44-activity.png)

The source comparison used Mobile `2c14db9d46d21fdd50b4464aa9c9ef14cf442388` and Web `4ff217b84e3e8128555ffc87f0514253cd576399`. The Projects directory reads `projects.status` by the authorized workspace project IDs before applying lifecycle filters. The Web mapper substitutes Planning for an absent status, and Web creation also saves Planning when the creator supplies no status. Mobile presents an unavailable status when an Office project row has no recognized lifecycle value. Progress, schedule and the target-date fallback use the Web portfolio selector. Zero eligible tasks are shown as “No tasks yet.” Office and project lead names are displayed only when the scoped read returns them.

The public gateway discovery returned HTTP 200. Its published hostname failed DNS resolution on the workstation and Android emulator, while a public control domain resolved on Android. The protected Professional Profile and PDS reads share that gateway. Mobile preserves the HTTP status when a response is available and combines matching recovery messages. The earlier handset failures for Projects, Task conversation, and financial records still require device evidence.

| Scenario | Acceptance check |
| --- | --- |
| Authorized Office project with a known ID on both platforms | Compare the saved lifecycle, Lead office, Project lead, schedule, completed and eligible tasks, and target date. Verify that completed and archived rows are accessible through filters. Repeat in a Personal workspace with a shortcut. |
| Signed-in Head, Member and Accounting Staff | Check all primary tab titles, the top-right workspace switcher, the pinned Project column, and the absence of name and role on More. Verify Inbox View and Mark read independently with native focus and press feedback. |
| Approved Task or Subtask history with submissions and attachments | Compare actors, timestamps, changes, notes and evidence. Load older entries and verify the timeline retains distinct events. Test both appearances and large text. |
| Approved account with Profile and PDS access | Recheck the published gateway after DNS is restored. Test session expiry, denied access, retry and recovery without writing production data. |

## Post-build 42 stabilization

[Android QA APK build 43](../../artifacts/M7/eFlow-Mobile-M7-Stabilization-v43-arm64-x86_64.apk) · [APK inspection](../STANDALONE_V43_APK_VERIFICATION.json) · [Credential audit](M7-stabilization-v43-release-audit.json) · [Android signed-out launch](../../artifacts/M7/stabilization-v43-signed-out.png)

TypeScript, nine Metro checks, and 298 tests across 98 suites passed. Android and iOS production JavaScript exports passed separately. The signed Android package compiled for ARM64 and x86_64. Its embedded bundle and changed feature sources matched, and all three bundles passed the credential audit. Build 43 upgraded and cold-launched on the isolated Android 16 / API 36 x86_64 emulator. The signed-out form rendered in dark appearance. Signed-in Android checks require approved accounts and fixtures. Native iOS, physical-device behavior, large text, keyboard and screen-reader checks for the affected workflows remain pending.

Project details previously waited for both the project record and its named task groups. The record now loads independently. The Main table can retry groups, and Board and Agenda can open while groups are unavailable. A Main table group can contain tasks with different statuses. The `Group:` label distinguishes the saved group name from the task status.

Requests & releases retries an eligible failed page read once within the existing load deadline. An individual cash request loads by request ID, Office and fiscal year. It reads existing releases and liquidations for that request, and loads the allocation and receipt prerequisites only when its stage can use them. Available Office Budget is approved appropriation less holds and active commitments, as defined by the existing Office budget summary contract. Settled expenditure is the separate settled amount from that contract. The screenshots alone cannot reconcile the individual Office amounts or establish why requests timed out on the handset.

The conversation shows an empty history only after a successful read. An access check or failed history read has a distinct state. Retry checks access or refreshes the history as needed. A typed message and picked attachment remain separate from the send attempt. The attachment can be restored while its local file is still available. Sending retains the existing access and receipt checks.

| Approved account and fixture | Personal acceptance checks on Android and iOS |
| --- | --- |
| Head with an assigned review, overdue Office work led by another person, and at least three current projects | Only assigned actions appear in Needs Your Attention. Overdue and blocked work appears in Office Health. Verify three project rows, real counts, exact project navigation and Office Analytics drill-down. |
| Member with an actionable overdue task, a contributor-only overdue assignment and a Subtask with a long title and parent name | Home qualifies the count as requiring the Member’s action. My Work shows all overdue assignments and wraps the title and parent name separately. Compare at narrow width, 150% and 200% text, in both appearances. |
| Approved Task participant with a readable conversation, a local test image and Activity access | Interrupt the connection before opening the thread, then restore it and tap Retry. Verify that an unavailable thread never shows the successful empty state, and that unsent text and image survive the retry. With keyboard open, verify that the composer remains reachable. Activity offers a compact work-note editor, and conversation opens separately. |
| Approved recipient of an exact Task or Subtask update, including a message with a duplicate completion detail | Verify a single rendered detail, a subtle unread indicator, Mark read, correct destination and Back. Confirm that older updates still append. |
| Accounting Staff with an authorized Office, settled request and cash release fixture | Compare all currency values with the same authorized Web records, including at 150% and 200% text. Open Requests & releases, reveal the stage breakdown, open the exact record and return. Test refresh after a connection interruption. Keep financial writes within a separately approved fixture. |
| Head or Member with an authorized project that has a named `To do` group containing a completed task | Verify the `Group: To do` heading and the task’s Completed status. Open Main table, Board and Agenda, then confirm search, filters, Back and the pinned task column. |

Record the approved actor, server-confirmed role, Office, device and build for each check. Include TalkBack or VoiceOver, reduced motion and both appearances. A signed-out smoke check cannot establish any of these role or financial results.

## Post-build 42 role dashboards and work details

The source revision after build 42 adds Head, Member and Accounting Home dashboards, native Office Analytics, the revised tab order, structured Activity and inline Office Subtask Funding. Build 42 predates these changes.

TypeScript, all nine Metro checks, 88 targeted tests across 22 suites, and Android and iOS Hermes exports passed. These checks cover role navigation and Back, scoped project and finance reads, Activity formatting and pagination, and Office Analytics route authorization. The Web handoff URL passed automated tests. The local build environment has no configured HTTPS Web origin for a live handoff.

| Account and fixture | Expected behavior |
| --- | --- |
| Appointed Head in an authorized Office workspace with four current projects, an assigned review and a blocker | Home shows up to five attention items with the responsible action or waiting state. It shows exactly three projects when at least three qualify. Confirm one project with two eligible completed root tasks of four shows 50%. A zero-task project shows “No tasks yet.” Office Analytics opens the selected Office report and permits drill-down. |
| Member with a returned Task, a due-today Subtask, a pending review and a contributor-only assignment | Returned work appears before overdue and due-today work. A pending review appears under Waiting on Others. Contributor work that needs a new approval contract never appears as executable. Opening a row reaches the exact authorized Task or Subtask. |
| Accounting Staff with release permission and a scheduled release, plus an authorized linked project | Fresh sign-in lands on Home. Accounting remains a primary tab and Projects is under More. Open the scheduled release and confirm the request, release, Office and fiscal year. From Accounting and More, open a project and use Back to return to the original record or list. |
| Approved Subtask Lead or authorized financial actor on a branch with a sibling, recorded edits and a cash request | The focused Subtask shows Funding without a separate entry button. Its sibling’s funding is absent. Activity shows initial values for creation, distinct changed fields for edits, recorded actors and Philippine timestamps. Older events append. The funding-only link opens the same exact branch. |

Android and iOS signed-in workflows, both appearances, 150% and 200% text, TalkBack and VoiceOver, and live finance remain device acceptance scenarios. Use dedicated actors and approved financial fixtures.

The Head project preview uses exact RLS-visible root-task counts and current blocker/due signals. Office Health and Member counts omit incomplete feed totals. Accounting stage counts use exact authorized request counts by funding Office and fiscal year. Financial Summary uses the fiscal summary RPC’s approved appropriation and settled expenditure. The native Office Analytics reports reuse authorized task, project, assignment, submission, evidence, risk and lifecycle selectors. Historical timeliness requires the deadline in force at each event. Native trend and Office-wide cash-stage amount aggregates require sources beyond the preview. The Web reports handoff requires a configured HTTPS Web origin and separate authorized browser verification.

## Phase 0 implementation — Slices A–D

Source baseline: Mobile main `53d4d794fcb4303ee4a0a11fc4cb164b4ac402b9` and Web main `4ff217b84e3e8128555ffc87f0514253cd576399`. The work uses existing role, record, and financial contracts. Release acceptance is pending.

[Android QA APK build 42](../../artifacts/M7/eFlow-Mobile-M7-Phase0-v42-arm64-x86_64.apk) · [APK inspection](../STANDALONE_V42_APK_VERIFICATION.json) · [Credential audit](../NATIVE_RELEASE_AUDIT.json)

| Evidence | Result |
| --- | --- |
| TypeScript and Metro configuration | Passed. All 9 Metro exclusion checks passed. |
| Automated regressions | Targeted checks for each slice passed. The final full run passed 283 tests across 89 suites. The final submission-copy adjustment also passed its targeted recovery test. |
| Android and iOS Hermes exports | Both passed and include the final submission receipt copy. |
| Android standalone release | ARM64 and x86_64 compilation, signature, non-debuggable manifest, embedded startup sources, and upgrade install on the isolated Android 16 / API 36 x86_64 emulator passed. |
| Android signed-out smoke | Cold launch and password help passed in dark appearance. With font scale at 150% and animations disabled, scrolling brought the Sign in button fully into view. The checkbox glyph clips at that size. The app stayed dark when the emulator switched to light, so light appearance remains unverified on this build. [Password help](../../artifacts/M7/phase0-v42-password-help.png) · [150% font scale](../../artifacts/M7/phase0-v42-signed-out-large-scrolled.png) |
| Credential audit | Both exports and the embedded APK bundle passed. |
| Signed-in and iOS device workflows | Pending. Approved role accounts and dedicated fixtures are needed for signed-in QA. Native iOS compilation and device testing require Xcode. |

| Slice | Approved accounts and fixtures | Personal acceptance checks |
| --- | --- | --- |
| A · Work status and decisions | Separate Task Lead, Subtask Lead, contributor, and independent reviewer. Use a root with two completed children and a third awaiting approval. Include explicit zero and unavailable financial amounts. | Check for 67% progress and `Awaiting approval` status. Complete authorized work using the existing evidence and review flow. A recovered receipt says `Submitted for approval`. Confirm a contributor and an actor with execution-only access cannot mark the Subtask complete. Confirm zero and unavailable amounts appear differently. |
| B · Work and project browsing | Head with active, completed, and archived projects. Member with assignments in two workspaces and authorized branch activity across two pages. | Home shows role priorities before Favorites. My Work date chips filter in one tap. Current projects excludes completed and archived projects, which remain reachable through the status filter. Check Back from Projects, Main table, Board and Agenda. At phone widths, Type is beneath the project name. Loading older activity retains the first page, author names, decisions, and attachments on the same branch. |
| C · Entry, Inbox, communication and account | Approved Head, Member and Accounting Staff. Use two readable conversations, an exact record notification and a test device with a known push preference. | Confirm the correct primary tabs after sign-in and a workspace switch. Open Inbox and Reviews separately. Switch conversations with unsent text and return to the draft. Verify the other account cannot see it. Check that notification settings show a loading state until the device preference is known, and that existing notification links and Back still work. |
| D · Financial records | Accounting Staff in an authorized Office and fiscal year. Separate requester/recipient, Task Lead, Office Head and assigned reviewer, with a safe receipt package. | Check the amount and stage on the queue and request. Compare the breakdown with the same authorized Web record. Open and edit one receipt at a time. An invalid package stays editable. An unconfirmed submission retries with its original ID. Check that independent review, settlement, and Office petty cash retain their own controls and authority. |

Run device acceptance on Android and iOS separately. Include light and dark, a narrow viewport, large text, keyboard open, TalkBack or VoiceOver, reduced motion, weak connectivity, and a session/access change. Confirm that deep links and Back return to the originating tab and exact branch. Writable QA requires separately authorized fixtures. The local text draft is separate from a persisted send attempt. A picked image remains attached in the open composer until send; durable pre-send attachment drafts are outside this slice.

### Shared contract and integration dependencies

- **Subtask start date:** `r7_work_command`, `nw_work_command`, and the work-tree read contract need a persisted start date for Office and Personal work. The app keeps the existing supported creation fields.
- **Contributor validation:** The shared write contract needs staged contributor updates, nearest eligible Lead routing, and a decision that atomically applies accepted updates. The existing contributor restrictions stay in place. Completion and project data only reflect accepted, authorized work.
- **Announcements:** The existing reciprocal SELECT policies can raise PostgreSQL `42P17`. The app exposes the unavailable state. [M4 integration record](M4-backend-proposal.md)
- **Finance:** Live NW11 prerequisites and safe test records remain external. Project Actual expense displays authorized settled cash records; complete Office-wide coverage requires an authoritative shared aggregate. [M5 finance dependencies](M5-personal-qa.md)

## Previous standalone APK — build 41

[Download Android APK 41](../../artifacts/M7/eFlow-Mobile-M7-Subtasks-Projects-v41-arm64-x86_64.apk). It uses the same QA certificate as build 40 and supports upgrades with existing app data. [Changes and role-by-role checklist](#subtasks-project-tables-and-role-priorities).

## Previous standalone APK — build 32: Lottie folder and stable tab highlight

[Download Android APK 32](../../artifacts/M7/eFlow-Mobile-M7-Latest-v32-arm64-x86_64.apk). The refresh indicator uses a bundled LottieFiles folder, and the selected tab stays in place during workspace rechecks.

[Personal steps and verification](M7-lottie-refresh-qa.md).

## Previous standalone APK — build 31: Folder replaces the system spinner

[Download Android APK 31](../../artifacts/M7/eFlow-Mobile-M7-Latest-v31-arm64-x86_64.apk). The folder is the pull-to-refresh indicator from the initial drag through loading. It appears above the content as the list moves down, leaving the My Work cards visible.

[Personal steps and Android emulator evidence](M7-folder-refresh-replacement-qa.md).

## Previous standalone APK — build 30: Folder pull-to-refresh

[Download Android APK 30](../../artifacts/M7/eFlow-Mobile-M7-Latest-v30-arm64-x86_64.apk). Pull and release on a refreshable screen to see the eFlow folder. The page moves while the refresh runs and stays still with Reduce Motion.

Test Home, My Work, Inbox and Projects, then repeat after panning the project table sideways. [Personal steps and Android emulator evidence](M7-folder-refresh-qa.md).

## Previous standalone APK — build 29: Sliding tab highlight and filled icons

[Download Android APK 29](../../artifacts/M7/eFlow-Mobile-M7-Latest-v29-arm64-x86_64.apk). The circular highlight glides between tabs while the selected icon fills and settles. Inbox adds a short bell ring. Reduce Motion gives immediate selection feedback.

Tap adjacent and distant tabs, then repeat quickly and with Reduce Motion enabled. [Motion QA checklist](M7-navbar-motion-qa.md).

## Previous standalone APK — build 28: Pinned Task column and navigation polish

[Download Android APK 28](../../artifacts/M7/eFlow-Mobile-M7-Latest-v28-arm64-x86_64.apk). Main table keeps the Task column visible while the other columns scroll. The toolbar blends into the page, Home Workspaces matches Recently visited, and bottom tab icons respond to presses and selection.

With an authorized account, open Main table and swipe to Office, tap a pinned task, check both Home themes, and switch tabs with and without Reduce Motion. [Screenshots and personal checklist](M7-pinned-table-and-navigation-qa.md).

## Previous standalone APK — build 27: Web catch-up

[Build 27 changes and verification](M7-web-catch-up-2026-11-09.md).

## Previous standalone APK — build 26: Navigation clearance and Activity labels

[Download Android APK 26](../../artifacts/M7/eFlow-Mobile-M7-Latest-v26-arm64-x86_64.apk). The navigation bar has its own space across all tabs and their detail screens. Task Activity displays capitalized headings with “Subitem” terminology. Funding setup has a compact web handoff.

With an authorized account, scroll to the end of each tab and the Activity and subitem screens from Projects. Check that the final entry or action clears the bar. [Screenshots, verification and personal checklist](M7-navbar-activity-qa.md)

## Previous standalone APK — build 25: Project table, archived projects and Inbox position

[Download Android APK 25](../../artifacts/M7/eFlow-Mobile-M7-Latest-v25-arm64-x86_64.apk). Install it over your existing standalone build.

The Office project list now supplies the refresh state React Native requires. Main table shows a horizontal grid with group colors, column headers and status cells. Inbox is fourth for every supported role.

Use your authorized Head or Member account to reopen the archived project you were viewing. Check the read-only notice, swipe to Owner, Due date and Office, then open a task and return. Any supported role can check the fourth icon. [Screenshots, verification and personal checklist](M7-project-table-qa.md).

## Previous standalone APK — build 24: Favorites carousel and frosted Recently visited

[Download APK build 24](../../artifacts/M7/eFlow-Mobile-M7-Latest-v24-arm64-x86_64.apk). Install over your current standalone APK without uninstalling or clearing data.

My favorites returns to the rounded eFlow gradient carousel with a central plus tile, side peeks and actual page dots. Its native sheet immediately shows searchable authorized workspaces and stars, with no intermediate Add/Done step. Stars give immediate fill feedback and a brief pop/tilt, respecting reduced motion. Recently visited in light mode uses a uniform frosted tint and sheen without the old white center patch. Search expands the native sheet to keep the query and results above the Android keyboard. No screen destination, backend contract, permission or financial operation changed.

**VERIFIED:** TypeScript/9 Metro checks; 238 tests in 77 suites; separate Android/iOS production JS exports; Android release compile, source/signature/credential checks and standalone logged-out installation/launch on isolated API 36/x86_64. Offline native component previews verify Home light/dark, carousel proportions, direct list, star checked state and search above the keyboard. These fixtures have no server-confirmed actor/role. **BLOCKED:** signed-in emulator workflows without approved dedicated actors/fixtures. **NOT TESTED:** personal phone acceptance, physical release-device animation feel, native iOS, TalkBack/VoiceOver and large text for this update.

[Before/after inventory, actual screenshots and step-by-step personal checklist](M7-favorites-material-qa.md). [APK receipt](M7-latest-v24-apk-verification.json), [credential audit](M7-latest-v24-release-audit.json). SHA-256: `351e051d4fcf562f034915b74f9c66f4a9c80131b9f738a73966b0a6f675d0c0`. M7 remains pending explicit user acceptance.

Quick personal check: use your existing authorized Head or Member account for Home; any supported role can inspect the Workspaces picker. Open Favorites, search, star/unstar without changing workspace, close and swipe through actual favorite tiles, restart to check persistence, and inspect light/dark and reduced motion. No new account is needed for these local preferences/read-only checks. Account-isolation and consequential workflows still require separately approved dedicated actors and safe fixtures; never Admin.

## Previous standalone APK — build 23: Home, Workspaces and filters

[Download APK build 23](../../artifacts/M7/eFlow-Mobile-M7-Latest-v23-arm64-x86_64.apk). Install over your current standalone APK without uninstalling or clearing data.

Home now uses the toolbar for the profile/greeting, a Workspaces row in place of the large attention area/duplicate shortcuts, and actual local workspace favorites with a native add/remove sheet. My Work no longer uses a floating “+” as a filter; date cards toggle filters with visible selected chips. Projects uses a compact filter beside search with an explicit status and result count. No new task/financial creation capability or hosted change was introduced. Existing personal-project task creation remains subject to eligibility and server rules.

**VERIFIED:** TypeScript/9 Metro checks; 235 tests in 75 suites; both production JS exports; Android release compile, signature, source/entry matching and three-bundle credential audit. The standalone APK installed and launched logged out on isolated Android API 36/x86_64. Native offline component previews cover Home light/dark, large text and the Favorites sheet; they do not establish authenticated role or workspace authorization. **BLOCKED:** signed-in emulator workflows without approved dedicated actors/fixtures. **NOT TESTED:** personal phone acceptance, iOS native, TalkBack/keyboard and native My Work/Projects visual acceptance.

[Before/after inventory, screenshots and personal checklist](M7-workspaces-filters-qa.md). [APK receipt](M7-latest-v23-apk-verification.json), [credential audit](M7-latest-v23-release-audit.json). SHA-256: `45fa513265a6d05e7d1ba9050abc2a7781f373575107c3bec0ba72f1bd62d958`. M7 remains pending explicit user acceptance.

## Previous standalone APK — build 22: quiet refresh

[Download APK build 22](../../artifacts/M7/eFlow-Mobile-M7-Latest-v22-arm64-x86_64.apk). Install over your existing standalone APK without uninstalling or clearing data.

Build 22 removes the Updating progress notice and keeps the native refresh circle for a user’s pull only. Previously, Home’s 30-second background checks and live work updates used the same indicator flag, which made the circle appear while the phone was untouched. Automatic reads now remain silent; cached content, first-load skeletons, account verification, authorization gates and connection-error Retry are retained.

No screen or navigation entry was added or removed. Shared screens, Home, My Work, Inbox, Projects and authorized detail/Accounting screens use the corrected manual-progress behavior. No hosted change or business operation was introduced. [Before/after inventory and personal checklist](M7-silent-refresh-qa.md).

**Build verification:** 229 tests in 72 suites and TypeScript/9 Metro checks pass; Android and iOS production JavaScript exports pass. Android release compilation, non-debuggable packaging, signature and embedded-source checks passed (167 native files); three production bundles passed the credential audit. The APK upgraded build 21 and launched on the isolated Android API 36/x86_64 emulator; logged-out light/dark screens were inspected. [APK receipt](M7-latest-v22-apk-verification.json), [credential audit](M7-latest-v22-release-audit.json). Signed-in idle/pull behavior remains **BLOCKED** for emulator workflow verification without an approved dedicated actor-role/fixture mapping; personal phone and iOS native acceptance are **NOT TESTED**.

Use your existing authorized Head, Member or Accounting Staff account for read-only checks: leave the loaded app untouched for 90 seconds, pull once, then switch apps and return. Expect no automatic circle or Updating toast; expect the native circle while the manual pull is pending. No new QA account is needed just for that inspection. SHA-256: `d82b68c6664d6c717b8ab4f39d8f3ec25c8c250bcfd260114e322e8a07b5b980`. M7 acceptance remains pending.

## Previous standalone APK — build 21: app resume and caching

[Download build 21](../../artifacts/M7/eFlow-Mobile-M7-Latest-v21-arm64-x86_64.apk). Install over your previous standalone APK without uninstalling or clearing app data. The user authorized this rebuild. No hosted configuration or business contract changed.

Ordinary app switching retains the current workspace and its local state. Account access refreshes in the background; a compact Updating notice appears only for a slower check. A connection failure retains readable same-account content with Retry while new consequential attempts remain blocked. Branded startup remains appropriate for cold launch or process recreation. The opt-in work/notification display cache now has a 30-second freshness window within five-minute RAM retention. Manual refresh, Realtime updates and authoritative action checks remain available. No screen or navigation entry was added or removed.

| Build 21 check | Result |
| --- | --- |
| TypeScript / Metro / automated regressions | **VERIFIED**: 9 Metro checks; 226 tests in 71 suites. |
| Android release compilation and package/source checks | **VERIFIED**: version 21, ARM64/x86_64, non-debuggable embedded bundle; 166 native sources match; same local QA signer as prior phone builds. |
| Android/iOS production JS exports and credential audit | **VERIFIED**: separate exports, three audited production bundles including the APK. iOS export is not iOS native verification. |
| Fresh standalone Android install / launch / light and dark login | **VERIFIED**: new isolated API 36/x86_64 emulator with sufficient storage. Logged-out text survived a background/foreground cycle. No account or hosted mutation. |
| Signed-in Android task/draft/scroll preservation, offline gate and role/Office changes | **BLOCKED** for emulator workflow verification: approved dedicated actor-role/fixture mapping unavailable. Automated mock tests pass; they are recorded separately. |
| Personal phone acceptance / iOS native / native accessibility and signed-in notice layout | **NOT TESTED**. |

Use the [step-by-step resume/cache checklist](M7-resume-cache-qa.md). You can do its read-only phone checks with your existing authorized Head, Member or Accounting Staff account; a new account is not required just to switch apps and inspect the UI. Use separately approved dedicated actors/fixtures for saves, reviews, financial operations or deliberate access changes. Do not use Admin.

[APK verification](M7-latest-v21-apk-verification.json), [credential audit](M7-latest-v21-release-audit.json). SHA-256: `4a6626048a41b312e24283300d98b23e79f59b3f4a73d54b4c08cce3705becfc`. M7 remains pending explicit personal acceptance.

## Before and after

| Surface | M6 baseline | M7 candidate |
| --- | --- | --- |
| Head and Member navigation | Home, My Work, Inbox, Projects and More | Same destinations |
| Accounting Staff navigation | My Work, Inbox, Accounting, Projects and More | Same destinations and finance scope |
| Task, project and account experience | Focused inspectors, authorized records, compact lists and contextual web handoffs | Same screens and navigation entries. An older finance notice can open the exact linked subitem funding record when the authorized task data confirms a unique match. |
| Android packaging | M6 QA build 12 | M7 tethered QA build 14 and phone build 29, ARM64 and x86_64 |

M7 makes zero feature-scope changes. No mobile screen or navigation entry was removed. The initial M7 workflow fix was a contextual recovery action for older financial notices; subsequent sign-in repairs are recorded below. Build 13 reproduced the defect. Build 14 contains the fix. The app searches its existing authorized data for the exact request, release or liquidation within the linked task. Ambiguous, unrelated or unavailable records remain unavailable. [M6 before/after inventory](M6-personal-qa.md)

## Install and walk through

### Previous standalone APK - build 20

Updated **6 November 2026, Asia/Singapore**. The user explicitly requested the latest APK, releasing the prior packaging hold. [Download build 20](../../artifacts/M7/eFlow-Mobile-M7-Latest-v20-arm64-x86_64.apk). Install it over build 19 without uninstalling or clearing data. M7 acceptance remains pending.

This standalone package contains the previously queued receipt-review note layout, Home surface correction, native illustrated empty states, content-specific skeletons, plain error feedback, slow sign-in guidance, and scoped display caching. It also filters expected connection diagnostics from React Native's development LogBox and adds safe-area clearance to startup/account-access error screens. The release APK itself is non-debuggable, embeds its JavaScript and does not require Metro. Head/Member/Accounting destinations and backend contracts are unchanged. The filter does not suppress the app's plain connection error or change account lockout/permission decisions; it does not fix an underlying DNS outage.

**Why the bottom banner was still visible:** the Supabase Auth library called `console.error` for a failed host lookup. React Native's development LogBox displayed that console diagnostic separately from the app's translated error panel. The new development filter recognizes expected network/host/timeout failures without replacing console logging or hiding programming errors. Other development warnings can still appear while running a debug build. Install the standalone release to test the actual phone experience.

| Build 20 check | Result |
| --- | --- |
| Android release compilation | **VERIFIED**: ARM64 and x86_64, version code 20. |
| APK / source / signing | **VERIFIED**: non-debuggable, embedded release bundle, 164 native sources match current files, same local QA signer as build 19. No local gateway override or credential file packaged. |
| Automated checks | **VERIFIED**: TypeScript/Metro, 214 tests in 68 suites; separate Android/iOS production JS exports. |
| Credential audit | **VERIFIED**: both exports plus the embedded APK bundle, three bundles total. [Audit receipt](M7-latest-v20-release-audit.json). |
| New standalone install / launch | **BLOCKED**: isolated read-only Android 16/API 36 test emulator has insufficient storage (about 342 MB available). Both install attempts were rejected before launch. The existing user development emulator was not replaced. |
| Real phone / iOS native / role-specific workflows | **NOT TESTED** for this APK. Use the role checklists below and the linked content-state/message inventories. |

[APK verification](M7-latest-v20-apk-verification.json). SHA-256: `b15b0b93f58ef79c43df6ce9a6d2ed7e02149863b42851aa2b2ee8121440b5c0`.

Personal quick check (your approved Head or Member account; Accounting Staff for finance):

1. Install build 20 over build 19, launch eFlow directly, and check normal sign-in with your own credentials entered privately. This package should not ask for Metro or show React Native debug bars.
2. With a slow/disconnected connection, verify the waiting/connection message. Reconnect and retry once. A failed connection must not appear as a wrong-password or successful sign-in result.
3. Inspect Home / Recently visited in light and dark mode. Check illustrated empty states, useful Clear filters / Refresh actions, matched content skeletons, and Remove animations / Reduce Motion.
4. Visit My Work and Inbox, then revisit under a slow connection. Last-read display content must be labeled while it updates. Sign out or switch approved accounts and verify the previous actor's content disappears.
5. For the retained financial UI, use Accounting Staff and authorized safe read fixtures to inspect receipt notes, final action clearance and independent-review restrictions. No consequential write is authorized by this visual checklist.

The following sections retain the historical source-stage evidence. Their earlier references to build 19 and the APK hold describe the stage before the user's build-20 request; the queued code is now included in build 20.

### Pending source change - plain feedback and connection recovery

Updated **6 November 2026, Asia/Singapore**. [Message and cache inventory, limits and personal checklist](M7-messages-cache-qa.md). Login uses plain connection/account guidance and an eight-second waiting notice. Shared feedback hides raw service details. Display-only work/notification caching is bounded, memory-only and account-scoped; authorization and financial execution remain freshly checked. This is queued source, **not included in build 19**. The existing APK hold remains; M7 acceptance is pending.

Validation **PASSED**: TypeScript/Metro, 212 tests in 67 suites, Android/iOS production JS exports and the two-export credential audit. Android light/dark evidence is an isolated native feedback-component preview; no credentials or account mutations were used. Real-account connection/cache acceptance remains **BLOCKED** by missing approved accounts/fixtures; iOS native and personal device acceptance remain **NOT TESTED**.

### Pending source change - Home surfaces, empty states and content skeletons

Updated **6 November 2026, Asia/Singapore**. These changes are in source and the local Metro development session. **Build 19 does not contain them.** The existing instruction to hold new APKs until an explicit request remains in force. M7 personal acceptance remains pending.

See [the content-state inventory, evidence and personal checklist](M7-content-states-qa.md). Home now uses one opaque themed surface for Recently visited. Decorative stars and pagination dots without actions were removed from that card; project/workspace navigation remains. Shared empty states use native eFlow illustrations, optional gentle movement, useful existing actions and reduced-motion/background handling. Retained content regions select skeletons matching lists, grouped work, updates, inspectors, summaries, files, conversations and forms.

Android evidence comes from an **offline native component preview on the existing debug build**, using the real shared controls and the extracted Home card with safe local display data. It establishes rendering only. The emulator is signed out; authenticated page transitions and actual loading-to-data recovery are **BLOCKED** by the missing approved session/fixtures. No sign-in was bypassed, backend data changed or new APK assembled. iOS native rendering and personal device acceptance remain **NOT TESTED**.

Source checks **PASSED**: TypeScript/Metro, 199 tests in 65 suites, both native JS exports and the two-export release credential audit. The preview covered light/dark, twenty loading layouts, compact empty artwork, reduced motion and 150%/200% font scaling. These component results do not establish authenticated workflow acceptance.

### Pending source change — receipt review-note layout

Updated **6 November 2026, Asia/Singapore**. The user reported the cluttered Cash request receipt-review section and explicitly requested **no new APK until their command**. This change is queued in source; **build 19 does not contain it**. Do not assemble/package an updated APK for this or subsequent queued changes until the user explicitly requests it. M7 acceptance remains pending.

The settlement-blocked view now consolidates the overlapping guidance into one warning while preserving the independent Accounting Officer requirement and the distinction between review approval, settlement and journal-posting authority. The shared review-note form appears with the existing available actions; a blocked settlement still permits the separately authorized independent review. The note has a short label, multiline top-aligned input, and a required-note hint, and precedes its action controls. Long decision buttons stack vertically. The same draft survives a temporary loss/recovery of available review context. Cash request and assigned-review screens add safe-area-aware bottom scroll clearance for the floating navigation.

Source validation **PASSED**: TypeScript/Metro (nine exclusions), 193 tests in 62 suites, separate Android/iOS JS exports and the two-export credential audit. No APK build/install, live financial mutation or Android/iOS workflow acceptance was performed for this queued change. Native font scaling, keyboard, screen-reader, theme and reduced-motion checks remain **NOT TESTED** for this source revision. [Export audit](M7-review-note-source-release-audit.json)

When the user authorizes the next APK, use these personal scenarios:

| Approved actor required | Scenario |
| --- | --- |
| Accounting Staff, blocked package with no eligible settler or review action | One settlement warning; no unused note editor; no settlement or journal action becomes available. |
| Assigned independent reviewer, with settlement blocked | Review note and review decision controls remain available under the existing server capability; settlement remains blocked. Required-note validation remains in force. |
| Task Lead / authorized Office Head / Accounting Staff with their respective current action | Note precedes the appropriate endorsement, late authorization or settlement controls; long labels remain readable; actions are distinct and preserve existing contracts. Use safe fixtures only for writes. |
| Each supported permanent role, Android and iOS separately | At small phone width and 150%/200% text, scroll the note and final action clear of navigation. Check keyboard focus/dismissal, light/dark, reduced motion and accessibility. |
| Authorized reviewer, interrupted reads | Retain the draft during context unavailability and recovery; unavailable capabilities must not expose an action. |

### Current phone APK — secure sign-in repair (build 19)

Updated **6 November 2026, Asia/Singapore**. [Download build 19](../../artifacts/M7/eFlow-Mobile-M7-SignIn-Fix-arm64-x86_64.apk) and install over build 18 without clearing application data. The navy/blue theme is retained. Personal acceptance remains **PENDING**.

**Build 18 fresh sign-in is broken.** The earlier description that it used the hosted sign-in path was incorrect. It was built without `EXPO_PUBLIC_EFLOW_MOBILE_SIGN_IN=edge`; the old opt-in default selected the protected gateway. That gateway's published Cloudflare hostname returned **ENOTFOUND**. The user saw the connection error even with working internet. Build 18's restored-session display checks never established fresh sign-in. [Diagnosis receipt](M7-sign-in-fix-diagnosis.json)

Build 19 defaults native password sign-in and reauthentication to the already deployed protected Supabase `mobile-sign-in` endpoint. The old protected gateway now requires the explicit mode `gateway`; invalid modes fail configuration validation before any native fallback. A hosted-sign-in error never retries credentials against the older service. Account lockouts, denial, rate limits and session validation remain authoritative. No hosted function, schema, RLS, role, credential or production data was changed for this repair.

The normal Android/iOS export commands now run `npm run verify:sign-in` first. It resolves the production Expo environment, evaluates the actual native configuration and rejects a gateway QA override or an invalid mode. APK source verification now includes `src/platform/config.ts` and `mobileSignIn.ts`, closing the previous configuration-source evidence gap. Keys and credentials are not printed.

| Check | Result |
| --- | --- |
| TypeScript / Metro | **VERIFIED**: `npm run check`, nine exclusions. |
| Regression tests | **VERIFIED**: 190 tests in 61 suites. Includes absent/empty/edge transport, explicit gateway mode, invalid configuration and no credential fallback after a network error; lockout/denial/session guards retained. |
| Production transport preflight | **VERIFIED** with the flag absent. Explicit gateway and unsupported-mode environments were also rejected by the release preflight. |
| Android and iOS JS/Hermes exports | **VERIFIED** separately with the normal production environment. |
| Live service reachability | **VERIFIED** from the build host: deployed function ACTIVE/version 1, HTTP 405 for GET and 422 for an empty POST; these do not validate account credentials. Published old-gateway discovery returned HTTP 200; its hostname did not resolve. |
| Android standalone source/signature/credential inspection | **VERIFIED**: build 19, ARM64/x86_64, non-debuggable, same signer as build 18, configuration/adapter sources matched. Emulator upgrade and cold launch verified; the signed-out sign-in form rendered. No credentials were entered, so this is not a successful sign-in. [Build 19 sign-in screen](../../artifacts/M7/sign-in-fix-cold-launch.png). [Build 19 APK receipt](M7-sign-in-fix-apk-verification.json) and [credential audit](M7-sign-in-fix-release-audit.json). |
| Real-account fresh sign-in | **BLOCKED** for agent verification pending a dedicated approved account through the protected flow. No real password was entered; existing restored sessions are not a login pass. |
| Physical Android acceptance | **NOT TESTED** by the agent. User should retry on build 19 using the checklist below. |
| Native iOS build/workflows | **BLOCKED** on Windows without Mac/Xcode/device. JS export is separate evidence. |

For each **approved Head, Member and Accounting Staff** account, install build 19 on an Android phone and sign in on Wi-Fi or mobile data. Record exact account, server-confirmed role, Office, device/build, result and whether the existing session was restored or a password was submitted. Expect the normal role tabs and exact Office context. Do not use Admin credentials. Use approved disposable fixtures for deliberate wrong-password/lockout testing, and leave those scenarios **BLOCKED** if fixtures are unavailable. Existing profile/settings/reauthentication permissions remain unchanged. Do not sign out the only working session just to obtain a screenshot.

### Superseded phone APK — logo color theme (build 18)

Updated **6 November 2026, Asia/Singapore**. [Download build 18](../../artifacts/M7/eFlow-Mobile-M7-Brand-Theme-arm64-x86_64.apk). **Superseded for fresh sign-in by build 19.** This standalone ARM64/x86_64 APK uses the existing local QA signer but accidentally selected the old gateway; the prior hosted-sign-in claim was incorrect. Personal acceptance remains **PENDING**.

The user requested the supplied eFlow logo's palette throughout the mobile project. The shared primary is navy `#00006b`, with brand blue `#0073ea`, blue-tinted light neutrals and navy dark surfaces. Buttons, selected navigation, login/mark/startup, cards, ambient gradients, loading states, fields, tables and existing export styles share the palette. Information text uses an accessible darker blue; dark controls use lighter blue and a dark on-primary foreground. A native dark-mode check caught a white floating-action icon on a light blue surface; the final candidate uses the on-primary token. Decorative announcement accents also use blue. Warning, error, completion and review meanings remain distinct. [Native palette specification](design-system.md#m7-logo-palette-revision--6-november-2026)

| Verification for this revision | Result |
| --- | --- |
| TypeScript / Metro configuration | **VERIFIED**: `npm run check`; nine Metro exclusion checks. |
| Automated regressions and color contrast | **VERIFIED**: 182 tests in 60 suites. The regressions include the appearance chooser selected/close icon colors after dark-mode hydration. The contrast regression checks normal-text pairs at 4.5:1 or better in both themes, including semantic feedback and hero gradient stops. |
| Android and iOS production JS exports | **VERIFIED** separately. These are JavaScript/Hermes checks, not native iOS verification. |
| Android standalone compilation and APK inspection | **VERIFIED**: build 18, ARM64/x86_64, non-debuggable, signed, current theme sources embedded, native primary resource navy. [APK receipt](M7-brand-theme-apk-verification.json) |
| Release credential audit | **VERIFIED** for both exports and the actual APK bundle; no development account literals. [Audit](M7-brand-theme-release-audit.json) |
| Native Android display and workflow checks | See the final display evidence below. Full role and fixture workflow acceptance is **NOT TESTED** for this visual revision. |
| Physical Android | **NOT TESTED** by the agent. |
| Native iOS compile, themes, reduced motion, accessibility, font scaling and keyboard | **BLOCKED**: Windows host without Mac/Xcode/iOS simulator or device. |
| TalkBack / VoiceOver and all-role personal acceptance | **NOT TESTED** for this revision; do not carry forward historical passes. |

Final Android display checks use the already restored session for **Gabriel Cahiyang, `gabzcah@gmail.com`, server-profile role `accounting_staff`, LEDIPO** on `emulator-5554`, Android 17 / API 37, x86_64, non-debuggable build 18. The agent did not enter credentials or submit business/financial writes. This existing-session display smoke check does not establish dedicated-account approval, fresh sign-in or full Accounting workflow acceptance. [Profile/role](../../artifacts/M7/brand-theme-final-profile.png) · [My Work, light](../../artifacts/M7/brand-theme-final-my-work.png) · [More, light](../../artifacts/M7/brand-theme-final-more.png). Dedicated role-workflow QA is **BLOCKED** pending approved accounts/fixtures; this restored-session display inspection is separate. Head and Member visual checks still require their approved sessions. The final dark My Work screen was inspected at 150% with Android animator duration set to zero; the floating-action icon uses the corrected dark foreground. [Dark, 150%](../../artifacts/M7/brand-theme-final-dark-150.png). The final appearance chooser was also inspected with readable selected and close icons. [Dark chooser](../../artifacts/M7/brand-theme-final-chooser-dark.png). A 200% dark-mode smoke check also retained the palette; the compact Office label and long task title/context truncate, and date filters scroll horizontally. This is not full large-text acceptance. [Dark, 200%](../../artifacts/M7/brand-theme-final-dark-200.png). Search focus opened the configured Android handwriting toolbar; full software-keyboard typing/layout is **NOT TESTED**. [Input focus](../../artifacts/M7/brand-theme-final-keyboard.png).

Personal checklist — record actor email, server-confirmed permanent role, Office, device/build and VERIFIED/FAILED/BLOCKED/NOT TESTED for each scenario. Approved account credentials are required; do not use Admin or production writes to test colors.

| Account required | Scenario |
| --- | --- |
| Approved Head | Check Home hero/attention, My Work, Inbox, Projects, More, workspace chooser, Profile and Back in light/dark. Blue/navy should replace teal decoration while status meanings remain recognizable. |
| Approved Member | Repeat shared destinations and the permitted task/branch inspector. Check status/deadline chips, selected tabs, sheets, keyboard, placeholders and empty/error states. |
| Approved Accounting Staff | Check My Work, Inbox, Accounting, Projects and More, then authorized read-only funding context. Unavailable finance must remain unavailable; submit no financial operation for color QA. |
| Each supported role, Android and iOS separately | Check device/system/light/dark preference, 150% and 200% font scaling, reduced motion, screen-reader labels/focus, keyboard and predictable Back. Check primary icons/labels against their backgrounds. |
| Signed-out approved device/session | Check startup, sign-in, invalid-field feedback and recovery colors through the normal protected flow. Do not sign out a sole working session merely to collect an image. |

This revision does not accept M7 or authorize another phase. No backend, generated web core, permission or finance contract was changed. The emulator was restored to its original light app preference, 100% font scale, system night mode off and default animator scale. Historical QA below belongs to its stated builds.

### Previous phone APK with updated tab feedback (build 17)

[Download build 17](../../artifacts/M7/eFlow-Mobile-M7-Navigation-arm64-x86_64.apk) and install it over build 16. It uses the Supabase sign-in path described below. No destinations or navigation entries were removed in this update.

| Before | After |
| --- | --- |
| Press tinted the full rectangular tap area. Selection used a separate highlight behind the icon. | Press, mouse hover, and selection use the same rounded highlight behind the icon. Opacity fades over 120 ms with motion enabled and changes immediately with reduced motion. The full tab remains tappable. |

Android emulator **VERIFIED** for upgrade and cold launch, holding Projects while Home is selected, releasing into Projects, Android Back to Home, and the dark-mode selected state with Android animations disabled. Physical Android and native iOS interaction are **NOT TESTED** for this update. All 180 tests, both native JS exports, and the credential audit passed. [Before press](../../artifacts/M7/tab-feedback-before-press.png) · [Build 17 press](../../artifacts/M7/tab-feedback-after-press.png) · [Build 17 selection](../../artifacts/M7/tab-feedback-after-selected.png) · [Back](../../artifacts/M7/tab-feedback-after-back.png) · [APK receipt](M7-navigation-apk-verification.json)

On your phone, tap Home, Projects, and More in succession. Hold a different tab briefly before release and check that the highlight keeps the same rounded shape. Try Android Back, dark mode, and the Android Remove animations setting. If you use a mouse or stylus that supports hover, check that hover uses the lighter version of the same highlight.

### Supabase-hosted sign-in

[Build 16](../../artifacts/M7/eFlow-Mobile-M7-Supabase-SignIn-arm64-x86_64.apk) introduced Supabase sign-in. Connect to Wi-Fi or mobile data and sign in with your authorized eFlow account on build 16 or 17. [APK receipt](M7-edge-phone-apk-verification.json) · [Credential audit](M7-edge-phone-release-audit.json)

The `mobile-sign-in` Edge Function handles native password sign-in and password reauthentication in builds that set `EXPO_PUBLIC_EFLOW_MOBILE_SIGN_IN=edge`. It calls the approved Supabase project over HTTPS. It shares the existing login attempt leases, failed-attempt counters, durable locks, provider ban receipts, and audit records with eFlow Web. Admin lockout management continues to use its existing web route. Invitation acceptance and creation retain their existing contracts.

Read-only inspection of the hosted database verified that the existing `eflow_login_begin`, `eflow_login_finish`, and `eflow_login_admin` functions allow the server role and deny execute access to public and signed-in client roles. The Edge Function uses the server runtime key. The mobile bundle uses the existing public project URL and publishable key.

All 179 mobile tests and eight Deno handler tests passed, including lock denial, threshold and ban receipts, concurrent attempts, provider errors, and unavailable-route handling. Both opt-in native JS exports passed. On 5 November 2026, `mobile-sign-in` version 1 was deployed to `ixnfphgjyelhckjwjkdv`. Live probes verified HTTP 405 for an unsupported method, 422 for an empty request, and 401 for a synthetic nonexistent identity. Each response used `Cache-Control: no-store` and contained no session tokens.

The signed APK upgraded build 15 and cold-launched on the emulator. A fresh Android profile rendered the sign-in screen. An Android system process stopped responding during the follow-up form interaction, so a submission through the emulator UI remains **BLOCKED** for this run. The live HTTP probes were separate. [Sign-in screen](../../artifacts/M7/edge-phone-login.png) · [Android system dialog](../../artifacts/M7/edge-phone-system-anr.png)

For personal acceptance, sign in as Head, Member and Accounting Staff on a phone using Wi-Fi or mobile data. Use approved disposable accounts for tests that deliberately submit wrong passwords. Check the configured threshold, concurrent web and mobile attempts, lock denial with a correct password, and Admin unlock through the existing web flow. Confirm provider throttling gives a retry state and leaves the failed-password counter unchanged. Live sign-in with a real account and physical phone acceptance remain **NOT TESTED** by the agent.

### Historical phone APK with published gateway discovery

[Build 15](../../artifacts/M7/eFlow-Mobile-M7-Phone-arm64-x86_64.apk) used the published gateway discovery route. Discovery returned HTTP 200 and the published Cloudflare hostname failed DNS. Fresh sign-in on build 15 was **BLOCKED**. Android x86_64 emulator upgrade and cold launch were **VERIFIED**. Both native JS exports, 173 tests, and the credential audit passed. [APK receipt](M7-phone-apk-verification.json) · [Credential audit](M7-phone-release-audit.json)

### Tethered QA APK

[Download the M7 tethered QA APK, build 14](../../artifacts/M7/eFlow-Mobile-M7-QA-arm64-x86_64.apk)

This build uses the QA computer's protected gateway for fresh sign-in. On a physical phone, connect it to that computer with USB debugging enabled and approve the Android debugging prompt. Run `adb devices` to find its serial, confirm the gateway is listening on the PC, and run the commands below. Keep the ADB connection active for sign-in. Enter your password directly in the app. [Gateway setup](M0-login-fix-qa.md)

```powershell
adb -s <serial> install -r artifacts/M7/eFlow-Mobile-M7-QA-arm64-x86_64.apk
adb -s <serial> reverse tcp:8322 tcp:8322
```

Without forwarding, build 14 sends the sign-in request to `127.0.0.1:8322` on the phone itself and displays “Secure sign-in could not be reached” if the gateway is unavailable. Android treats build 15 as an upgrade from build 14. A later switch back to build 14 would be a downgrade.

| # | Actor and prerequisite | Steps and expected result |
| --- | --- | --- |
| 1 | Approved Head, Member and Accounting Staff | Sign in as each role. Confirm the bottom tabs, More → Account & settings → Profile, and that Back returns to the originating tab. Sign out before switching actors and verify the next actor has only their own workspace and records. |
| 2 | Head with an accessible Office project and a Personal workspace | In Projects, search with the keyboard open and inspect Main table, Board and Agenda. Open a task, its immediate subitem, Activity and Funding. Verify exact Back through the same project. Switch to an authorized Personal context and back. Office records must appear only in the correct context. |
| 3 | Member assigned a safe task and subitem, with a matching Inbox update | In My Work and Inbox, choose a filter and follow the exact update. Check record identity and Back with the filter retained. Confirm an unrelated actor cannot open that work. Verify the separate second Office boundary with an approved fixture. |
| 4 | Dedicated worker and separate eligible reviewer, including an appointed Subitem Lead where applicable | On an approved fixture, attach safe camera/file evidence, interrupt and retry, submit, then return for changes with a reason or approve from the eligible reviewer. Check history and final state as the worker. Self-review must be denied. |
| 5 | Accounting Staff with approved readable cash records | Open Accounting → Requests & releases and Assigned reviews. Verify exact Office, fiscal year, amount and receipt identity. Verify independent review and settlement stay separate. Use an approved writable fixture for any cash or review mutations. |
| 6 | Two approved participants in a safe text conversation | Open Messages or the exact task conversation. Verify the keyboard leaves the composer reachable. Send a safe text and confirm one receipt on the second account, including retry if the reply is interrupted. |
| 7 | Any approved mobile role on a device | Check light and dark mode, 150% and 200% text, orientation, keyboard, TalkBack or VoiceOver, Back, and background/resume. Check web handoffs when the build has an approved web origin. Repeat separately on Android and iOS. |
| 8 | LEDIPO Head with access to the historical liquidation notice, or an equivalent approved fixture | From Inbox, select **Open related item** on the liquidation notice, then **Open linked subitem funding**. Confirm that the Book Venue record is `FR-00001` for the historical notice. Press Back twice and confirm the same Inbox position. |

Record **VERIFIED**, **FAILED**, **BLOCKED**, or **NOT TESTED** for each step. Include actor role, Office, contextual appointment if applicable, device and build number. Use safe approved test records for writes. The existing production records used for agent verification were read-only.

## Results

| Check | Result |
| --- | --- |
| Source identity | **VERIFIED.** Base commit `6d4f19fc1829e9470d8dca2de524a2041b93521d` with the mobile redesign working tree. Initial M7 build 13 matched the M6 embedded bundle. The final APK receipt records the updated bundle and matching sources for the financial-link repair. |
| TypeScript and Metro | **VERIFIED.** `npm run check` passed with nine Metro exclusion checks. |
| Automated regressions | **VERIFIED.** 173 tests across 59 suites passed. Covered role navigation and Admin exclusion, scope and exact destination, financial command recovery, evidence and review fixtures, and message retry identity. |
| Android and iOS Hermes exports | **VERIFIED.** Both exports passed. The credential audit passed on both exports and the APK bundle. [Credential audit](M7-release-audit.json) |
| Android build, signature and cold launch | **VERIFIED.** Build 14, ARM64/x86_64, non-debuggable, local QA certificate, embedded source, and retired presentation exclusions checked. Installed and cold-launched on `emulator-5556`, Android 16 API 36, x86_64. [APK receipt](M7-apk-verification.json) |

The general read-only and display captures below are from build 13. The affected financial-link path was retested on the final build. Android used the restored `bplo.head@gmail.com` account, server-confirmed permanent role `head`, LEDIPO. No Task Lead or reviewer appointment was assumed. [Role evidence](../../artifacts/M7/profile-role.png)

| Emulator scenario | Result |
| --- | --- |
| Head Home, My Work, More and Profile | **VERIFIED** for the role tabs, Home, My Work empty state, and Account & settings → Profile. [Home](../../artifacts/M7/home.png) · [My Work](../../artifacts/M7/my-work.png) · [Account & settings](../../artifacts/M7/account-settings.png) |
| Projects and exact work navigation | **VERIFIED** for project search with the keyboard, opening the Office project, Venue Reservation → Book Venue, Activity and Back to the task. [Projects](../../artifacts/M7/projects.png) · [Keyboard](../../artifacts/M7/projects-keyboard.png) · [Task](../../artifacts/M7/task.png) · [Subitem](../../artifacts/M7/subitem.png) · [Activity](../../artifacts/M7/task-activity.png) · [Back](../../artifacts/M7/task-after-back.png) |
| Historical liquidation notice | **FAILED** on build 13, which opened the task's Funding view and reported the record unavailable. **VERIFIED** on build 14. The recovery action opened Book Venue `FR-00001` read-only, and two Back presses returned to the original Inbox position. [Build 13](../../artifacts/M7/build13-inbox-financial-before.png) · [Recovery action](../../artifacts/M7/final-inbox-financial-destination.png) · [Exact record](../../artifacts/M7/final-inbox-subitem-funding.png) · [Inbox after Back](../../artifacts/M7/final-inbox-back.png) |
| Office and Personal workspace boundary | **VERIFIED.** Switching from LEDIPO to the authorized Test1 Personal workspace hid the Office task contents and gave a workspace message. Switching back restored the same task. [Boundary](../../artifacts/M7/workspace-personal-blocks-office.png) · [Restored task](../../artifacts/M7/workspace-restored-task.png) |
| Inbox interruption and recovery | **VERIFIED** that existing updates stayed visible through a forced Wi-Fi and mobile-data interruption. Refresh reported unavailable sources and offered Retry. Reconnection restored the Inbox. A Personal decisions warning was visible in the initial reconnect capture and cleared on the later online check. [Offline](../../artifacts/M7/offline-inbox.png) · [Reconnected](../../artifacts/M7/inbox-online-final.png) |
| Background and foreground | **VERIFIED** that Android brought the existing app task to the foreground and the same Venue Reservation task returned after access refreshed. A loading screen briefly covered the app. [Android launch log](../../artifacts/M7/resume.log) |
| Text scaling, orientation, keyboard and reduced motion | **VERIFIED** for Head Home in dark mode at 150% and 200%, a landscape layout smoke check, and Android Projects search keyboard. Android animator duration was disabled during the display checks. At 200% portrait the Projects tab wraps mid-word, and the compact Office label truncates at 200%. The workspace chooser displays the full Office name. [150%](../../artifacts/M7/dark-150.png) · [200%](../../artifacts/M7/dark-200.png) · [Landscape](../../artifacts/M7/landscape-200.png) |
| TalkBack | **BLOCKED** for app focus order and spoken output in this run. Android bound TalkBack and enabled touch exploration. The Android Accessibility Suite notification prompt interrupted the gesture check. [Service state](../../artifacts/M7/talkback-state.log) · [Prompt](../../artifacts/M7/talkback-swipe.png) |
| Announcements and Office Team handoff | **VERIFIED** for clear unavailable states and Back. Live Announcements reads are **BLOCKED** by the hosted policy, and the web handoff needs a configured HTTPS origin. [Announcements](../../artifacts/M7/announcements-unavailable.png) · [Office Team handoff](../../artifacts/M7/office-team-web-unavailable.png) |
| Fresh protected sign-in, sign-out and account switch | **BLOCKED** for full login and account switch. The protected listener and approved role sessions were unavailable. Sign-out from the only working session was **NOT TESTED**. Live Admin login was **NOT TESTED** under the web-only restriction. Automated denial passed. |
| Member and Accounting Staff, second Office and depth-eight live fixtures | **BLOCKED** by missing approved sessions and test data. No live Accounting screenshot. Automated route and authority coverage is separate. |
| Evidence upload, review, messaging, finance writes | **BLOCKED** pending dedicated actor/fixture and backend prerequisites. No production write was performed. |
| Physical Android and native iOS | Physical Android **NOT TESTED** by the agent. Native iOS build and device workflows **BLOCKED** on Windows. Personal acceptance is pending. |

## Office Main table pagination

Build 34 adds automatic task paging to the Office project Main table. See [the before-and-after inventory and personal QA checklist](M7-main-table-pagination-qa.md).

## Inbox update pagination

Build 35 loads older Inbox updates as you scroll. See [the before-and-after inventory and personal QA checklist](M7-inbox-pagination-qa.md).

## Chat history pagination

Build 36 loads older chat messages as you scroll up. See [the before-and-after inventory and personal QA checklist](M7-chat-pagination-qa.md).

## My Work scroll paging

Build 37 reveals My Work assignments in batches from the authorized snapshot. See [the personal QA checklist and network paging prerequisite](M7-my-work-pagination-qa.md).

## Office Board and Agenda paging

Build 38 pages Board by status and Agenda by date. See [the verification and personal QA checklist](M7-board-agenda-pagination-qa.md).

## Projects directory and Personal task paging

Build 39 pages the Projects directory in both workspace types and the Tasks tab inside Personal projects. See [the personal QA checklist and network paging prerequisite](M7-project-directory-personal-pagination-qa.md).

## Sign-in and alert wording

Build 40 shows **Couldn't sign in** and **Email or password is incorrect.** for rejected credentials, account lockout responses, and a confirmed role outside mobile access. The sign-in service does not identify the role when it returns a lockout, so the same wording applies to every locked account. The sign-in button stays labeled **Log in**. A restored Admin session offers **Back to sign in** and does not open a workspace.

Shared alerts now use **Check your details** for form guidance, **Check before retrying** for an unconfirmed result, and more specific headings when an item changed, an upload stopped, or changes were already saved. Before repeating any unconfirmed operation, refresh and check the record.

| Personal check | Expected result | Status |
| --- | --- | --- |
| Approved Head, Member or Accounting Staff with a known good account | On Android and iOS, check the sign-in form and confirm valid credentials reach the workspace. If an approved negative test is available, make one deliberate invalid attempt and check the generic message. | NOT TESTED on a personal device |
| Local mock lockout or restored Admin fixture | Generic credentials message. No workspace access and no automatic retry. Do not use live Admin credentials or deliberately lock an account. | Covered by automated checks |
| Approved Member with a safe task draft | Open a form that requires a work note and leave it empty. Verify **Check your details** and the instruction about the missing note. Check legibility in both themes and with large text and TalkBack or VoiceOver. Use a local fixture for the uncertain-result alert. | NOT TESTED on a personal device |

## Subtasks, project tables and role priorities

11 November 2026, Asia/Singapore. Personal acceptance is pending.

TypeScript and nine Metro checks passed. All 274 tests in 84 suites passed. Android and iOS production Hermes exports passed separately. The credential audit passed on both exports and the APK's embedded bundle. [Credential audit](M7-subtasks-projects-v41-release-audit.json)

Android release compilation, ARM64/x86_64 packaging, signature and source checks passed. The non-debuggable APK upgraded the isolated `eFlow_M7_Resume_QA` emulator from build 39 and cold-launched to the dark sign-in screen on Android API 36/x86_64. No signed-in actor or role was verified on this build. [APK verification](../STANDALONE_V41_APK_VERIFICATION.json)

Native iOS compilation and device workflows require Xcode and an iOS device or simulator.

- Mobile uses **Subtask** in the affected screens. Task details and the project Main table show the existing task start date. New subtasks preselect the Task Lead when the current directory lists that person as eligible.
- Subtask details open directly to a chronological Activity timeline with history, decisions and evidence. Project percentages count completed tasks. Task and subtask details count completed direct children. A leaf uses its own completion status. A record under review contributes zero completed items.
- Projects uses the Main table's row and header styles with Project, Status and Type columns. The Main table replaces Office with Budget and Actual expense and keeps the Task column pinned. Budget sums approved root allocations. Actual expense sums settled cash visible to the account, including authorized records for the task's subtasks. A dash means no amount was available to display.
- Head Home shows up to three current projects in the selected workspace, prioritizing projects on hold and then active projects. Member Home shows up to three open assignments in the selected workspace, with overdue and due-today work first. Accounting Staff has Accounting in the bottom navigation and can open Reviews from More. Notifications offers All and Unread updates.

| Personal check | Account and fixture | Expected result |
| --- | --- | --- |
| Home and Projects | Approved Head in an Office with active, on-hold and completed projects. Approved Member with assignments in two workspaces. | Check project status and percentage, workspace isolation, table headers, search, favorites, scroll paging and Back. Member Home should prioritize due work in the selected workspace. |
| Main table and task details | Approved Head or task Lead with a dated task and authorized approved allocations and settled expenses. | Start date is readable in both screens. Swipe across the table and confirm the task name stays pinned. Compare the authorized amounts with the same records on eFlow Web. |
| Subtask activity and progress | Approved Task Lead, with two completed and one pending-review subtask under a task. Include a nested subtask with historical activity and evidence. | The task shows 67%. Open the nested subtask and confirm the Activity timeline is visible immediately. Verify authors, times, decisions and evidence, then check Back returns to the same branch. |
| Creation and completion | Approved Task Lead on a dedicated writable fixture, and a different approved reviewer. | Check that the eligible Task Lead is selected in Add subtask. Verify the Evidence (optional) label and Mark as complete button. The root task continues to require its independent reviewer. Open Reviews in More and confirm both review buttons fit. |
| Contributor boundary | Approved Member contributor and a separate eligible Subtask Lead. Use a second Office for cross-Office routing when available. | Mobile shows that Lead approval is unavailable and prevents contributor execution from writing changes. Read the same task, subtask and project afterward to verify their status and completion. The Lead can still use existing authorized actions. |
| Accounting and Notifications | Approved Accounting Staff and a safe assigned review. | Accounting is a main tab. More opens the assigned review queue. Notifications shows All and Unread and opens authorized links to their exact records. |

For each supported scenario, check Android and iOS separately in both themes with increased font size, TalkBack or VoiceOver, reduced motion and the keyboard open where applicable. Use only approved role accounts and dedicated fixtures. Fresh role sign-in, signed-in device workflows and personal acceptance are pending unless documented in the platform evidence below.

### Shared backend prerequisites

Verified against authoritative eFlow Web Git revision `4ff217b84e3e8128555ffc87f0514253cd576399`. The hosted target is `ixnfphgjyelhckjwjkdv`.

- **Subtask start date and today default — integration blocked.** The Office and Personal subtask records and the `r7_work_command` and `nw_work_command` create payload accept a due date. The shared contract needs a persisted date on both subtask record types, create validation and calendar default semantics, and projection through `r7_work_tree`. The mobile form reports the unavailable field while retaining supported creation.
- **Contributor submission and nearest-Lead approval — integration blocked.** `save_subtask_work_update` applies state and history immediately. The existing root progress/status and Personal nested-work commands also lack a pending change stage for every contributor execution action. The shared contract needs revision- and actor-scoped pending submissions, authorized nearest eligible Lead routing, a decision and notification surface, and atomic application of accepted changes with receipt recovery. Keep existing self-review, ancestor fallback, descendant completion and Responsible Office Head root-review checks. Mobile blocks the direct contributor execution paths, including retries of uncommitted Personal nested work. Existing finance and independent-review authorities continue to use their own contracts.

## Integration dependencies

- Protected fresh login requires the existing gateway and approved accounts. The local QA listener on port 8322 was unavailable at preflight.
- Member and Accounting Staff logins, dedicated worker/Lead/reviewer identities, approved writable fixtures, and a second Office are required for their respective live workflows.
- Announcements recipient-policy recursion remains a hosted integration issue. Office Team is a web handoff in the final mobile scope. Browser launch requires `EXPO_PUBLIC_WEB_ORIGIN`. [M4 integration record](M4-backend-proposal.md)
- Installed finance/NW11 prerequisites and role-scoped test data apply to the affected finance workflows. [M5 finance dependencies](M5-personal-qa.md)
- Physical Android personal acceptance is pending. Native iOS compile and workflow testing require a Mac/Xcode and simulator or device.
