# M0 current-source audit

Audit date: 4 November 2026 (Asia/Singapore). Source conclusions are not hosted-function, native-workflow or personal acceptance results.

## Repository identities and method

- Mobile: `GabrielCahiyang/eFlow-e-Governance-ClientMobile`, branch `main`, HEAD and remote HEAD `6d4f19fc1829e9470d8dca2de524a2041b93521d`. Entry tree was dirty only in `package-lock.json` (90 removed optional-platform `libc` lines). That pre-existing edit is preserved; exact hashes are in `M0-baseline.json`.
- Authoritative web: `GabrielCahiyang/eFlow-e-Governance-Client`, remote HEAD `b8d9fd8a7195b50fe7446b45092c9528586b0778`, verified with `git ls-remote`. Current files were fetched through the GitHub connector at that exact commit, with blob identities recorded in the baseline. The full shallow clone stalled; selected-file API reads succeeded. This is a focused source comparison, not a claim that every web file was audited.
- Nearby `C:/Users/james/projects/eflow-e-Governance-Project` has remote `rivaly-Kun/eflow-e-Governance-Project`, local HEAD `d51a182f11eafd7ffcba44cb488e3099bbe6fd62` and a clean observed tree. It was used only to locate candidate filenames, not as the authoritative baseline, and was not edited.
- Core/presentation manifests still refer to `C:/Users/gabri/OneDrive/Desktop/EflowWeb` / `EflowWeb`, generated 27 October. The default sibling `../EflowWeb` is absent here. No sync/generator ran; a future refresh must point `EFLOW_WEB_SOURCE` to a validated canonical checkout and review native adaptations.

## Audited source and findings

| Area | Actual source evidence | Finding and planned consequence |
| --- | --- | --- |
| Navigation | Native routes/shell/navigation components; current web `components/Layout/coreWorkflowNavigation.tsx`, navigationPermissions | Native mirrors web employee/Accounting destinations plus extras. Native adaptation should select features explicitly while preserving permission reads. Accounting retains normal employee work; mobile changes its default to My Work |
| Branding | Web foundation-tokens/default_theme/globals, EFlowMark/login motion; native theme/Appearance/mark/motion | Main light palette and Figtree align. Native dark canvas #101a1d/surface #19272b differs from current web #0e2421/#142e2a. Use reviewed semantic dark mapping in M1. Source icon library is Carbon on web and Lucide on native; preserve recognizable meaning without copying desktop UI |
| Motion | Current web shared motion and login motion; native shared tokens | Productive/expressive durations, spring/entrance constants and mark paths are reusable. Keep reduced-motion/background rules and recorded safe native view rotation; test on both OSs |
| Personal work | Current web workFeedService and native core snapshot; native PersonalWorkFeedScreen/workDestination | Feed service is aligned after line-ending/trailing-newline normalization. UI uses cards/multiple selectors. Personal node route information is dropped by shell/PersonalProjectScreen; exact branch navigation needs M2/M3 |
| Nested authority | Current web nested-work capabilities/workTreeService; native WorkTreePanel/WorkEditor | Capability selector aligns; actor/session/root/project/Office/kind/revision validation and denied fallback must stay. Service differs: web emits `eflow:work-updated` after confirmed mutation; native snapshot lacks it. Plan a reviewed native event/refresh adaptation in M2, not an unreviewed core sync |
| Root/subitem review | Current web subtaskWorkflowService/taskReviewLifecycleService; native TaskReviewPanel/ReviewsScreen/SubtaskCompletionSheet | Web legacy subtask review discovery deliberately returns no rows (comment: subitem approval retired), while the native snapshot still reads pending submissions/RPC and subscribes. Checked decision wrappers remain; actual hosted rejection was not tested. Native direct completion uses `complete_subitem`; parent final review remains. M2–M4 must reconcile this source drift without inventing a review stage or restoring retired queues, preserving current capabilities and ancestor/root rules |
| Root workflow contracts | Current web taskReviewLifecycleService | Status changes use `transition_task_status`; evidence submission uses `submit_task_for_review`; final decisions use `decide_task_review` with server-derived actor and required changes-request feedback. Preserve these transactional contracts; no M0 mutation verifies hosted authority |
| Project presentation | ProjectScreen, ProjectTaskViews, ProjectSettings/Setup/People/Files/ViewTools/Publication | Twelve main project tabs plus setup/import/group/column/ordering controls. Compact list/agenda/summary/contextual people/files retained; advanced editors web-only |
| Finance | Current web budgetService, independentReviewService, financialReceipts; native budget screens, financialReceipt/useFinancialCommand | Focused operations already have service contracts. Native has durable actor-scoped receipt guards beyond web session-only receipts; preserve them. Monolithic OfficeBudgetScreen eagerly combines annual/journal/audit/etc. Isolate focused reads in M5 without removing shared contracts |
| Finance prerequisites | Source RPC names; no live introspection | Installed hosted version/NW11 state is NOT VERIFIED. Existing legacy services contain migration instructions and a liquidation fallback; source presence is not permission to apply migrations or use a weaker fallback. M5 must explicitly verify equivalent authorization/receipt guarantees or show unavailable |
| Inbox | ActionInbox/InboxScreen/ReviewsScreen | Duplicate review/update surfaces, 15-second polling, whole-queue financial routing, missing notification project context. Consolidate in M2 and preserve exact record context |
| Roles | AuthProvider/mobileRoles/admin tests; canonical navigation/capabilities | Admin remains rejected; permanent Head/Member/Accounting roles and contextual leadership remain distinct. Client permission tests do not prove deployed RLS/SQL |
| Historical limitations | Native QA/build docs and membership finding | Artifacts/screenshots cite another machine. Browser evidence remains browser-only; old Android login/install receipts do not verify this checkout. Personal eligibility mismatch, push/gateway/AI services and all signed-in native workflows require new evidence |
| Tracked native outputs | `modules/eflow-pcm/android/build` and `modules/eflow-pdf/android/build` | 353 generated build files are already tracked. Native assembly rewrites some; restore only task-generated changes after packaging. Runtime source identity excludes generated outputs. Ignoring new local outputs is M0 hygiene; removing tracked outputs from version control is a separately reviewed cleanup, not done here |

## Focused financial prerequisite register (source only)

All rows are **NOT TESTED against hosted backend**. Do not call mutating functions to discover their availability. Obtain existing authorized capability/read receipts or separately supplied deployment evidence before M5 actions.

| Retained operation | Exact source prerequisite(s) | Required fail-closed behavior |
| --- | --- | --- |
| Office/Funding summary | `department_budget_summary`, `get_task_funding_context` and authorized financial scope | Unavailable summary/read error; no invented balances |
| Contextual request/status/evidence | `create_contextual_cash_request`, `resubmit_contextual_cash_request`, `cancel_contextual_cash_request`, `add_cash_request_attachment` | Disable unsupported command, preserve request identity/evidence |
| Release execution/acknowledgment | `record_accounting_petty_cash_release`, `mark_petty_cash_released`, `acknowledge_accounting_release` / `acknowledge_petty_cash_release` according to existing source contract | Current actor/record capability and installed contract required; no role-only success |
| Liquidation | `submit_itemized_cash_liquidation` or exact supported `submit_accounting_cash_liquidation` contract | Itemized/cash-return prerequisites must match; never silently discard receipt lines or bypass missing functionality |
| Independent review | `list_my_independent_liquidation_reviews`, `get_liquidation_independent_review`, `decide_liquidation_independent_review` | Exact package, version, eligible reviewer and no self-review; no settlement grant |
| Settlement | `settle_accounting_liquidation`, applicable `decide_petty_cash_liquidation` / leader review contract, independent-review current status | Preserve actor independence, unknown outcomes and durable receipt guards |
| NW11 nested-work finance | Teammate reconciliation/deployment evidence and operation-specific capability contracts | External dependency; no guessed migration/function name, no implementation or deployment here |

The repository lists `20261021172003_financial_independent_review_and_dependency_lifecycle.sql`; this is source provenance only, not evidence it is installed or an instruction to run it. Missing finance is UI-ready / integration-blocked when UI exists, never a verified operation.

## M0 change boundary

No native runtime, generated core, web source, app dependencies, hosted operations, permissions, evidence or financial records changed. Documentation and ignore rules for new native-module Gradle caches/build outputs establish the contract/build hygiene. Native toolchain dependencies were downloaded for the baseline build; task-generated changes to tracked module outputs were restored after packaging. Ignored mobile .env now contains only the approved project public URL/publishable key selected from the existing local web configuration; no other environment values or account credentials were copied. Historical release-audit content is preserved; fresh audit is separate. No hosted connection, authenticated sign-in or workflow mutation was attempted.


## Reviewed native adaptation — M7 logo palette, 6 November 2026

The user requested the attached eFlow logo's colors throughout this mobile project. Shared native tokens now use the sampled navy `#00006b` and blue `#0073ea`, with accessible light/dark semantic pairs and blue/navy surfaces. Hardcoded teal decoration in retained native presentation, startup/loading, navigation and shared controls was replaced. Status, warning, error, success and review semantics remain distinct. Retained legacy export styles use the same light palette. Existing SVG geometry, typography and motion are preserved.

This is an intentional native visual adaptation authorized by the user, not a new canonical-web comparison. No web Git checkout was compared or refreshed, no core/presentation sync ran, and no generated `src/core/web` file was edited. Backend contracts, authorization and feature selection are unchanged. Validation and platform limitations are recorded in [M7 personal QA](M7-personal-qa.md).


## Reviewed native adaptation — M7 sign-in default repair, 6 November 2026

The build 18 fresh-login report identified a missing optional flag that reverted native sign-in to a retired gateway. Native configuration now defaults to the existing protected hosted mobile-sign-in endpoint; an explicit `gateway` mode retains the protected QA route, and unsupported modes fail closed. Production Expo exports validate the selected transport and approved project before bundling. APK source identity checks include the native configuration and sign-in adapter. The existing server lockout/account protection and session contracts remain intact. No web core sync, generated core edit, hosted deployment, schema/RLS/credential/data or permission change was made. Current evidence is in [M7 personal QA](M7-personal-qa.md).
