# M7 defense workflow stability — 15 November 2026

**Superseded scope/implementation note:** The later final decisions approve direct Office Subtasks only and require selected prerequisites to control both Start and Complete. The temporary Mobile sibling override and the nested-creation failure classification below describe the earlier candidate, not the new approved contract. See [final Task audit](M7-final-task-audit.md) and [review-only single-function correction](backend-review/subtask-parity/README.md). No backend correction has been deployed; historical checks/APK evidence below remain specific to their candidate.

**Overall authenticated workflow: BLOCKED, not passed.** Production mutations are explicitly forbidden for this run. No approved test accounts or disposable writable project have been designated. No migrations, Web edits, hosted configuration changes, actor impersonation, or database writes were performed. M7 acceptance remains pending.

## Environment and existing fixture discovery

The sole configured hosted target is `ixnfphgjyelhckjwjkdv`, named Eflow. The authenticated Supabase CLI identifies its environment as **production**. Administrative inspection used `supabase db query --remote=ixnfphgjyelhckjwjkdv --read-only`; the returned database role was `supabase_read_only_user` and `transaction_read_only` was `on`. This is schema/data inspection, not a Head/Member workflow session.

Read-only account discovery found no account whose name/email is labelled test, QA, demo, defense, disposable, or fixture. `profiles` has no dedicated-test marker. Active profile counts were one Head, five Members, one Accounting Staff and one Admin. Those counts do not establish dedicated-account approval or reviewer eligibility. Admin is excluded from Mobile QA.

One candidate project exists: **QA Live Flow Test 2045**, ID `b6c328e0-b29d-42d2-89d0-a35cfd1844a6`. It is archived, has three Tasks and one cash request, and is not funding-exempt. It has historical financial/work records. It is not a safe writable disposable fixture; do not reopen, repurpose, delete or otherwise modify it for this demonstration without separate approval.

The existing Android emulator was observed at the protected sign-in screen. No sign-in was submitted, no password requested or extracted, and no app session was bypassed.

## Result matrix

| Workflow | Code/backend evidence | Authenticated Android | Authenticated iOS |
| --- | --- | --- | --- |
| Project creation and activation | Existing `create_project_with_details`, `save_project_definition` and governed setup retained; no speculative edits | BLOCKED | BLOCKED |
| Task creation, assignment and schedule | Existing `m7_create_scheduled_task`, scoped task editor and fresh-access checks retained | BLOCKED | BLOCKED |
| Direct Subtask creation and assignment | Existing R7/NW create/staff commands retained | BLOCKED | BLOCKED |
| Scheduling and Task/Subtask Start | Planned-date and current-actor checks retained; `m7_start_subtask` installed definition inspected | BLOCKED | BLOCKED |
| Dependency blocking | PASS: corrected Mobile predicates compared with SQL predicates for all 12 observed Office Subtasks; 11 legacy nulls and one explicit empty array. Edge cases covered automatically | BLOCKED | BLOCKED |
| Blocker reporting and clearing | PASS: post-write snapshot regression; latest-state prefill behavior retained; unpublished-Task-progress fallback covered automatically | BLOCKED | BLOCKED |
| Completion and proposal review | PASS: Mobile reflects installed Office final-completion sibling gate; backend inconsistency remains recorded below | BLOCKED | BLOCKED |
| Root final approval, return and resubmission | Independent review, capability checks and receipt/recovery paths retained | BLOCKED | BLOCKED |
| Web-to-Mobile refresh | PASS: mounted Office inspector/activity uses published Task/Subtask changes plus silent 30-second foreground catch-up; publication inspected live | BLOCKED | BLOCKED |

The row comparison is an administrative read of real stored rows and a comparison of predicates. It does not execute `m7_start_subtask`, completion or review writers, and does not prove actor-specific RLS visibility. There were no cancelled or nonempty explicit-dependency Office records in the observed dataset. [Read-only evidence](M7-defense-readonly-evidence.json)

## Confirmed failures and smallest corrections

| Severity | Exact failure / source | Smallest correction and status |
| --- | --- | --- |
| HIGH | `src/app/features/tasks/subtaskDependencies.ts` excluded cancelled earlier legacy siblings, while installed `public.m7_start_subtask(uuid,uuid)` raises `22023: Complete earlier subtasks before starting this subtask` | **FIXED in Mobile.** Preserve cancelled siblings as incomplete legacy prerequisites, including dependency editing/cycle calculations. Explicit cancelled/missing references remain blocked. |
| HIGH | Installed `eflow_r7.complete_subitem(uuid,jsonb)` raises `22023: Complete earlier ordered steps first` even when explicit `dependency_ids=[]` permits Start. `eflow_r7.command` also retains a legacy gate | **Mobile mitigation implemented.** `WorkTreePanel.tsx` explains and gates final completion by the installed sequence; `SubtaskCompletionSheet.tsx` rechecks before submission. Contributor completion proposals that do not finalize canonical work retain their separate semantics. Backend alignment requires approval; no SQL changed. |
| MEDIUM | `OfficeSubitemUpdateSheet.tsx` passed its preflight snapshot to `onSaved` after a confirmed write, temporarily restoring an old blocker | **FIXED.** Fetch and publish the post-write snapshot. A refresh failure displays saved-but-not-refreshed guidance, closes the confirmed submission, and does not repeat the write or publish stale data. |
| MEDIUM | `task_progress_updates` is absent from `supabase_realtime`; a healthy socket previously suppressed all fallback polling | **FIXED in Mobile.** `useWorkRecordUpdates.ts`, `TaskActivity.tsx` and an opt-in `liveUpdates.ts` setting retain silent 30-second foreground reads even while subscribed. Published `tasks` events also refresh Task activity. Background polling stops; other screens retain existing behavior. No publication configuration changed. |
| MEDIUM | A confirmed Subtask Start followed by a failed refresh could also present a generic failed-action error | **FIXED.** Preserve the confirmed start state and show an explicit refresh notice; no second Start is sent by recovery code. |
| HIGH, existing backend limitation | Installed `eflow_schedule.guard_web_subtask_plan()` rejects a nested Subtask insert with `22023: Add subtasks directly to their task.` | **OPEN.** No nesting restriction was bypassed or removed. A direct-Subtask defense demonstration can use the existing backend. Nested-work acceptance still requires separately approved backend correction. An understandable Mobile error now explains the current restriction. |
| Compatibility limitation | Office snapshots omitting node `dependency_ids` are unknown; Start and Complete stay unavailable. Omitting only `supportsSubtaskDependencies` affects planning controls, not execution of a node with explicit `null`/array fields | **Fail closed retained.** Installed `eflow_r7.snapshot(uuid)` includes both projections. Never fabricate an empty dependency list. Refresh or report the missing contract if fields disappear. |

Readable mappings for the installed prerequisite and direct-subtask errors were added/adjusted in `src/app/shared/userMessages.ts` and `domainErrorMessages.ts`. Unknown outcomes keep existing uncertainty/receipt handling. Existing blocker-prefill changes and unrelated dirty work were preserved; no new UI redesign or generated-core edits were made in this repair.

The explicit-dependency migration `20261113164639_web_subtask_explicit_dependencies.sql` is untracked in the separate Web worktree. Its principal objects are installed, while its migration version is absent from hosted history. This run did not reconcile history, apply that file, modify Web, or declare migration safety.

## Minimum proposed live fixture — approval required before any creation

Use **three distinct existing eligible accounts**, explicitly designated by the user. New accounts are unnecessary if suitable existing accounts can be approved for fixture-only work. All sign-ins go through the application's normal protected flow; server-confirm each actor's permanent role, Office, and contextual capabilities.

| Actor | Permanent role and appointment | Purpose |
| --- | --- | --- |
| H | Head of the fixture's Responsible Office; authorized project owner | Project creation/setup and independent final Task review. Must not be the author of the Task submission being reviewed. |
| L | Member, directly assigned Subtask Lead and Task contributor | Start Subtasks, report/clear blockers, propose completion and resubmit returned work. |
| R | Separate Member, appointed Task Lead and eligible Project Lead | Start parent Tasks and independently review L's Subtask completion proposals. Submit root Tasks for H's final review. Reviewer is a contextual appointment, not a permanent role. |

Create only after explicit approval: one uniquely named Office project such as `DEFENSE-QA-<date>-<suffix>`, in the approved Office, with a date-only start of test day D and end D+7. Use the supported **funding not required** setting, zero budget/expense, no allocations, releases, cash requests, journal entries, invitations or real attachments. If the existing setup rejects no-funding activation, stop and record its exact prerequisite; do not bypass a finance guard. Appoint H/R/L and Task leadership before activation because active staffing changes may be locked.

Create two root Tasks, both led by R with L as contributor: **T1 — Main workflow** and **T2 — Task dependency**, with T2 depending on T1. Under T1 create two direct, non-standalone Subtasks led by L: **A — Prerequisite**, explicitly independent; **B — Dependent**, explicitly depending on A. Set A start/due to D and B start D/due D+1, within the parent/project dates. Explicit dependencies use the existing authorized command after creation; do not insert dependency columns directly.

Proposed live checks, each recorded separately on Android and iOS:

1. H creates/configures the fixture; R/L verify only their assigned readable context. Record actual IDs and server-confirmed roles.
2. Verify parent-not-started blocking, then R starts T1. L starts A; B remains blocked because A is incomplete. T2 remains blocked by T1.
3. L reports a blocker from Web and observes it in Mobile, including activity, within the foreground catch-up interval. Clear it through the normal In progress action and verify Mobile clears it. R repeats this for a root Task blocker. Keep notes/evidence non-sensitive.
4. L proposes A completion. Verify L cannot decide its own proposal. R returns it with a note; L corrects/resubmits and R accepts. B can then start. Complete/review B through the same independent path.
5. R submits T1 for final review. H returns it with a reason; R resumes/corrects/resubmits; H approves. Verify R cannot approve its own final submission. T2 can then start, submit and receive H's final review.
6. Exercise planned-future-date rejection on untouched fixture work using its normal schedule editor, and restore an eligible date with the required reason before continuing. Invalid/out-of-bounds schedules must fail without a successful save. Do not alter existing real work.
7. Reopen records on both platforms and compare status, blocker clearing, authored notes, review decisions and back destinations. A failed request must not show success; an uncertain result must be checked using the existing receipt/recovery flow.

Cancelled-prerequisite and missing-field behavior are covered automatically. A live cancelled edge case would require a separately approved disposable branch; do not cancel real work or alter schema/projections to manufacture it. Full cross-Office negative testing needs a separately approved actor/Office and is outside this three-account minimum; keep that acceptance item BLOCKED until supplied.

Cleanup proposal: retain all authorship, evidence and decisions. After approved tests finish and normal completion conditions are met, request authorization to archive only the named QA project through its supported lifecycle. Do not delete/reuse accounts, purge Tasks/Subtasks, erase review history or financial records, or directly update database state. If testing stops halfway, record the fixture IDs and leave it isolated for review rather than deleting it.

## Validation and personal acceptance

Automated tests: **528 passed / 132 suites**. TypeScript and all nine Metro checks passed. Android and iOS production JavaScript exports passed. Android release compilation passed for ARM64 and x86_64; the standalone APK is non-debuggable, contains no development launcher, and matches all nine affected runtime sources. All three executable bundles (both exports and actual APK) passed the release credential audit. An export or compilation is not a native workflow pass.

Candidate: [M7 Defense Stability v57 APK](../../artifacts/M7/eFlow-Mobile-M7-Defense-Stability-v57-arm64-x86_64.apk), 99,538,973 bytes; SHA-256 `613e11705a11bc55fd2ffd4cbb761d4fb07f398abab54f218bbc59f932cd1c15`. [Package/source verification](M7-defense-apk-verification.json) · [Credential audit](M7-defense-release-audit.json). Installation and signed-in device workflows were not executed for this candidate. iOS native compilation requires Xcode and was not executed on this Windows host. Earlier build receipts were preserved separately.

Personal checklist: use actors H, L and R as assigned above; sign in directly through the protected app. Record exact actor/role, Office, fixture record ID, platform/build, action, response and resulting state for every step. All authenticated checks remain **BLOCKED** until the user approves these actors and fixture creation. Android and iOS device workflows, both themes, reduced motion, screen readers, large text and keyboard acceptance remain unexecuted for this repair. Do not mark the phase ACCEPTED.
