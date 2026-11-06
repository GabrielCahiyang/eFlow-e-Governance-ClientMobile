# M2 personal QA — Home, My Work and Inbox

M2 was explicitly authorized while the M1 personal test was deferred. Both personal reviews remain pending. M2 focuses on finding work, opening its exact destination and keeping updates and assigned decisions together.

## What changed

Home starts with overdue, due-today and returned assignments in the active workspace, then links to My Work and Inbox. My Work combines assigned roots and subitems in a searchable list with date groups. Each row shows the project, workspace, responsibility, status and deadline. One sheet controls date and workspace filters. Unscheduled and other historical records remain reachable.

Inbox has one list for assigned decisions and recent updates, with Decisions and Unread filters. Unread counts reflect the recent 50 updates available from the existing service. Unavailable decision sources have their own retry message and leave other sources readable. Mark read changes the visible state after the existing server write confirms the recipient and record. A failed refresh after confirmation keeps the confirmed read state.

Office and personal branch links open the matching server work-tree node. Legacy Office subitems can show their exact authorized record when the work-tree service is unavailable. Work controls still use the existing scoped capabilities. The M3 inspector and M4 evidence/decision redesign are separate phases.

| Area | Files |
| --- | --- |
| Home and My Work | `OverviewScreen.tsx`, `PersonalWorkFeedScreen.tsx`, `mobileWork.ts`, `WorkFeedProvider.tsx`, `WorkRowItem.tsx`, `FeedSkeleton.tsx`, `workDestination.ts` |
| Inbox | `ActionInbox.tsx`, `inboxDestinations.ts`, `notifications/index.ts`, `FinancialReviewsScreen.tsx` |
| Linked work | `LinkedWorkNodeScreen.tsx`, `WorkTreePanel.tsx`, `TaskDetailsScreen.tsx`, `TaskReviewPanel.tsx`, `PersonalProjectScreen.tsx` |
| Shell and shared UI | `NativeWorkspace.tsx`, `MobileContent.tsx`, `mobileScope.ts`, `routes.ts`, `SelectionSheet.tsx` |
| Release and tests | `app.json`, work category, notification routing, mark-read recovery and exact-branch regressions |

The previous standalone Reviews and update-only screen are out of the native shell. The existing service contracts are used by the new Inbox. Source base `6d4f19fc1829e9470d8dca2de524a2041b93521d`. The canonical web remote was checked at `b8d9fd8a7195b50fe7446b45092c9528586b0778`.

## Build and verification

| Check | Result |
| --- | --- |
| `npm run check` | Passed TypeScript and nine Metro exclusion checks. |
| `npm test` | 47 suites and 137 tests passed, including mocked self-review exclusion, exact routing and mark-read recovery. |
| `npm run build:android`, `npm run build:ios` | Both Hermes JS exports passed. |
| Source identity | `a3ba11d82368a4da8c25af2c9c95ff25a1c349e6f515928a4ab9770930ea7ebd`. [Source and export hashes](M2-source-identity.json). |
| iOS native build and device workflows | BLOCKED. Windows host, with no Xcode, iOS simulator or iOS device available. |
| Android release assembly and signature | Passed. Non-debuggable standalone release, `arm64-v8a` and `x86_64`, version 1.0.0 (code 7). The embedded bundle matches the M2 source. [APK receipt](M2-apk-verification.json). |
| `npm run verify:release` including the packaged bundle | Passed for Android export, iOS export and Android APK. [Credential audit](M2-release-audit.json). |

[eFlow-Mobile-M2-QA-arm64-x86_64.apk](../../artifacts/M2/eFlow-Mobile-M2-QA-arm64-x86_64.apk) is the single Android QA artifact for an ARM64 phone or x86_64 emulator. SHA-256 `8ae6b5db31f585df72684f579ae07149e9cd984426df80f6d7178a57fec07338`. The local Android QA certificate SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

Install with `adb -s <serial> install -r <apk-path>` on a USB debugging device or emulator. The APK embeds its JavaScript. For a fresh sign-in with the local gateway running, use `adb -s <serial> reverse tcp:8322 tcp:8322` and keep ADB connected.

For fresh sign-in on the QA build, use the protected local gateway and ADB forwarding from the M0 setup. The public tunnel remains a dependency for normal public access. [Local gateway setup](M0-login-fix-qa.md).

Read-only catalog inspection on `ixnfphgjyelhckjwjkdv` confirmed that `r3_list_workspaces`, `r3_select_workspace`, `r7_work_tree`, `r7_pending_subtask_reviews`, `list_my_independent_liquidation_reviews` and `decide_task_review` are installed and executable by the authenticated database role. Individual actor and record authorization still depends on the server.

## Android emulator evidence

The APK installed as version code 7 and cold launched on `emulator-5556`, Android 16 API 36. Profile confirmed the restored actor `bplo.head@gmail.com`, role `head`, LEDIPO. Evidence comes from the installed APK. ADB visual navigation was used after the automated UI hierarchy timed out.

| Scenario | Result |
| --- | --- |
| Head Home | VERIFIED. LEDIPO Office context and the attention empty state loaded. Switching to the authorized personal workspace Test1 updated the Home context, and switching back restored LEDIPO. [Office](../../artifacts/M2/emulator-home.png) · [Personal](../../artifacts/M2/emulator-home-personal.png). |
| Head My Work | VERIFIED. The filter sheet opened, Overdue remained selected through pull to refresh, and an unmatched search showed its empty state. Android Back dismissed the search keyboard. [Filter sheet](../../artifacts/M2/emulator-filter.png) · [Search](../../artifacts/M2/emulator-search-empty.png). |
| Head Inbox | VERIFIED. The recent feed showed six unread updates and zero assigned decisions. Opening the venue cleanup notification resolved its exact Office task while keeping Inbox selected. System Back returned to Inbox, where the Decisions filter showed its empty state. [Inbox](../../artifacts/M2/emulator-inbox.png) · [Linked task](../../artifacts/M2/emulator-inbox-linked-task.png). |
| Display and input | VERIFIED on the restored Head session for the Inbox with dark mode, 150% font scale and disabled Android system animations. The original settings were restored. TalkBack and VoiceOver remain untested. [Dark Inbox](../../artifacts/M2/emulator-inbox-dark-large-text.png). |
| Populated work groups, exact nested links, assigned decisions and confirmed mark read | Automated scenarios passed. Populated device cases remain BLOCKED pending approved fixtures and appropriate actors. No live update was marked read. |
| Fresh login, other permanent roles, cross-Office and independent reviewers | BLOCKED pending approved accounts and fixtures. |
| Physical ARM64 phone and native iOS | NOT TESTED on a phone. iOS native build and workflows BLOCKED on this host. |

## Role accounts and fixtures

| Use this account | Role and context | Suitable scenarios |
| --- | --- | --- |
| `bplo.head@gmail.com` | Existing provided Head, LEDIPO. The emulator may restore its existing session. | Read-only Home, My Work, Inbox and authorized project navigation. |
| Dedicated Member | Member in the fixture's Office, with an assigned root and a different assigned subitem. | Search, dates, exact subitem, personal and Office assignments, safe update. |
| Dedicated Accounting Staff | Accounting Staff in the approved QA Office. | My Work and Inbox, read-only financial review availability when assigned. |
| Separate worker, Lead and Reviewer | Permanent mobile roles plus their existing contextual appointments. Include a second authorized Office and an unrelated actor. | Review eligibility, own submission exclusion, exact branch and cross-Office boundary. |

Provisioning remains deferred. Use existing approved test records. Record the actor email or ID, server-confirmed role, Office and result for each run. Keep credentials out of notes. Use read-only finance checks.

## Personal checklist

| # | Actor | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| 1 | Head or Member | Install the APK, launch and open Home. Switch between an authorized Office and personal workspace. | Home identifies the active context and shows that context's urgent assigned work or a useful empty state. | ☐ Pass ☐ Fail ☐ Blocked |
| 2 | Member or Head with assignments | Open My Work. Pick Overdue, Today, Upcoming and Completed in Filter work. | The groups follow workspace dates and history. Assigned root and subitem rows appear together. | ☐ Pass ☐ Fail ☐ Blocked |
| 3 | Same worker | Search for a task title or project, change workspace filter, pull to refresh. | Search, date and workspace choices stay set. Results show matching assigned records. | ☐ Pass ☐ Fail ☐ Blocked |
| 4 | Worker assigned a branch | Open a root, go Back, then open an assigned nested subitem. Repeat for an approved personal project. | The root and exact subitem open from the same list. A sibling never substitutes for a missing node. Back restores the originating list. | ☐ Pass ☐ Fail ☐ Blocked |
| 5 | Independent Reviewer and separate submitter | Open Decisions in Inbox for each identity. Open a permitted pending review as the Reviewer. | The Reviewer opens the corresponding task or assigned package. The submitter's own evidence offers no review action. | ☐ Pass ☐ Fail ☐ Blocked |
| 6 | Recipient of a safe test update | Open an update linked to a project, task or subitem. Return to Inbox. Mark one approved QA update read. | The exact related item opens, and the confirmed read marker and recent unread count update. | ☐ Pass ☐ Fail ☐ Blocked |
| 7 | Worker with second Office context and an unrelated actor | Open the cross-Office link with each identity and switch context if prompted. | Only the authorized actor and workspace can resolve the destination. | ☐ Pass ☐ Fail ☐ Blocked |
| 8 | Each mobile role | Try an unmatched search, pull to refresh with the connection unavailable, reconnect and retry. | Empty and retry states explain the condition. The active filter stays selected and an unavailable source does not hide other loaded sources. | ☐ Pass ☐ Fail ☐ Blocked |
| 9 | Each mobile role | Check dark mode, larger text, reduced motion, keyboard Back, filter dismissal and TalkBack or VoiceOver. | Rows remain readable, state is labeled, and keyboard or sheet dismissal leaves the same screen available. | ☐ Pass ☐ Fail ☐ Blocked |

## Acceptance

M1 personal testing remains open. Review the M2 checklist and record your decision before starting M3. Dedicated account provisioning, native iOS device access and any separate safe fixture or write approval remain open.
