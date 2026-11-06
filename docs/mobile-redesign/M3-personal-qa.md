# M3 personal QA — Projects and work inspectors

M3 was explicitly authorized by “proceed to m3”. M1 and M2 personal QA remain pending. M3 covers finding an authorized project, reading its progress and opening a specific task or branch.

## Changes

| Before | M3 |
| --- | --- |
| Large project cards and separate Office and Personal lists | One workspace-scoped Projects list with compact rows, search, status, local Favorites and Recently opened. Office and Personal shortcuts retain their own destination. |
| Desktop-style table, view tools and project management controls | Project progress plus compact grouped task rows, a vertical status board and due-date agenda. Files, people, participating Offices and existing funding access are available from Project options. Advanced planning, group editing, settings and PDF import go through the eFlow Web handoff. |
| Multiple nested cards with indentation | Root task inspector with progress, responsibility and activity, then one branch level per screen. Subitem inspector shows its path, current details, children and permitted actions. System Back returns to its parent screen in the originating tab. |
| Nested work and completion actions interleaved with every branch row | Choose people, add child and related actions appear for the current branch only when the latest snapshot grants them. New writes refresh capabilities before submitting. Office work uses the existing status-update and direct-completion paths. Personal subitems use the existing independent-review command when the server permits it. |

The progress summary uses completed tasks out of non-cancelled tasks in the visible project scope. The Office subitem activity view shows recent authorized updates and recorded completion details. The existing root evidence, review, files, funding and activity sections remain reachable. The broader evidence and finance redesigns belong to M4 and M5.

| Area | Files |
| --- | --- |
| Projects | `ProjectsScreen.tsx`, `ProjectScreen.tsx`, new `mobileProjects.ts` and selector regressions |
| Task and branch | `TaskDetailsScreen.tsx`, `LinkedWorkNodeScreen.tsx`, `WorkTreePanel.tsx`, new `branchInspector.ts`, `OfficeSubitemUpdateSheet.tsx`, `OfficeSubitemActivity.tsx`, and branch and update regressions |
| Authorized commands | `TaskExecutionSheet.tsx`, `TaskEditSheet.tsx`, `SubtaskCompletionSheet.tsx`, `WorkEditorSheet.tsx` |
| Personal project | `PersonalProjectScreen.tsx`, `PersonalNestedWork.tsx` |
| Routes and packaging | `MobileContent.tsx`, `mobileScope.ts`, `webHandoff.ts`, `app.json` |

The Office setup wizard, desktop table controls, task auto-assignment and native planning are out of these mobile entry points. Their source and backend operations remain available for other consumers. Base commit `6d4f19fc1829e9470d8dca2de524a2041b93521d`. The authoritative web remote was checked at `b8d9fd8a7195b50fe7446b45092c9528586b0778` and its pinned work-tree and task/subitem lifecycle contracts were compared. The generated core was reused.

## Build and verification

| Check | Result |
| --- | --- |
| `npm run check` | Passed TypeScript and nine Metro exclusion checks. |
| `npm test` | 144 tests in 50 suites passed. Regressions cover eight-level routes, sibling and ancestor authority, freshness, Office direct completion versus Personal review, and a stale Office update. |
| `npm run build:android` and `npm run build:ios` | Both Hermes JavaScript exports passed. |
| Source identity | `3ece9a38ab6b72eee6c1a21b5dc57470f4127ebfabad5cc0ddc166fa9b4ca681`. [Source and export hashes](M3-source-identity.json). |
| Android release assembly | Passed. Standalone, non-debuggable 1.0.0 (code 8), `arm64-v8a` and `x86_64`. The embedded source and signature were verified. [APK receipt](M3-apk-verification.json). |
| Release credential audit | Passed for both exports and the embedded APK bundle. [Credential audit](M3-release-audit.json). |
| Native iOS compilation and workflows | BLOCKED. Xcode and a simulator or device are unavailable on this Windows host. |

[eFlow-Mobile-M3-QA-arm64-x86_64.apk](../../artifacts/M3/eFlow-Mobile-M3-QA-arm64-x86_64.apk) is the signed Android QA artifact. SHA-256 `a8327f0435561837a63f8e860d0ec532c4df6f4c009c1705b48feee912f3d889`. The signing certificate SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

Install the phase APK on an ARM64 phone or x86_64 emulator with USB debugging enabled.

```powershell
adb -s <serial> install -r artifacts/M3/eFlow-Mobile-M3-QA-arm64-x86_64.apk
adb -s <serial> reverse tcp:8322 tcp:8322
```

The APK embeds the app and launches without Metro. A fresh QA sign-in requires the protected local gateway running on this PC and ADB forwarding. See the [gateway setup](M0-login-fix-qa.md). The public sign-in tunnel has a known DNS problem. The QA signing certificate can update the prior QA build signed by the same certificate.

The read-only hosted function catalog on `ixnfphgjyelhckjwjkdv` lists `r7_work_tree`, `r7_work_command`, `nw_work_command`, `nw_work_impact`, `save_subtask_work_update`, `save_subtask_progress`, `complete_subitem` and `transition_task_status` as installed and executable by the authenticated database role. Per-record authorization still comes from the server. No hosted write was performed for M3 QA.

## Android emulator evidence

The APK installed and cold launched as version code 8 on `emulator-5556`, Android 16 API 36. Profile confirmed the restored session `bplo.head@gmail.com`, permanent role `head`, LEDIPO. [Actor profile](../../artifacts/M3/emulator-profile.png).

| Scenario | Result |
| --- | --- |
| Projects and input | VERIFIED. LEDIPO showed Customer Service Seminar. An unmatched search showed the empty state and Android Back dismissed the keyboard. [Projects](../../artifacts/M3/emulator-projects.png) · [Search](../../artifacts/M3/emulator-project-search.png). |
| Local preferences | VERIFIED. The star moved the project to Favorites. Opening it and removing the star put it under Recently opened. The recent row persisted after cold launch. [Favorites](../../artifacts/M3/emulator-back-favorites.png) · [Recent](../../artifacts/M3/emulator-recent.png). |
| Project views | VERIFIED. Main table showed two tasks in the project group and zero of two completed. Board grouped the same two tasks as In progress. Agenda separated the two due dates. [Main table](../../artifacts/M3/emulator-project-main.png) · [Board](../../artifacts/M3/emulator-project-board.png) · [Agenda](../../artifacts/M3/emulator-back-agenda.png). |
| Exact child and Back | VERIFIED. Customer Service Seminar → Venue Reservation → Subtasks → Book Venue opened the completed level-one subitem. The Branch actions sheet opened and dismissed. Activity displayed the existing completion date and author. System Back returned to the root’s Subtasks, then the selected Agenda and Projects. [Root](../../artifacts/M3/emulator-root-task.png) · [Branch](../../artifacts/M3/emulator-branch.png) · [Activity](../../artifacts/M3/emulator-branch-history.png). |
| Personal context | VERIFIED. Test1 Projects showed its Personal context and no matching projects. A populated Personal root or branch was unavailable. [Personal list](../../artifacts/M3/emulator-personal-projects.png). |
| Display | VERIFIED for Projects in dark mode at 150% text with Android animator duration disabled. The device settings were restored. Screen-reader operation remains untested. [Display](../../artifacts/M3/emulator-projects-dark-large-text.png). |
| Role, permission and write scenarios | BLOCKED on dedicated Member, Accounting Staff, worker, Lead, Reviewer and second Office actors or approved fixtures. Eight-level drill-down, denied sibling/ancestor and stale capability behavior were exercised in automated tests. Real work updates, completion, staffing, review and cross-Office rejection were not executed. |
| Fresh sign-in and other devices | Fresh sign-in BLOCKED on the public gateway DNS issue and unavailable test accounts. Physical ARM64 installation and native iOS workflows remain untested. |

## Role accounts and safe fixture setup

| Account to use | Context |
| --- | --- |
| `bplo.head@gmail.com` | Existing provided LEDIPO Head. Use the restored session for read-only navigation, search, views and history. Favorites only change local preferences. |
| Dedicated Member worker | Member of the QA Office with an assigned root and a separate assigned Office subitem that has no unresolved prerequisite. |
| Dedicated Task Lead and Subitem Lead | Permanent Member or Head, with distinct appointments on the QA root and on a branch. Include a sibling outside the Subitem Lead’s authority and a separate authorized contributor. |
| Dedicated Reviewer and Responsible Office Head | Distinct from submitter and workers. Include an eligible Personal ancestor or owner and a separate Responsible Office Head for root review. |
| Dedicated Accounting Staff | Accounting Staff with access to the QA project. Test authorized project navigation and read-only states. |
| Second Office actor and unrelated Member | One authorized through project participation in a second Office and one without access. Confirm the Office and role for each. |

Provisioning remains deferred. Use approved existing fixtures for any write. The branch fixture needs eight levels, a sibling, completed history, and a descendant with work pending. Use a separate Personal branch for independent review. For each test record the account, server-confirmed role, Office, and contextual appointment. Keep passwords out of the QA log.

## Personal checklist

| # | Actor | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| 1 | Head, Member, Accounting Staff | Launch the APK, open Projects, search for an authorized title, try an unmatched title and switch the status filter. | Only projects in the selected workspace and matching status appear. Empty results explain what to change. | ☐ Pass ☐ Fail ☐ Blocked |
| 2 | Head or Member | Favorite a project, open it, go Back, remove its star and relaunch. | One row appears under Favorites or Recently opened as appropriate. Preferences persist in the same actor and workspace context. | ☐ Pass ☐ Fail ☐ Blocked |
| 3 | Head, Member, Accounting Staff | Open an authorized Office project. Check progress, Main table, Board and Agenda. Open a root task, then Back. | Rows are grouped by project group, status or due date. The chosen root shows its own status, due date, priority, responsibility, progress and activity. Back restores the chosen project view and tab. | ☐ Pass ☐ Fail ☐ Blocked |
| 4 | Assigned Member or Subitem Lead | From a root open Subtasks. Drill down one child at a time to level eight. Back up two levels. Repeat with a Personal branch. | The breadcrumb and each node match the selected branch. Child rows remain full width. Back restores the exact parents. | ☐ Pass ☐ Fail ☐ Blocked |
| 5 | Assigned Member and approved Office Subitem Lead | On the safe root, start or update assigned work. On an assigned child, save an Office work update and inspect its activity. On the eligible child, mark it complete. | Update preserves the recorded author and progress history. Completion records on the exact Office child and leaves parent final review in place. Pending descendants and prerequisites are enforced. | ☐ Pass ☐ Fail ☐ Blocked |
| 6 | Subitem Lead and separate Task Lead | On the permitted fixture, use Branch actions to add a child or choose an eligible contributor. Open a sibling and ancestor. | Permitted change lands in the intended branch. Sibling, ancestor, Office-level management and a ninth level are unavailable or rejected by the authoritative server. | ☐ Pass ☐ Fail ☐ Blocked |
| 7 | Personal worker, independent reviewer, Responsible Office Head | Submit an eligible Personal child. Inspect it as its worker and as the eligible reviewer. Inspect an approved Office root pending final review. | Personal review uses the eligible independent actor. Own evidence offers no review action. The Office root retains the existing Responsible Office Head rule. | ☐ Pass ☐ Fail ☐ Blocked |
| 8 | Authorized second Office actor and unrelated Member | Open an exact branch link from Inbox or My Work, switch to its authorized workspace if prompted, then Back. Open the same link as the unrelated actor. | Only the authorized workspace and actor can open the record. The originating tab and target are preserved. Denied or missing records never substitute a sibling. | ☐ Pass ☐ Fail ☐ Blocked |
| 9 | Subitem Lead and second authorized actor | Open a branch editor. Use the approved fixture to change that branch in the second session before saving. Reopen and inspect completed history. | The stale write stops before submission. Completed history and attribution are intact. | ☐ Pass ☐ Fail ☐ Blocked |
| 10 | Each mobile role | Check light and dark themes, larger text, reduced motion, search keyboard, hardware Back and screen reader labels on Android and iOS. | Rows and actions stay readable, keyboard Back restores the list, and state is announced. | ☐ Pass ☐ Fail ☐ Blocked |

## Personal decision

Review the checklist and record M3 acceptance when ready. Separate approved accounts, safe writable fixtures, a validated web origin for the web handoff, and a Mac/Xcode device run remain open.
