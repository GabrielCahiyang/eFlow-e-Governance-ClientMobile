# Office Subtask dependency parity — review package

**NOT APPLIED. Authenticated Web/Mobile parity and staging acceptance remain BLOCKED.** No staging project or approved actors/fixture have been designated. The only authorized hosted target, `ixnfphgjyelhckjwjkdv`, is production and was queried read-only. Do not run this package against it without explicit approval.

## Approved behavior

Explicit selected prerequisites control both Start and Complete. `dependency_ids=[]` means none. `NULL` retains legacy non-standalone earlier-sibling compatibility. Cancelled, missing and incomplete selected prerequisites are unresolved until an authorized actor removes/replaces the selection. Parent Task state, appointed Lead, active project, schedule, independent review, evidence ownership, financial restrictions, historical descendant restrictions and receipt recovery remain independent requirements.

Direct Office Subtasks are the capstone scope. Existing nested history/code/storage remains intact. The installed direct-only creation guard is intentional under the latest user decision, not a release defect.

## Smallest backend change

Review `20261115000000_office_subtask_explicit_completion_parity.sql`. It lives outside every auto-discovered `supabase/migrations` directory. It changes **one predicate in one existing function**, `eflow_r7.complete_subitem(uuid,jsonb)`:

```sql
-- Before:
if not s.is_standalone and exists (... earlier incomplete siblings ...) then ...
-- After:
if s.dependency_ids is null and not s.is_standalone
   and exists (... earlier incomplete siblings ...) then ...
```

The installed `eflow_r7.operation_capabilities` already checks explicit dependency readiness before completion. Its enabled write trigger `eflow_r7.guard_subtask_dependency_write` repeats that check on the final status/percentage update, including when the row is marked standalone. `public.m7_start_subtask` already chooses explicit arrays before legacy sequencing. Those functions are fingerprinted prerequisites and are not changed.

`eflow_m7.decide_work` already routes an accepted Office Subtask Lead completion to the same `complete_subitem` writer, so that path benefits without altering who may approve. The author, reviewer, evidence, baseline validation and decision receipt remain intact.

**Do not change `eflow_r7.command`.** Its progress/submit/review path rejects Office work before its later sibling condition. That remaining condition is a Personal-work rule and is outside this correction. The initial audit's broader suspicion about that condition was narrowed by inspecting the actual installed control flow.

No data backfill, default change, column/index, RLS/grant, role, signature, Task rule, finance function, nesting rewrite or new UI capability flag is required. The patch retains function OID, owner, ACL, security-definer setting and function configuration through `CREATE OR REPLACE` generated from the exact current definition. No schema-cache reload is needed for an unchanged signature.

Mobile also removes its temporary legacy completion override for explicit arrays. A visible cancelled selected sibling now remains a visible **pending** prerequisite instead of being misclassified as restricted/missing. This permits an authorized pre-start dependency editor to remove/replace that selection; it never makes it eligible for Start/Complete. Unavailable/restricted selections and stale/missing capabilities remain fail-closed. No new planner or feature is introduced.

## Compatibility and review gates

| Existing record | Result after the patch |
| --- | --- |
| Office `dependency_ids=NULL`, sequential | Same earlier-sibling rule, including cancelled unresolved siblings. |
| Office `dependency_ids=NULL`, standalone | Same independent behavior. |
| Office explicit `[]` | Earlier unrelated siblings do not block Start or Complete. |
| Office explicit nonempty array | Every selected prerequisite must be completed; order is irrelevant. Cancelled/missing/restricted references do not count as complete. |
| Completed/history/receipt rows | No row changes. Existing exact request replay remains available. |
| Historical nested records | No structural change; independent descendant-completion restrictions remain. New nested Office creation remains restricted by its existing guard. |
| Personal work and root Tasks | No SQL changes. |

The read-only baseline observed 12 Office Subtasks (11 NULL, one empty array; no cancelled or nonempty arrays). That inventory is useful compatibility evidence but is not a representative lifecycle test. The reviewed original function bodies are in `baseline-functions.json`; they contain no production record data, accounts, tokens or credentials.

The migration checks the exact original completion-writer fingerprint, prerequisite function fingerprints, a UUID-array column, and an enabled row-level BEFORE UPDATE dependency trigger. Missing prerequisites, disabled guard, changed SQL, duplicate/already-applied execution or a changed anchor fail the transaction before alteration. **Do not weaken a failed fingerprint to get deployment through.** Reinspect current bodies and repeat review/tests.

The explicit-dependency and priority migrations in the separate Web worktree are untracked, absent from verified Web main and absent from hosted version history, despite their principal objects being installed. This package does not resolve that provenance or authorize applying those files. Use a separately reviewed migration workspace populated from actual deployed history. Never push the historical Web migration folder or invent history entries.

## Local SQL validation

From the Mobile checkout, with the existing reviewed Web PGlite dependency available:

```powershell
$env:EFLOW_WEB_SOURCE = 'C:/Users/james/projects/eflow-e-Governance-Project'
node scripts/verify-subtask-parity-review.mjs
```

The runner creates only an in-memory PGlite PostgreSQL database; it has no network client, hosted URL or connection string. It executes captured actual Start, capability, completion, dependency-trigger and proposal-decision bodies. Identity, eligibility, access, locking context, review-context and evidence-proposal helpers are explicitly synthetic local fixtures. This is not a full deployed-schema, genuine-JWT, Storage, finance, concurrency, UI or cross-device test.

`isolated-sql-result.json` records **47 passing checks**: reproduction before patch; exact one-predicate definition change; no row backfill; metadata/ACL preservation; explicit empty/satisfied/incomplete/cancelled/missing cases; legacy sequence including cancelled siblings; standalone behavior; wrong Lead/outsider, parent state, future/missing dates, hold, descendant and bad evidence rejection; independent proposal approval and no-self-review; exact receipt replay/changed-term denial; an authorized replacement of a cancelled selection through the existing guard; and rejection of reapplication, disabled trigger and prerequisite drift. Synthetic claims/private markers are used only inside this isolated database, never on production.

## Staging acceptance — prepared, NOT EXECUTED

No staging target is authorized or connected. Do not substitute production or create a Supabase branch/environment automatically. On an explicitly approved staging target, reconstruct the full installed schema, enabled triggers, RLS, Storage and grants. Use only dedicated synthetic records and actual protected sign-ins. Verify all precondition fingerprints before considering application; a replayed schema whose definitions differ requires review.

Minimum actors: H = authorized Head and final independent Task reviewer; L = Member/Subtask Lead; R = separate Member/Task Lead and eligible Project Lead who reviews L. These are permanent roles plus contextual appointments, not a permanent Reviewer role. Add outsider X/another Office only when approved for boundary checks. Record actual server-confirmed identity, permanent role, Office, appointment, platform/build and record IDs.

Create an approved zero-funding project with two dated Tasks: T1 main workflow and T2 depending on T1. Under T1 create direct A, C and B. A remains unfinished and unselected; C is a selected prerequisite; B depends on C. Also create an explicitly independent direct E (`[]`) to prove that A does not block E. Assign leads/contributors before active staffing locks. Use only non-sensitive evidence and no financial writes. This is an expansion of the earlier minimum fixture specifically to demonstrate selected-versus-unselected dependencies.

| Test | Expected outcome / evidence required on Web and Mobile |
| --- | --- |
| Pre-patch reproduction | With T1 active/started and B otherwise eligible, C complete and A unfinished: Start B succeeds; Complete B fails at the old sibling guard. Capture exact RPC response, unchanged status and proposal state. |
| Explicit empty array | E starts and completes while A is unfinished, subject to proper Lead/approval. No sibling-order block. |
| Selected incomplete | B cannot Start or Complete while C is unfinished, even if A is complete. Record actual denied RPC and unchanged state. |
| Selected satisfied | Once C is completed, B can Start and Complete while unselected A remains unfinished. Exercise both Task-Lead direct completion and L→R proposal approval on separate disposable steps. |
| Cancelled selected prerequisite | Use only an approved cancelled fixture. It remains unresolved. Where the existing graph guard forbids cancelling an actively selected prerequisite, record that denial; do not disable the guard to manufacture a case. An authorized pre-start edit to remove/replace the selection restores readiness. |
| Legacy NULL | Earlier non-standalone incomplete/cancelled siblings block. A standalone NULL row remains independent. Preserve existing records and ordering. |
| Independent restrictions | Parent Task not started, wrong Lead, future/missing planned date, on-hold project, wrong reviewer, self-review, stale proposal baseline and bad evidence ownership all deny without changing work/receipts. Approved historical-child fixtures retain descendant restrictions. |
| Blockers | Web→Mobile and Mobile→Web reporting/clearing refresh while both stay foreground; notes/authors/evidence remain attached. Simulate a failed read: preserve confirmed blocker and show unavailable/retry. Task Web defects T1–T3 in the Task audit must be corrected/retested under separate authorization. |
| Return/resubmit/approve | L submits completion; R returns with a reason; L corrects/resubmits; R accepts. Canonical step and decision receipt agree. R then submits T1; H returns/resumes/reviews and finally approves. T2's Start/final submission respects T1 dependency. |
| Unknown responses | Interrupt after submission/decision, verify same request ID/terms and actor, inspect receipt, and replay safely. No duplicate history/evidence and no success on an unknown result. |
| Concurrent prerequisite changes | Attempt authorized edit/cancellation/reopen while another session starts/completes dependent work. Existing root/project locks and deferred graph guards must serialize or reject the conflicting operation. |
| Roles/RLS/platforms | Run both directions on Web+Android and Web+iOS separately. Verify outsider/other-Office denial with real authenticated role sessions. A JS export or synthetic test is not acceptance. |

Record PASS/FAIL/BLOCKED for each case, exact response/error, actor and record. Stop on a failing legitimate restriction rather than changing permissions or bypassing guards.

## Rollout and recovery — approval required

1. Obtain approval for the exact staging target/actors/fixtures and execute the above matrix there. Review Task-level Web corrections separately; this package does not edit Web.
2. Re-read production definitions/history read-only and compare to the reviewed baseline. Obtain explicit approval for this single migration and its coordinated Web/Mobile release. Approval to prepare this file is not deployment approval.
3. Only an authorized deployer places the reviewed file in the isolated deployment workspace and applies this one version. Never bulk-push prior files. Keep the original definition and owner/ACL/configuration backup. Verify one function changed, no data changed, guards/grants unchanged, and no unexpected migration history was replayed.
4. Deploy/use the corrected backend **before** releasing the Mobile candidate that removes its temporary sibling override. Until then explicit independence may still be rejected by production completion and the candidate is not release-ready. No fallback writer or UI override may turn a denial into success.
5. On a failure, stop further demo writes and inspect actual receipts/state. Restoring the old function would restore the known blocking defect; it requires separate review/approval and coordinating the client candidate. Never undo accepted work, erase receipts or rewrite history as rollback.

Clean up only with approval through supported lifecycle/archive controls after work/reviews are resolved. Retain authorship, decisions, evidence and historical fixture IDs. No account/data purge or production cleanup is authorized by this package.

## Candidate validation — separate from parity acceptance

**PASS:** 530 Mobile tests in 132 suites, TypeScript, nine Metro checks, both native JS exports, Android release compilation for ARM64/x86_64, all nine inspected runtime sources matched in the actual APK, and the credential audit across both exports and the embedded executable. The package is non-debuggable and has no development launcher. [Build verification](mobile-build-verification.json) · [Credential audit](release-credential-audit.json) · [Read-only production preflight](production-readonly-preflight.json)

[M7 Subtask Parity REVIEW APK](../../../../artifacts/M7/eFlow-Mobile-M7-Subtask-Parity-REVIEW-v57-arm64-x86_64.apk), SHA-256 `e5d0fade7e099e30c8e02e0eca9fa48271464b2900678a5aa120f6263e69585f`. This is a backend-dependent review candidate, not an approved production release. Installation, authenticated Web/Android/iOS workflows, native iOS compilation, themes, reduced motion, large text, accessibility and keyboard acceptance were not executed for this candidate. The full cross-client workflow remains **BLOCKED** and M7 is not ACCEPTED.
