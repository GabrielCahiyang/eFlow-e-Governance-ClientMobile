# Route inventory and migration contract

Inspected `src/app/shared/routes.ts` (40 route names), `NativeWorkspace.tsx`, `nativeNavigation.ts`, `sourceNavigation.ts`, bottom navigation, entry links, Inbox and work destinations. All mappings are **planned**, not changed in M0. A TypeScript route name is not proof that it renders.

## Shell before and after

| Actor | Current default and phone navigation | Proposed v1, left to right; default |
| --- | --- | --- |
| Head | overview; My Work / Workspaces / Inbox / permission-filtered Accounting / More | Home / My Work / Inbox / Projects / More; Home |
| Member | personal_work; My Work / Workspaces / Inbox / permission-filtered Accounting / More | Home / My Work / Inbox / Projects / More; Home |
| Accounting Staff | accounting_overview; My Work / Workspaces / Inbox / permitted Accounting / More | My Work / Inbox / Accounting / Projects / More; My Work |
| Admin/unsupported | Session rejected before operational workspace | Same rejection; web-only explanation |

Current More duplicates desktop groups; >=1024 layout adds a desktop-style sidebar instead of bottom navigation. Proposed More contains Messages, Announcements, applicable Office Team, Profile, Settings, optionally supported Help, plus sign out. From M5, an authorized Head can also open the focused Office Budget summary here; it never opens annual setup. Workspace switching is a compact header control. Tablet adaptation keeps the same five destination meanings; no second desktop menu.

Use installed React Navigation native stacks, not an Expo Router migration. Plan one stack per destination with explicit `originTab` and record context. Tab changes select that destination rather than pushing another generic Workspace route. More is a real destination; its child sheets close back to More. Server-denied data yields an explicit useful access state, not a blank screen or inferred authority.

## Exhaustive legacy route migration

“Web” means the validated policy below. “Explanation” is a titled unavailable page with back/supported destination and optional validated web action.

| Existing route | Actual current handler/constraint | Planned target |
| --- | --- | --- |
| overview | OverviewScreen | Home for Head/Member; Accounting legacy link → permitted Accounting summary |
| personal_work | PersonalWorkFeedScreen | My Work |
| projects | ProjectsScreen or PersonalWorkspaceScreen | Projects in authorized context |
| project | ProjectScreen, id/projects permission | Projects → Project; preserve id/supported view |
| personal_project | PersonalProjectScreen; shell omits nodeId | Origin → personal project/root/node inspector; retain nodeId end to end |
| task | TaskDetailsScreen; id/tasks permission | Origin → exact root/subitem; preserve projectId/nodeId |
| tasks | Head TasksScreen; others work feed | Head Office-task intent → Projects filtered work; assigned intent → My Work |
| subtasks | work feed Subtasks filter | My Work subitem filter |
| reviews | ReviewsScreen | Inbox → assigned review record |
| budget | OfficeBudgetScreen | Head More → Office Budget summary, or contextual Funding retaining origin; advanced views → Web |
| financial_reviews | FinancialReviewsScreen | Inbox → exact assigned review, or Accounting child retaining origin |
| accounting_overview | OfficeBudgetScreen overview | Accounting summary/assigned queues |
| accounting_releases | OfficeBudgetScreen requests | Accounting → request/release record |
| accounting_journal | OfficeBudgetScreen journal | Web journal explanation/handoff |
| accounting_audit | OfficeBudgetScreen audit | Web audit; contextual transaction provenance stays native |
| accounting_budgets | OfficeBudgetScreen annual | Authorized summary if no edit intent; annual editing → Web |
| team | TeamScreen supervision, labeled Analytics by nativeDestinations | More → Office Team summary; analytics intent → Web |
| office_team | OfficeTeamScreen, includes member/access operations | More → Office Team context; management → Web |
| identity | Head IdentityScreen | Head Office identity/access → Web; no Admin operations |
| intelligence | TeamScreen intelligence | Web |
| reports | ReportsScreen | Web; exact linked tasks still open natively |
| deadlines | WorkToolsScreen deadlines | My Work agenda/date filter |
| history | work feed History | My Work Completed/history inspection |
| performance | TeamScreen performance | Web |
| announcements | AnnouncementsScreen | More → Announcements reading |
| inbox | ActionInbox | Inbox |
| notifications | ActionInbox alias | Inbox Updates filter/notification target |
| messages | ChatScreen with CallProvider | More → Messages/thread; calls/video → deferred explanation/web |
| profile | ProfileScreen | More → Profile |
| settings | SettingsScreen | More → Settings |
| users | Explicit native denial | Admin web-only explanation |
| org_tree | Explicit native denial | Admin web-only explanation |
| permissions | Explicit native denial | Admin web-only explanation |
| audit | Explicit native denial; distinct from accounting_audit | Admin web-only explanation |
| administration | Explicit native denial | Admin web-only explanation |
| migration | Explicit native denial | Admin web-only explanation |
| help | HelpScreen | Optional supported lightweight More → Help; otherwise explanation |
| live | Passes native gate but no implemented-set/render handler | Deferred explanation/web if supported; never blank |
| invitation | AppRoot entry-link screen; not Workspace renderer | Secure recipient entry; advanced management → Web |
| activation | AppRoot entry-link screen; not Workspace renderer | Secure activation/recovery entry |

## Embedded views/actions (not separate route names)

| Parent / existing view or action | Planned replacement |
| --- | --- |
| project tasks / board / calendar / dashboard | Compact list / optional status grouping / agenda / brief progress |
| project analytics / gantt / milestones | Web; relevant dates stay in native task context |
| project offices / People / files | Relevant Office/team context / permitted people / authorized attachments |
| project sharing / settings / import / funding configuration | Web; native task Funding stays focused |
| Publication/governance/activation; ProjectReadinessSheet/ProjectSetupSheet | Web; no mobile creation/setup wizard |
| ProjectViewTools groups/columns/saved views; OrderList | Remove editors after M6 consumer review; keep labels/simple filters |
| Task details / subitems / progress / review / activity / files | Focused inspector sections/contextual actions; exact node |
| Task planning / auto-assignment / dependency editing | Web; permitted child creation/staffing stays native |
| budget overview / funding / requests / settlements / reviews | Focused summary/Funding/cash/Accounting details |
| budget annual / journal / audit / mapping / exports / release configuration | Web |
| budget petty-cash | Retained authorized cash workflow only; replenishment/setup → Web |
| communication calls, Help Live/audio | Deferred; retain text conversations and optional text Help |
| Create project / Create personal workspace | Deferred; existing authorized personal work stays accessible |

## Link and context rules for M1–M6

1. Normalize legacy internal routes and notification payloads through one native resolver. Retain source intent, project, root, node, financial record, view and originating tab. Existing `AppRoute` lacks financial-record/origin/workspace fields; extend native types in M1/M2 without changing server payloads.
2. Resolve requested context through server-authorized workspace/project membership. If a switch is needed, retain a pending exact destination and resume after selection. On denial explain and keep a safe context. Back must never render old Office data under a personal label. Invalidate obsolete actor/context state.
3. Work opened from My Work/Inbox/Projects/Accounting retains that tab. Back restores its query/filter/scroll. Cold links build a safe parent stack. Unknown routes/IDs show explanations, not fabricated default records.
4. Current entry parser accepts `eflow://activate-account`, `accept-invite`, `accept-project-invite` with one token and `project-share` with one UUID grant, or the configured exact HTTPS origin. Preserve constraints. General work app links and exact push routing are gaps, not verified behavior.
5. Web handoffs require an explicit allowlist of canonical paths confirmed from current web source. Never interpolate an untrusted URL/view into `Linking.openURL`. Require approved configured HTTPS origin; reject credentials, foreign origins, protocol-relative URLs, malformed/duplicate parameters. Preserve necessary validated record context only; never append native access/refresh tokens or capability snapshots. The web session/backend authorize independently.
6. Until a canonical route is confirmed (web section IDs are not automatically paths), show “Continue in eFlow Web” with a safe configured entry if available. Missing origin leaves a clear explanation/back/native-context action. Admin remains outside mobile even when a notification exists.

## Observed gaps for approved phases

- More has no selected-tab state; child selection is inferred from route names rather than origin.
- Workspace switches go to projects; the generic stack can retain prior-context screens. Context-safe back behavior is unverified.
- `workDestination` preserves personal nodeId but NativeWorkspace does not pass it to PersonalProjectScreen.
- Office TaskDetailsScreen passes nodeId to its review panel, but its general subitem tree has no exact-node drill-down prop; carrying an ID alone does not establish exact branch navigation.
- Notification task links omit project context; financial links open a broad queue. Push opens Inbox rather than exact work.
- `live` can pass the gate without a handler. Fallback still describes an unfinished full port. M0 does not fix these.
