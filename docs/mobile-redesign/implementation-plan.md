# Implementation sequence and dependency plan

Feature reduction and mobile usability drive the remaining work. Keep the existing server rules and role boundaries for the workflows that remain. UI implementation, live integration verification and personal acceptance each have their own status.

M4 is implementation-complete for its retained scope, with QA pending and acceptance outstanding. M5 was authorized and the focused Accounting UI is implemented. M6 was authorized and the mobile feature reduction is implemented. M7 was authorized and its QA package is ready for review. See the phase QA packages for actual scope and verification. Each subsequent phase ends with a personal QA package and stops for explicit acceptance.

[Current reachability and before/after baseline](M0-M4-feature-reduction-audit.md) · [Current verification and acceptance status](phase-progress.md) · [Separate M4 integration record](M4-backend-proposal.md)

## M0–M4 implementation sequence

| Phase | Concrete implementation | Regression/evidence focus | Exit and personal exercise |
| --- | --- | --- | --- |
| M0 | Contract, all routes/views, source comparison, visual/component plan, baseline and QA package | Existing checks/tests/native JS exports, credential audit, Android build attempt | Review baseline and approve scope; stop |
| M1 | Native scope registry/resolver, five role-aware tabs/stacks, compact More, workspace selection, shared tokens/controls/themes/motion/accessibility | Tab origin/back, Head/Member/Accounting defaults, Admin denial, stale context, legacy unavailable routes | Install/launch/sign in, all tabs, More, project/back, switch authorized context; stop |
| M2 | Attention-first Home, compact unified assigned root/node rows, date/search/filter, unified Inbox and exact record links | Office/personal root/node identity, unread/mark-read, no duplicate reviews, refresh context | Search/filter/open exact work/review/update, refresh and failure states; stop |
| M3 | Project rows/favorites/search, grouped tasks/progress/agenda/status board, focused task/branch inspectors and permitted leadership actions | Deep nesting eight, sibling/ancestor denial, direct completion versus eligible review, descendants/history, capability refresh | Existing project → root → child/back; permitted work and branch action in safe fixture; stop |
| M4 | Evidence selection/camera/upload/recovery, review/return reasons, activity/comments/messages/announcements/Head team attention | No self-review, ancestor fallback, root authority, immutable evidence, denied files, separate actors and message outcomes | Submit safe evidence, independent eligible review, worker sees result, permitted message/read; stop |

## M5 — Simplify Accounting and financial navigation

| Before | Proposed native result |
| --- | --- |
| Accounting Staff → Accounting opens the eleven-view Office Budget strip | Keep the Accounting tab. Open a compact summary with assigned releases and reviews. Keep exact receipt, acknowledgment, liquidation and review detail reachable from existing authorized records and Inbox links. |
| Annual budget editing and setup CTAs, Account mapping, General Journal, Financial Audit Trail, broad Expenses, budget and journal exports | Remove those native tabs, screens, empty-state actions and export buttons. Resolve any supported legacy link to its validated web destination or a clear unavailable state. Preserve relevant read-only totals, fiscal scope, provenance and receipt history. |
| Project options → Funding exposes project fund setup, release administration and allocation decisions | Replace it with a read-only summary where relevant. Move project-level allocation, authorization and release administration to web. Keep execution of an already assigned cash release in Accounting. |
| Task Inspector → Budget or an exact financial Inbox link can open accounts, budget authorization, cap editing and Office petty-cash management | Keep an exact task/subitem Funding view for authorized cash requests, their status, receipts, liquidation and relevant amounts. Remove account setup, direct budget authorization, cap editing, Office-wide petty-cash and replenishment controls from that view. |
| Annual summary loading or failure can cover operational queues | Give each retained queue its own loading, empty, unavailable and retry state. Use the existing authorized reads and commands. |

Apply the retained-view allowlist to the Accounting tab, every legacy finance alias, exact Inbox links and local view transitions. Test that an old route or embedded panel cannot mount a removed screen. Keep Head approval, Accounting execution and independent review distinct. Preserve receipt identity, historical read access and existing reconciliation behavior. Keep confirmed records visible if a refresh fails. An unresolved write stays unresolved until the existing authoritative path can reconcile it. A missing finance prerequisite affects only its workflow.

## M6 — Complete feature reduction and UI/UX cleanup

| Before | Proposed native result |
| --- | --- |
| Home, My Work and Inbox have uneven density, headers and filters | Give each one compact header, grouped rows, one consistent filter entry and direct access to the highest-priority assigned work. Keep exact Inbox targets and tab origin. |
| Projects, Personal projects and task detail still mix work with desktop controls | Keep compact project rows, scoped work groups, Board and Agenda. Put immediate subitems and the current work action near the top of the inspector. Open Activity, Evidence, Funding and Files from contextual rows. Keep authorized branch staffing and child creation. |
| Personal project access and archive/closeout, project-level people editing and generic file management remain in active flows | Move advanced membership, sharing, closeout/archive, project-level staffing administration and generic file upload/link/remove to validated web handoffs. Keep relevant people, history and evidence readable, and keep the task evidence composer native. |
| Root task editor and branch menus expose detailed planning and structural management | Keep concise task details and scoped execution actions. Move advanced estimation, tags and criteria authoring, and advanced branch move/reorder/delete controls to web after verifying their workflow dependencies and handoff targets. |
| More duplicates account settings and gives the detailed Office roster a top-level secondary entry | Consolidate personal settings and appearance, keep Home's concise Office attention, and move detailed roster/access to a contextual authorized web entry. Keep optional read-only Announcements and existing authorized text threads. |
| Task Activity and conversations use long card stacks; the composer sits below the history | Use compact chronological rows, clear authorship and a reachable keyboard-safe text composer. Keep existing task/project-context and direct text behavior. Project-wide rooms, chat attachments, calls and AI Live remain outside scope. |
| Legacy route handlers and unused desktop presentation remain in source | Check route literals, deep links, notification targets, screen imports, feature barrels and both native provider graphs. Remap supported legacy work links, then retire proven-unused native presentation. Keep shared services and record access. |

Reuse eFlow colors, Figtree typography, terminology, semantic status treatments and reduced-motion behavior across these screens and the M5 Accounting entry. Use compact rows, native contextual sheets, wrapped large text and accessible targets. Regression coverage must exercise normal navigation, older routes, notifications, exact record context and back behavior. The removal inventory will separately identify native UI removed, web handoffs retained and source presentation retired.

## M7 — Verify the streamlined application

Exercise the retained app on Android with Head, Member and Accounting Staff accounts where available. Check login and Admin exclusion, role tabs, authorized Office/Personal switching, Home/My Work, exact task/subitem navigation and Back, Inbox, compact Accounting, Profile and secondary navigation. Verify authorized review routes, actor and Office boundaries, evidence and text behavior with dedicated fixtures. Track fixture-dependent and unavailable hosted flows as BLOCKED, and report actual execution per actor and scenario. Preserve the agreed feature set, with any fixes limited to findings in retained behavior.

Verify light and dark themes, font scaling, TalkBack, reduced motion, keyboard, orientation and interruption/recovery on native Android. Record emulator and physical device evidence separately. Run the equivalent iOS build and native checks when Mac/Xcode and a device or simulator are available, with separate results. A JavaScript export is bundle evidence. Personal device acceptance is recorded independently.

## Required phase packages

Each phase delivers a before/after feature inventory naming every screen, navigation entry and contextual action removed or simplified. Record VERIFIED, FAILED, BLOCKED or NOT TESTED per scenario. Mark source/automated evidence, emulator verification and personal device acceptance separately. Keep the exact dependency and affected workflow in the integration record.

| Phase | Actual Android emulator screenshots | APK and personal checklist |
| --- | --- | --- |
| M5 | Compact Accounting entry, assigned queue and exact task Funding or receipt detail. Label any unavailable state or non-live fixture used for presentation evidence. | Standalone M5 APK when supported. Head, Member and Accounting Staff checklist focused on entry points, exact record access and the removal of setup and authoring controls. |
| M6 | Home, My Work, Projects, root and subitem inspector, Inbox, Accounting and More. Include representative dark/large-text and keyboard states. | Standalone M6 APK when supported. Short checklist for navigation, density, contextual actions, accessibility and web handoffs. |
| M7 | Final retained routes across verified roles, key accessibility states, and relevant unavailable states. The inventory records any acceptance fixes or explicitly records zero scope changes. | Standalone M7 APK when supported. Final personal device walkthrough for navigation, visual quality, authority boundaries and retained workflows. |

Run `npm run check`, `npm test`, both native JS exports and the release credential audit for each implementation phase. Record build, signature, install and launch evidence for the APK. If the environment or approved role access prevents a capture or build, state what was attempted and record the corresponding blocker. Use prior captures only as labeled baseline evidence.

## Dependency ownership and removal rules

| Current source cluster | Retained dependency | Adaptation/removal boundary |
| --- | --- | --- |
| app-shell, navigation, shared/routes | Auth, workspace selection, native stack, theme/motion | Native scope/route ownership; no filtering by editing generated sourceNavigation |
| personal-work services/selectors/workDestination | Authorized aggregate feed, root/node IDs, Office/personal distinction | Replace card/selectors presentation; align confirmed work refresh event in M2; preserve unknown recovery |
| ProjectsScreen/ProjectScreen/ProjectTaskViews | Project reads, favorites/preferences, task-group/status selectors, subscriptions | Compact rows and read context; isolate Gantt/calendar editor, setup/import/publication/configuration UI |
| TaskDetails/WorkTree/WorkEditor/Execution/Review/Completion | Server WorkTreeSnapshot/capabilities/revision, existing command semantics, draftStore, files | Drill-down and contextual actions; no client role-derived grants or forced review transitions |
| ActionInbox/InboxScreen/ReviewsScreen | Assigned decisions, notifications/mark read, independent reviews, task selectors | One action list; preserve service callers while removing duplicate queue presentation |
| budget/useBudget and funding/cash/review components | Financial scope, amounts, receipt records, liquidation/review services, signed evidence URLs | Replace monolithic OfficeBudgetScreen; retain only focused commands. Annual/Journal/Mapping/Audit/Export UI removed after imports checked |
| communication/CallProvider/help | Authorized text threads and messages | Keep calls, Live and chat attachments outside mobile scope. Check remaining consumers before pruning providers or platform dependencies |
| team-management/office-team/settings/profile | Office identity/appointments, relevant people, personal settings/security | Team analytics/coaching and advanced access management are web-only; preserve scope utilities needed by retained reads |
| platform/files/authStorage/draftStore/push/gateway | Native I/O, secure persistence, actor-scoped recovery, push entry | Keep adapter boundaries; no privileged keys, arbitrary web URLs or endpoint fallback bypass |
| core/web and generators | Canonical service/type/selector contracts | Do not regenerate during M0. Future sync must use validated canonical checkout and review native adaptations/diff |

M6 deletion proof: search imports, feature barrels, literal routes, notification targets, test mocks, platform providers and generated core consumers before deleting presentation. Run applicable checks immediately after removals. Dependency pruning requires both Android and iOS build review; package presence alone is not proof it is unused.

## Native capability and context contract (planned)

Keep native feature selection as a registry of destination IDs, eligible mobile roles, native implementation/handoff disposition and parent tab. Route normalization is separate from server capabilities. Dedicated server reads/capability snapshots determine which record actions render. Mutations recheck current actor/context/revision through existing checked services; missing capability is denied, never synthesized from the permanent role.

Keys for query/draft/route state include actor and appropriate workspace/Office/project/root/node identity. Switching accounts clears prior actor state. Switching workspaces resolves or denies the pending exact destination and discards stale stack data. Refresh keeps usable data visible while updating authority; no consequential action uses stale capability snapshots.

Uncertain financial commands keep durable started/uncertain/saved receipts and operation terms; use existing idempotency keys/contracts where available. A successful write followed by refresh failure is reported as recorded plus refresh failure, never retried as a new transaction. Unknown response remains unresolved until authoritative reconciliation.

## Authorization and integration boundaries

- The user authorized M5 after reviewing the M0–M4 assessment. The user then authorized M6 and M7. Final personal acceptance and any release authorization remain separate.
- Announcements policy recursion, protected gateway availability, installed finance/NW11 capabilities and unavailable accounts or fixtures affect their own live tests. They do not gate the UI implementation. Keep the dependency and owner action in the relevant QA or integration record.
- Use approved accounts and safe fixtures for authenticated writes. Exact actor, role, Office and appointment belong in the test result. Record blocked scenarios when their prerequisites are missing.
- Hosted Supabase, migrations, finance rules, RLS, gateway infrastructure and existing records remain outside the implementation scope. Use existing authorized contracts. Publication and production fixture creation require separate authorization.
