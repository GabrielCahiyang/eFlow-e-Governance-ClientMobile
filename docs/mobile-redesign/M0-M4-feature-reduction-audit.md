# M0–M4 feature-reduction gap assessment

**Decision point before M5.** eFlow Mobile is a companion for assigned work, updates and approvals. It uses eFlow's branding, language and business rules, with compact interaction patterns inspired by monday.com Mobile. Feature selection, screen density and ease of use are the redesign criteria. Integration readiness and personal acceptance are tracked separately.

## Evidence and reachability

The assessment compares the pre-redesign Git base `6d4f19fc1829e9470d8dca2de524a2041b93521d` with the current workspace and signed M4 retest build 10. All 96 paths in the retest source receipt matched the current workspace. The canonical eFlow Web reference was checked at `b8d9fd8a7195b50fe7446b45092c9528586b0778`. [Source receipt](M4-retest-source-identity.json) · [APK and emulator receipt](M4-retest-apk-verification.json).

A feature counts as **removed from the native experience** only when the active shell, internal links, and contextual actions do not open its native UI. A web handoff can remain visible. Files and services may remain in source. **Source-reachable** below means a verified route or action chain in code, conditional on permissions and data where applicable. **Legacy handler** means the resolver can mount it if supplied a matching route, but this audit found no normal active caller. Neither label implies new device verification.

| Phase | What actually shipped | Device evidence boundary |
| --- | --- | --- |
| M0 | Baseline, scope, visual contract and gateway fix. No feature reduction or screen redesign credited. | Android baseline and gateway transport evidence. Fresh protected sign-in remained unverified. |
| M1 | Five role-aware tabs, per-tab stacks, one More list, authorized workspace switching, shared theme, typography and motion. | Restored Head navigation and Profile verified. Member and Accounting device coverage pending. |
| M2 | Attention-first Home, unified assigned work and Inbox, exact work and decision routing. | Restored Head Home, My Work, Inbox and linked root navigation verified. Fixture-based workflows pending. |
| M3 | Workspace project discovery, grouped rows, Board and Agenda, focused branch navigation. | Existing Office project → root → child and Back verified. Deep nesting and authority cases have automated coverage. |
| M4 | Evidence composer and recovery, exact review/history, text conversations, published announcement reader, and concise Office attention. | Restored Head read-only activity, navigation and unavailable states verified. Uploads, review decisions, live messaging and fresh sign-in remain unverified. |

## 1. Native features and screens actually removed

| Before | Current reachability | Phase |
| --- | --- | --- |
| Desktop-style sidebar on wide screens and a broader More menu | Active `NativeWorkspace` mounts the tab and stack navigator. The old sidebar component and derived desktop menu registry remain in source. | M1 |
| Standalone Reviews and separate updates screen | `reviews` and `notifications` normalize to the unified Inbox. Their old screen files are outside the active renderer. Authorized financial review detail is still reachable. | M2 |
| Office project creation/setup and Personal workspace/project creation from project lists | The active Projects list opens existing authorized Office and Personal projects. Old creation sheets and the alternate Personal workspace screen remain in source. Existing Personal task creation is a distinct retained action. | M3 |
| Office project Gantt, analytics/dashboard, milestones, PDF import, settings/sharing, group editing, column controls, saved views and bulk task ordering | Active project work uses Main table, Board and Agenda, plus a compact progress summary. Gantt, settings and import still have explicit web handoff entries. Legacy advanced views resolve to web or are absent from the mounted project screen. Personal access administration is a remaining exception. | M3 |
| Native task scheduling and auto-assignment | The root task's planning action resolves to web. Auto-assignment and date/dependency editors are no longer mounted from the inspector. Branch child creation and staffing remain. | M3 |
| Announcement draft, publish, withdraw and delete controls | More opens a read-only announcement reader with confirmed recipient read state. The native publisher controls are gone. | M4 |
| Office Team invitations and advanced Office account administration | More still opens the Office Team roster and attention screen, but invitation management was removed from that screen. Identity/access uses a web handoff. | M4 |
| Audio/video controls and incoming call prompts in the active workspace | Messages are text-only, and `CallProvider` is no longer mounted. Call source, exports and dependencies remain for consumer review. Help/Live routes do not open a native AI screen. | M4 |

Admin remains unsupported on mobile, a baseline boundary reinforced by the native role gate. Reports, intelligence, performance and advanced identity handlers still exist in the renderer source, but the active resolver sends those routes to web or denies them before mounting the native UI. Those handlers are retirement candidates, rather than evidence of a visible desktop screen.

## 2. Features simplified

- **Home and My Work.** Urgency groups and scoped assignments replaced broad dashboard presentation. My Work combines Office and Personal roots and subitems in a searchable list with a single filter sheet.
- **Projects.** One workspace-scoped searchable list serves Office and Personal contexts. Favorites and recents use local preferences. The project body reuses compact grouped tasks for Main table, Board and Agenda.
- **Task and subitem inspection.** Exact IDs and native Back preserve context. Branches open one level at a time and keep permitted actions in context. A root task still carries too much visible secondary structure.
- **Inbox.** Assigned decisions and updates live together with unread and decision filters. Review history opens at the exact submission where known. Status and author remain visible.
- **Evidence and text communication.** Existing submission and review contracts have a native composer and recovery states. Project conversations filter existing authorized task threads. Activity and text threads retain their originating navigation.
- **Account and Office context.** More replaced desktop group duplication. Profile, security, appearance and Office attention have a place in the native shell, with remaining overlaps listed below.

## 3. Essential features to keep

Keep the five role-aware tabs and authorized workspace context. Keep assigned work, existing project discovery, exact root/subitem drill-down, task progress and completion, permitted task/branch staffing and child creation, camera/file evidence, review and return-for-changes, immutable history and useful Inbox updates. Keep lightweight work comments and authorized task, Office and direct text conversations. Keep personal profile, security and accessibility settings.

In finance, keep brief relevant amounts and provenance, assigned cash requests and releases, receipts, acknowledgments, liquidation and assigned independent reviews. Keep settlement or approval only as an existing record action when necessary for a retained workflow and authorized by the current server capability. Preserve Head approval, Accounting execution and independent review as separate responsibilities. Contextual navigation never grants authority.

## 4. Unnecessary web features still reachable

| Priority | Active entry and evidence | Reduction proposed |
| --- | --- | --- |
| **M5 — Accounting workspace** | Accounting Staff → Accounting → `accounting_overview` → `OfficeBudgetScreen` → local tab state. The 11-item staff strip exposes Annual budget, General Journal, Financial Audit Trail, Account mapping, Expenses and other wide views. It also exposes budget CSV/PDF exports when data is available. Native journal authoring depends on its guard. Annual editing depends on appointed Head authority when that actor reaches this screen. Named journal/audit handoffs and advanced `initialView` filtering do not intercept taps on the local strip. | Replace the native surface and its view dispatch. Remove advanced panels, tabs, empty-state creation CTAs and exports. Preserve narrowly scoped receipt and decision detail. |
| **M5 — Project and task funding setup** | Projects → Project options → Funding opens `ProjectFundingCloseout`, with release, request and allocation/approval actions when granted. Task → Budget opens `TaskFundingCard`, which can mount `ProjectTaskAccounts`, direct budget authorization, subitem funding-cap editing and a separate Office petty-cash sheet. The petty-cash surface has replenishment UI when authorized. | Retain brief summaries and operational cash actions. Move fund setup, allocation/authorization administration, caps and replenishment to web. Keep assigned cash releases distinct from project funding release administration. |
| **M6 — Personal access and closeout** | Existing Personal project → Members & access terms opens `ProjectAccess` and, for the eligible owner, `PersonalMembers`. It can show grants and membership mutation controls. The Tasks view also offers project completion/archive and project-wide history remains a separate tab. | Keep Personal work, its independent reviews and read-only people/history context. Move advanced membership, sharing and project-wide closeout/archive controls to web. |
| **M6 — Office project people and file management** | Office project → Project options → Project people can open a selection/removal workflow for an authorized Office Head. Project, Personal and Task file surfaces share `ProjectFiles` and can expose upload, task link/unlink and removal. | Keep selected people and evidence readable, and retain essential task/branch staffing and evidence composition. Move project-wide grants, bulk staffing and file management controls to web. |
| **M6 — Desktop-flavored task editing** | Task actions → Edit task can show title, description, priority, estimated hours, comma-separated tags, definition of done and multiline acceptance criteria. Branch actions include move, reorder and delete when permitted. | Keep current work actions first. Retain core read details and scoped staffing/child creation. Move advanced planning edits and structural/destructive management to web after checking consumers. |
| **M6 — Secondary navigation** | More still has separate Profile, Settings and Appearance, with email notifications in Profile and Settings. Office Team remains a first-class secondary row and Project options exposes three separate advanced web links. | Consolidate account settings, keep one contextual web entry when useful, and keep Home's compact Office attention. Move detailed Office roster/access out of default mobile navigation. Retain Announcements as optional read-only secondary context. |

The original M4 Android run verified navigation into Task and Project options. The advanced Accounting chain above is source-reachable for the permitted role. The restored Head session did not verify an Accounting Staff screen or its controls. The `tasks` Head list and `deadlines` WorkTools remain native legacy handlers. Audit their callers and remap any supported old link to Projects or My Work before retiring the UI. No live entry from the audited tab bar, More or notification resolver was found for those two handlers.

## 5. UI/UX improvements already implemented

- Stable tab selection, native Back and visible Office/Personal context. The tab layouts distinguish permanent roles. Contextual Task Lead and Subitem Lead remain appointments.
- eFlow mark, Figtree typography, semantic status chips, light/dark palettes and shared motion/reduced-motion handling.
- Virtualized Projects, Main table, My Work and Inbox lists. Search, status grouping and native filter/action sheets make common paths shorter.
- Full-width branch drill-down and readable path labels instead of increasing indentation. Evidence and activity keep the exact record and authorship.
- Explicit unavailable, error and retry states that can be read independently of the underlying integration outcome.

Existing Android captures show the [grouped project](../../artifacts/M3/emulator-project-main.png), [branch inspector](../../artifacts/M3/emulator-branch.png), [Office attention at 150% in dark mode](../../artifacts/M4-retest/office-attention-dark-large-text.png) and [return to Task Activity](../../artifacts/M4-retest/task-activity-back.png). These support the reported Head paths. They do not establish physical Android, iOS, screen-reader or role-wide acceptance.

## 6. Screens that still feel oversized

- **Accounting** remains the largest desktop carryover. A fiscal-year selector, 11 local tabs, nested cards, stacked filters and a broad budget bundle dominate the entry screen. The annual-summary gate also wraps work queues that should have their own availability.
- **Root Task Inspector** repeats its title/context and shows a large overview card before a six-tab strip. The strip clips horizontally on the captured phone. A smaller summary, direct child-work section and one current primary action should dominate. Evidence, activity, funding and files should open from compact contextual rows. [Current Android root](../../artifacts/M3/emulator-root-task.png).
- **Personal Project, people, and file views** still use card stacks, deep administration sheets and long access labels. Apply compact people/file rows and make the inspector a focused destination.
- **Task Activity, Office roster and text threads** render repeated full cards. Chat opens a long scrolling history with its composer below the records. Use compact rows, visible input and manageable history without expanding functionality.
- **Home, Projects and Inbox** have already changed substantially. The remaining issue is hierarchy and density. Reduce duplicate headers, competing summary or empty panels and redundant filter controls. Preserve accessible tap targets, wrapped large text and exact back behavior.

## 7. Scope drift introduced or carried forward during M1–M4

- M3's reduced Project options made the old Project funding closeout and Project people editor readily reachable. Those capabilities predate M3, but their placement carries desktop administration into the new project flow. M3 also placed the existing full root task editor under Task actions.
- M4 introduced a Head Office attention panel in both Home and Office Team, and task/project conversation launchers alongside More Messages. The intent is within scope. The extra surface area is a reason to consolidate presentation, while retaining the existing authorized contextual text routes.
- M4's extra Announcements and Office Team availability work added defensive handling and tests, rather than new hosted features. Treat successful live service access as a recorded integration dependency. Further infrastructure work is outside this redesign.
- The new evidence and review work supports the approved core workflow. It should stay focused on capture, resume, inspect and decide. Project-wide chat rooms, chat attachments, AI Live and calls are intentionally outside this mobile scope.
- The unchanged finance workspace, Personal access editors and duplicate account controls are carryover debt. Their presence is a gap even though they were not introduced during M1–M4.

**M4 implementation is complete for its retained scope and QA is pending.** Announcements RLS, Office Team and login gateway, finance prerequisites and fixture-dependent live workflows belong in the integration record. They do not block completion of the redesign implementation or change any past test result. M4 is unaccepted. [M4 QA results](M4-personal-qa.md) · [Separate integration record](M4-backend-proposal.md) · [Revised phase plan](implementation-plan.md).
