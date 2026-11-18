# M7 — exact subtask team execution

18 November 2026, Asia/Singapore. Development slice complete; M7 personal acceptance remains **PENDING**. No phase is accepted or advanced.

## Hosted follow-up — 19 November 2026, 00:21 SGT

**INSTALLED**, verified now with SELECT-only queries against `ixnfphgjyelhckjwjkdv`, with `transaction_read_only=on`. All three active functions contain the exact-subtask-team restriction. `operation_capabilities` exactly matches the reviewed patch. `require_progress_authority` additionally requires contributor review even when the contributor is the parent Task Lead. `guard_progress` retains the reviewed restriction and additionally delegates such direct history writes to that stricter authority check. The `evidence_guard_progress` trigger is enabled on `subtask_progress_updates`.

There is no `20261118152250` entry in `supabase_migrations.schema_migrations`; active function definitions establish installation independently of that ledger. Do not reapply the original fingerprint-guarded file. This supersedes the original supplied handoff's **NOT APPLIED** status below. No hosted write or authenticated mutation/workflow test was performed. [Read-only evidence](M7-subtask-team-hosted-readonly-verification.json).

## Implemented behavior

Office subtask execution participation comes only from that exact node's `lead_id` or explicit `assigned_to_ids`. Parent Task Lead, ancestor Lead, Project Lead and Office Head appointments do not supply execution membership. Missing/null assignment lists fail closed for contributors; the appointed Subtask Lead remains a participant. Current scoped server capabilities remain required and cannot be granted by this predicate.

- `WorkTreePanel` hides Update work and completion actions for an unassigned Task Lead even with an older server execution/submission grant. A notice explains the restriction. Start remains an appointed-Subtask-Lead action. Explicitly assigned Task Leads acting as contributors use the contributor proposal/review path; assignment alone never advertises direct completion.
- `OfficeSubitemUpdateSheet` and legacy `WorkEditorSheet` recheck exact-node participation against the fresh work tree before progress/blocker writes. Existing scope, revision, lifecycle, capability and unknown-outcome handling remain in place. The direct update preflight additionally checks the returned root and node's root identity.
- New Office subtask proposals and resumed evidence uploads recheck exact-node participation and current execute/submit capability before the existing authoritative proposal preflight. Already submitted uncertain requests retain their exact-request verification path. Resubmission receives the Office scope flag too.
- `completionMode` no longer advertises direct Office completion based on a parent Task Lead appointment. The direct completion sheet also verifies the fetched root identity before writing.
- `canDecideSubtaskProposals` remains independent. The linked evidence/review page retains eligible Task Lead review controls without worker participation. Existing Funding presentation retains its prior Task Lead access; financial authorization still belongs to the existing server contracts. Personal-work root Lead participation is preserved separately through `isSubtaskExecutionParticipant`. Root Task, planning/detail, staffing and finance contracts are unchanged.

Navigation remains My Work/Project work → Task → exact Subtask, with the existing Activity, Evidence & review and Funding destinations. The affected panel test had an obsolete Files-button expectation; it now checks the three existing supporting destinations. The linked-screen suite continues checking legacy Files links resolving to exact subtask evidence.

## Source review and native adaptation

Mobile base: `3af48f8175005518356b6adfc186a512acf9457f`. Canonical Web checkout: `C:\Users\james\projects\eflow-e-Governance-Project`, HEAD `4436863b5d93b2553d66a83df2bf9d970784df4f`, with the supplied handoff's uncommitted implementation present. Reviewed its Git status, participation predicate and Office-only capability restriction before adapting Mobile. This records the actual working tree, not a claim of a clean or deployed Web revision.

Refreshed only `app/features/nested-work/selectors/participation.ts` using `EFLOW_WEB_SOURCE` and `scripts/sync-web-core.mjs`; its source fingerprint is in `docs/WEB_CORE_MANIFEST.json`. The broader Web capability module contains additional staffing/types changes, so it was not imported for this focused fix. Generated participation code is unchanged from Web. Native permission/form guards compose that shared predicate with existing server capability selectors and preserve the separate Personal/funding contracts. Existing native Notice, sheets, feedback, theme and motion behavior are reused; no dependency or navigation-system change.

Unrelated dirty picker, sign-in, version and evidence work was retained, including pre-existing changes in `WorkEditorSheet.tsx` and its test. No Web files, hosted state, accounts, SQL, RLS, grants, migrations, history or production fixtures were changed. No push, merge or deployment occurred.

## Backend dependency

The Web handoff identifies `supabase/migrations/20261118152250_restrict_subtask_execution_to_assigned_team.sql` for the sole hosted target `ixnfphgjyelhckjwjkdv`. It restricts `eflow_r7.operation_capabilities`, `eflow_m7.require_progress_authority` and `eflow_evidence.guard_progress`, while retaining the private reviewer proposal-application path. Per the supplied handoff, this migration is prepared/tested locally and **NOT APPLIED**. Hosted availability was not rechecked in this slice. This Mobile guard does not certify protection of older clients or direct database callers before that dependency is deployed by its authorized owner. No migration was copied, edited or applied here.

## Executed validation

- **PASS:** 89 tests / eight affected Jest suites: workPermissions, branchInspector, OfficeSubitemUpdateSheet, WorkTreePanel, WorkEditorRecovery, LinkedWorkNodeScreen, WorkProposalSheet and SubtaskCompletionSheet. Raw result: `artifacts/M7/subtask-team-tests.json`; compact source/evidence receipt: `M7-subtask-team-execution-evidence.json`.
- **PASS:** `npx tsc --noEmit --pretty false`, nine `scripts/verify-metro-config.cjs` checks, and `git diff --check` for this slice.
- Regressions cover unassigned versus assigned Task Leads, Subtask Leads, contributors, retained independent review presentation, missing/null membership, revoked assignments and capabilities, exact-root scope, direct completion denial, contributor proposal routing, retained drafts, existing uncertain-request recovery and funding/legacy-route preservation. All fixtures and service writes were local mocks; no authenticated actor/role is claimed.
- **SKIPPED:** full repository Jest, native JavaScript exports and credential audit. This source-only permission slice passed the affected checks; no release artifact was generated and no shared bundling/dependency infrastructure changed.
- **NOT BUILT:** a new standalone M7 APK. `phase-progress.md`, “M7 pending source edits / APK hold”, records: “Keep APK assembly/packaging on hold for queued changes until the user explicitly requests a build.” Existing APKs do **not** contain this fix.
- **NOT RUN / BLOCKED:** Android compile/install/workflows and authenticated cross-Office scenarios require a new authorized build plus approved accounts/fixtures. Native iOS compilation/workflows require an Apple build environment and approved actors/devices. Native light/dark, reduced motion, TalkBack/VoiceOver, font scaling and keyboard checks are pending separately on each platform; automated rendered tests do not establish device acceptance.

## Personal checklist — repeat separately on Android and iOS

Use dedicated, approved Head, Member and Accounting Staff accounts through protected sign-in; never Admin. Record exact actor ID, server-confirmed permanent role, contextual appointment, Office/project/root/node IDs, platform/build and outcome for every scenario. Missing accounts, fixtures, installed backend prerequisites or native build are **BLOCKED**, not passed. Any work/proposal/decision mutation requires a separately authorized safe fixture.

| Account and appointment | Scenario | Status |
| --- | --- | --- |
| Approved Member or Head appointed Task Lead, unassigned to the child | Open the exact child from My Work and Project work. Confirm no Update work, Start or direct completion; authorized edit/review, Activity and Funding controls remain. Review someone else's safe pending proposal without posting new work as its author. | Pending Android / iOS |
| Approved Task Lead explicitly assigned as child contributor | Post progress/blocker and completion through contributor review. Confirm contributor membership does not offer direct completion or self-review. Remove the assignment in a separately authorized concurrent fixture session while a draft is open; submission must fail closed and retain the draft. | Pending Android / iOS |
| Approved Member appointed Subtask Lead | Verify Start, current-capability work update, and the existing completion-review route. Repeat with Task Lead and Subtask Lead held by the same actor; only the existing server-approved direct route is offered. | Pending Android / iOS |
| Approved contributor and a separate eligible reviewer | Raise/clear a blocker, submit evidence and completion, then approve/return using the separate reviewer. Verify no self-review, fresh capability revocation and exact saved-request recovery after uncertainty. | Pending Android / iOS |
| Approved Head/ancestor Lead/Project Lead, unassigned to the exact child; second Office fixture | Confirm appointments or workspace navigation grant no child execution. Preserve server-authorized branch review, supporting destinations and exact Back/origin tab. | Pending Android / iOS |
| Approved Accounting Staff with a dedicated assigned child and a separate unassigned child | Verify execution follows exact child assignment, while authorized Funding/Accounting actions retain their existing independent authority. No real financial writes. | Pending Android / iOS |
| Each supported role; authorized Personal-work fixture | Confirm unchanged root Task/Personal permissions. Repeat affected screens/sheets in both themes, reduced motion, large text, screen reader and with the keyboard open. | Pending Android / iOS |
