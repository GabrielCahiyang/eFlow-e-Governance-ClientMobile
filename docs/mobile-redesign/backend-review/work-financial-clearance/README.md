# M7 work and financial clearance — manual SQL delivery

Target: **ixnfphgjyelhckjwjkdv**. Prepared 18 November 2026, Asia/Singapore.
**NOT APPLIED.** No hosted schema, RLS, grant, account, data, journal or migration-history write was performed by the agent.

Open `work-financial-clearance.sql` and run the **entire file once**, in the intended project's Supabase SQL Editor. It is a standalone transaction, not a request to apply the repository's migration backlog. Its preflight verifies the exact normalized definitions of the twelve amended functions. A missing or changed prerequisite aborts the transaction. Do not remove that check to force installation. A repeat run is intentionally rejected instead of pretending to migrate a second time. Keep this file as the deployment record; it does not rewrite `supabase_migrations` history.

## Resulting contract

1. Task/Subtask Start work ignores the planned date, while retaining actor, parent, active-project, explicit prerequisite and legacy ordered-sibling checks. Root task prerequisites are enforced on the server as well as Mobile.
2. Existing contributor proposals, branch authority, no-self-review and root review commands remain authoritative. A lead's accepted completion with open cash creates an actor-scoped work-acceptance milestone, without setting `completed` or increasing completion counts. Changes to work scope/appointments invalidate that milestone. Accepted subtasks stop accepting new progress proposals; authorized detail changes require a current acceptance again.
3. Required financial receipt objects and submissions are blocked until accepted work. Actual private Storage objects, owner, exact request path and receipt totals are checked. Request-support files under `/requests/` and ordinary work-evidence buckets retain their original rules. Existing historical receipts remain readable; historical completed work can still use its authorized financial correction path.
4. Accounting acknowledges **the exact unused cash received** and records a receiving reference. A different, current, non-conflicted Head of the funding Office approves the return with a reason. These are separate auditable commands, each with durable identities and current-package fingerprints. A mismatch is rejected; no partial amount is silently accepted.
5. The existing settlement and journal command remains authoritative. A trigger prevents *any* settlement writer, including Head fallback, from approving returned cash before acknowledgment and Head approval. No new journal writer or missing NW11 function is invented. Existing late-package, independent-review, staffing, accounting-mapping and balanced-journal prerequisites remain in force.
6. After confirmed settlement or authorized completion, eligible unused child/task allocations automatically return to the **same project's unallocated balance**. Other open obligations and other sources remain protected. Original project funding and Office commitments are not reduced. Existing positive-amount constraints and cancelled-allocation history are retained. Project completion sweeps eligible previously completed tasks and no longer requires the remaining project balance to be released to Office Budget.
7. A currently authorized Task/Subtask Lead uses `finalize_cleared_work` after work acceptance and complete financial clearance. Dependencies and approved descendant review bindings are rechecked. No automatic final task completion is inferred from a receipt acknowledgment. Unbudgeted completion keeps the existing independent review route.

## New public RPCs

All functions check the authenticated actor and exact scope. Private tables have RLS enabled and no client grants. Public RPC execution is explicitly limited to authenticated clients; no account roles or existing grants are changed.

| RPC | Purpose |
| --- | --- |
| `work_financial_clearance(p_root,p_node)` | Versioned work acceptance, outstanding cash and finalization capability |
| `receipt_submission_clearance(p_request)` | Current cash recipient's permission to submit financial receipts |
| `cash_return_clearance(p_liquidation)` | Current package, amount, acknowledgment, Head approval and actor capabilities |
| `record_cash_return(p_liquidation,p_version,p_action,p_amount,p_reference,p_key)` | Separate `acknowledge` / `approve` commands with stable retry identities |
| `finalize_cleared_work(p_root,p_node)` | Idempotent explicit final completion after clearance |

## Scope, dependency and compatibility notes

- Accounting's receiving reference is an attestation of actual handover, not automatic proof of a bank transfer. No acknowledgment, approval, settlement or real cash return is synthesized by a completion click.
- The only Accounting Officer cannot acknowledge their **own** return. If no independent receiving officer and eligible Head exist, this workflow stays blocked. No unapproved substitute role or Admin bypass is introduced.
- New receipt files remain required for every claimed expense. Ordinary work evidence stays optional. Existing zero-spend / return-document validation is preserved; do not fabricate an expense to clear a return.
- A missing original parent funding source blocks restoration with a specific error. NW11 prerequisites and historical migration reconciliation remain external.
- Previously completed/archived projects and already posted journals are not backfilled or rewritten. Retained balances do not authorize spending on a closed project. A later explicit release to Office Budget remains a separate existing Head action.
- Mobile implements the new controls. The Web checkout was inspected at latest remote main `3f053acca80841e15740344f422db6bb596f5198` and was **not edited**. Old Web clients remain subject to all new server guards, but need the consumer changes below to offer the new acknowledgment/approval/finalization actions. Do not describe this as complete Web UI acceptance.

## Web consumer handoff

Use the existing Web design system and new public RPCs; do not copy React Native components. Update `task-inspector/components/InspectorExecution.tsx` and the task review controls to permit work submission/acceptance before cash settlement only when the versioned clearance contract is available. Display work acceptance separately from canonical completion, and expose explicit finalization only from `canFinalize`.

Update `nested-work` completion/proposal controls and `m7_assigned_subtask_reviews` consumers so `cash_blocked=false` means work acceptance can proceed, not that money is settled. Let financial receipt forms read `receipt_submission_clearance` before selecting/uploading files. Render separate receiving and Head return decisions from `cash_return_clearance`; retain exact package version and request key across uncertain outcomes. Existing independent financial endorsement and settlement remain distinct. Update project closeout copy to retained project balances; do not call `release_project_funding` as part of completion. Keep the explicit Office release as a separately authorized action.

## Validation and safe rehearsal

`installed-functions.json` contains read-only captured function source; `fixture-catalog.json` contains schema metadata, not account data. Neither file is an executable migration. `scripts/prepare-work-clearance-sql.mjs` deterministically regenerates the amended writer section and hash preflight offline.

Run the disposable local PostgreSQL regression harness with the Web checkout's already installed PGlite dependency:

```powershell
$env:EFLOW_WEB_SOURCE = 'C:/path/to/your/Web/checkout'
node scripts/prepare-work-clearance-sql.mjs
node scripts/verify-work-financial-clearance.mjs
node scripts/verify-work-financial-clearance.mjs --crlf-sql
```

The harness installs the delivered SQL against captured row shapes/writers with explicit synthetic identity, membership, locking and finance-read adapters. It verifies syntax, source drift checks and representative permission/state/money invariants. It is **not** a full production-schema rehearsal, real RLS/storage session, concurrent-client test, live journal test, Android/iOS workflow verification or personal acceptance.

After manual installation, use only dedicated approved Head, Member and Accounting Staff fixtures; compare status and amounts on Web and Mobile. The M7 personal checklist records the required actors and unavailable checks. Do not run this SQL against another hosted project or apply unrelated pending migrations.
