# M7 — direct subtask evidence after uncertain saves

19 November 2026, Asia/Singapore. **Development slice complete; personal acceptance PENDING.** M7 is not accepted or advanced. Existing APK hold remains in effect.

## Implemented contract

Direct `save_subtask_work_update` uploads now use `task-attachments/subtasks/<id>/progress/<timestamp>-<safe-name>`. Only a confirmed transactional rejection removes this attempt's new upload. Returned and thrown cleanup failures preserve the original rejection. There is no automatic write retry, orphan sweeper or cleanup based on activity reads.

`SubtaskWorkUpdateRejectedError` extends the generated shared `MutationRejectedError`. Returned RPC codes classified as confirmed rejection are five-character SQLSTATE classes **22/23**, and **42501, 40001, P0001, 40P01, 55P03, PGRST202**. These identify transactional validation/integrity/authorization/conflict/lock failures, or a missing RPC that did not execute. The list applies only to this direct RPC. Client validation and upload-stage failures also use the scoped type because the work-update RPC was never sent. An interrupted upload is not deleted.

Returned connection class 08, `57014`, unknown codes and HTTP 5xx alone retain evidence. Unknown returned errors preserve structured fields without receiving the rejection marker. Thrown RPC exceptions bypass cleanup, including exceptions whose messages resemble permission/revision failures or which carry an apparent SQL code. No translated message determines deletion or retry eligibility; global `isDeterministicRejection` is unchanged.

The sheet permits correction/manual retry only for the scoped rejection type. Unknown outcomes retain draft, attachment, attempted-write lock and activity-check notice across close/reopen and mounted/resumed renders. Ordinary abandoned edits retain the prior reset behavior. Existing actor-scoped **session-memory** drafts are reused; this does not add disk persistence or idempotency across process termination/sign-out. While the outcome is uncertain, there is no replay control. Incomplete or restricted activity never automatically clears the lock.

Fresh root/project/Office/revision, exact-node participation and execute capability checks remain. Mounted actor/node/context changes fail closed. A confirmed save clears the draft and reports success; failed subsequent refresh/publish produces saved feedback without another write.

Contributor proposal attachments remain on `m7-work-evidence`, with existing receipt/recovery and independent review routing, including Task Leads assigned only as contributors. Private approved-proposal application is unchanged. **Separate follow-up:** nearby legacy `saveSubtaskProgress` and `submitSubtaskForReview` still contain unconditional catch cleanup. This slice does not fix or certify those writers.

## Reviewed source and durable adaptation

Mobile base: `3af48f8175005518356b6adfc186a512acf9457f`. Web checkout: `C:\Users\james\projects\eflow-e-Governance-Project`, HEAD `4436863b5d93b2553d66a83df2bf9d970784df4f`. Both working trees had unrelated dirty work, which was preserved. Web's service and rejection type themselves matched HEAD (`git diff --exit-code` passed for those paths).

Reviewed Web SHA-256 fingerprints:

| Source | SHA-256 |
| --- | --- |
| `src/app/features/subtasks/services/subtaskWorkflowService.ts` | `09676dd85f09e0cdbc13af690691f4324b65a04e103bdefbc693d41bc5a11feb` |
| `src/app/shared/MutationRejectedError.ts` | `08c6c24311f0ce1a028c3587ae5dc57f7e456d1d115556fcae532012eb69e0d9` |
| `supabase/migrations/20260831000001_task_evidence_security.sql` | `66154f71fadd1a091efa830d1183f2e0d017d7bdccc2c9358d50203f365bfacc` |

That migration's `eflow_evidence.path_context` (lines 92–105) accepts `progress` or a submission UUID as the third subtask path component; `updates` is not accepted. Its progress guard seals references through that contract, and Web's `subtaskWorkAttachmentPath.test.ts` asserts the progress path. No later local definition of `path_context` was found. This establishes the **source contract**, not hosted policy acceptance. Hosted upload, signed opening and cleanup permissions remain unverified. Historical references and storage policies are untouched.

Only the shared rejection type was refreshed with `EFLOW_WEB_SOURCE` and `scripts/sync-web-core.mjs`. The service was not blindly refreshed. Its reviewed native adaptation is in `scripts/native-core/subtaskWorkUpdate.ts`, applied by `scripts/adapt-native-subtask-work-update.mjs` and wired into `scripts/adapt-native-core.mjs`. It replaces only the direct writer/scoped error declaration, supports both upload-helper names, and preserves native Inspector/review additions and every other writer. Beyond Web's reference, the native adaptation preserves unknown structured error fields, catches cleanup exceptions and provides an operation-specific rejection subtype. Verification covers current output, idempotence and preservation of unrelated declarations on native and current Web inputs.

Files changed by this slice; prior edits in overlapping files retained:

- `src/core/web/app/features/subtasks/services/subtaskWorkflowService.ts`
- `src/core/web/app/shared/MutationRejectedError.ts`
- `scripts/native-core/subtaskWorkUpdate.ts`
- `scripts/adapt-native-subtask-work-update.mjs`
- `scripts/adapt-native-core.mjs`
- `scripts/verify-subtask-work-update-adaptation.mjs`
- `src/app/features/tasks/OfficeSubitemUpdateSheet.tsx`
- `src/app/features/tasks/__tests__/OfficeSubitemUpdateSheet.test.tsx`
- `src/app/features/tasks/__tests__/subtaskWorkAttachment.test.ts`
- `docs/WEB_CORE_MANIFEST.json`
- `docs/mobile-redesign/M7-personal-qa.md`
- This report.

## Executed validation

**PASS: 98 tests / six targeted suites**, 17.586 seconds, final invocation:

```powershell
npm test -- --runTestsByPath src/app/features/tasks/__tests__/subtaskWorkAttachment.test.ts src/app/features/tasks/__tests__/OfficeSubitemUpdateSheet.test.tsx src/app/features/tasks/__tests__/OfficeSubitemActivity.test.tsx src/app/features/tasks/__tests__/workflowFileContract.test.ts src/app/features/tasks/__tests__/WorkTreePanel.test.tsx src/app/features/tasks/__tests__/WorkProposalSheet.test.tsx --json --outputFile=artifacts/M7/subtask-attachment-integrity-tests.json
```

This environment's npm forwarding omitted option flags. Jest printed all six file arguments and ran only those matching suites: **98 passed, zero failed**. It did not emit the requested JSON artifact; none is claimed. An earlier two-suite invocation passed all 56 service/sheet tests. The initial sheet run failed because the new test harness reset the shared safe-area mock; narrowing resets fixed it. The final run had no teardown/network errors after isolating service dependency mocks.

The 32 new service cases independently mock upload/remove/RPC: exact path and RPC counts; validation before I/O; returned/thrown upload failure; all listed rejection codes; returned/thrown cleanup failure; returned connection/timeout/unknown/5xx responses; thrown offline/timeout/SQL-like exceptions; no-attachment rejection; and a simulated commit with lost response whose evidence object remains available. This last case is not a hosted file-opening test. Sheet coverage proves scoped rejection unlocks correction, unknown outcomes preserve draft/evidence/lock across reopening/rerender, scope/membership/capability/revision changes deny writes, and confirmed-save/refresh-failure behavior remains correct. Existing activity, file collector/opening, execution/reviewer routing and proposal recovery suites passed unchanged.

**PASS:** `npx tsc --noEmit --pretty false` (exit 0), `node scripts/verify-metro-config.cjs` (nine checks), and scoped Git/new-file whitespace checks. No separate lint command is configured.

**PASS:** durable adaptation verification, with the reviewed Web source:

```powershell
$env:EFLOW_WEB_SOURCE = 'C:\Users\james\projects\eflow-e-Governance-Project'
node scripts/verify-subtask-work-update-adaptation.mjs
```

Provenance refresh/adaptation commands executed:

```powershell
$env:EFLOW_WEB_SOURCE = 'C:\Users\james\projects\eflow-e-Governance-Project'
node scripts/sync-web-core.mjs app/shared/MutationRejectedError.ts
node scripts/adapt-native-subtask-work-update.mjs
```

**SKIPPED:** full Jest, native JS exports, release credential audit and full `npm run check` wrapper. This localized source slice passed direct TypeScript, Metro and relevant regressions. No dependency/native configuration/credential/release-artifact change requires broader release checks. The full adaptation pipeline was not run over unrelated dirty generated modules; its new helper was directly exercised and verified in isolation.

**NOT BUILT / INSTALLED / VERIFIED:** no new APK; no Android compilation/install/authenticated workflow; no iOS compilation/install/authenticated workflow. Existing APKs do not contain this fix. Native themes, reduced motion, accessibility, font scaling and keyboard behavior remain pending separately on both platforms. No approved actor or server-confirmed role was exercised. Mocked tests are not native-device or hosted acceptance.

The two migrations in the handoff are **user-confirmed applied**, not agent-verified hosted acceptance in this slice. No SQL, hosted read/write, actual Storage cleanup, account/role change, Web edit, deployment, publishing, push or merge was performed.

## Personal checklist — Android and iOS separately

Use approved protected-sign-in accounts and separately authorized disposable evidence/work fixtures. Record actor ID, server-confirmed permanent role, contextual appointment, Office/project/root/node IDs, platform/build and result. Missing actors, fixtures, backend prerequisites or a build containing this fix are **BLOCKED**.

| Account/fixture required | Scenario | Status |
| --- | --- | --- |
| Approved Member or Head appointed Subtask Lead with current direct-update authority | Attach safe evidence; save progress/blocker updates. Compare one activity reference with Web and open the file. Test upload denial and transactional rejection; only the new unused upload may be removed. | BLOCKED: approved fixture/build/device QA |
| Same actor and controlled response-loss fixture | Lose the response after possible commit; confirm no cleanup/replay and retain draft/evidence/lock through reopen and background/resume. Check activity and open committed evidence. An incomplete read cannot prove rollback. | BLOCKED: approved fixture/build/device QA |
| Direct writer, separate authorized access administrator, second Office | Revoke exact-node membership/capability before submission; test stale revision and actor/root/Office changes. Preserve draft and deny writes. | BLOCKED: approved actors/fixtures and separately authorized access changes |
| Approved Task Lead assigned only as contributor plus separate eligible reviewer | Verify proposal path, `m7-work-evidence` and receipt recovery; no self-review or direct-write authority gained. | BLOCKED: approved fixtures/build/device QA |
| Approved Accounting Staff with independently authorized work assignment | Verify role alone grants no direct-update authority; use only the scoped work route, without financial operations. | BLOCKED: approved actor/fixture/build |
| Each supported role, both platforms | Themes, large text, screen-reader notice/button states, reduced motion, keyboard/picker return and origin/exact-branch Back. Confirm saved feedback after failed refresh without another write. | NOT TESTED on Android / iOS |
