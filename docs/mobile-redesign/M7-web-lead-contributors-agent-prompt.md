# Teammate prompt: Web Task/Subtask contributor and appointment parity

Work in `C:/Users/james/projects/eflow-e-Governance-Project`. Prioritize capstone workflow stability. Inspect current Git state and AGENTS.md, preserve unrelated work, and make only necessary changes. Do not redesign or refactor unrelated flows.

Implement and verify the following Task/direct Office Subtask behavior consistently with Mobile and the shared backend:

1. An appointed Task Lead may add/remove contributors on their own Task, including an active project's Task. An appointed Subtask Lead may add/remove contributors on their own direct Subtask. Project membership alone grants neither staffing permission.
2. Exclude the appointed Lead from both available and selected contributor UI lists/counts on Task and Subtask. Retain the canonical Lead ID in stored worker arrays where the existing SQL contract requires it. Do not erase historical Lead or contributor records.
3. Contributor-management permission must never grant Lead-transfer permission. A Task Lead cannot pass their Task to another Member using contributor editing; Task Lead changes belong to the appointed Project Lead's separate authority. A Subtask Lead cannot pass their Subtask to another Member; Subtask Lead changes belong to the appointed Task Lead's separate authority. Preserve existing legitimate scoped responsible Office Head authority and independent lifecycle/history/eligibility restrictions; do not grant permissions from a global role label.
4. An actor with overlapping appointments must retain the relevant branch permission: a Project Lead who is also the Task Lead can manage that Task's people as Task Lead; a Project Lead who is only a particular Subtask Lead may edit that Subtask's contributors without gaining Lead-transfer authority or control of another branch. Do not let a generic active-project Project Lead guard mask legitimate assigned-Lead contributor management.
5. Use fresh actor/root/node/Office/revision-bound server capabilities. Recheck the specific `manage_contributors` or `appoint_lead` action on save and on an uncommitted retry. Fail closed on unavailable/stale access; show understandable errors and preserve drafts. Verify committed receipts before replaying an uncertain save and retain the original request identity.

Inspect before changing: at Web checkout `d68f13d964d644fdb2b84b1ca345d3c1d2016771`, these pieces already exist:

- `src/app/features/nested-work/components/WorkContributorsField.tsx` excludes the Lead from available and selected contributor UI.
- `WorkLeadField.tsx`, `WorkPeoplePicker.tsx` and `WorkStaffingDialog.tsx` separate appointment and contributor capabilities.
- `src/app/features/nested-work/selectors/staffing.ts` separates `root_lead` / `contributors`, validates changed-Lead authority, and normalizes worker IDs.
- Inspect `WorkRootOwner.tsx`, `WorkRootStaffingDialog.tsx`, `WorkHierarchy.tsx`, `WorkTreeTable.tsx`, `WorkTreeEditor.tsx`, the Task team editor and any legacy paths for contradictory gates. Keep existing working parts.

Backend status is separate from Web UI implementation. After the initial SQL Editor anchor failure, the corrected patch was applied by the user to production `ixnfphgjyelhckjwjkdv`. A subsequent read-only check confirms all five installed function bodies match the reviewed correction after newline normalization. Installation evidence is in `backend-review/lead-contributors/installed-readonly-verification.json` beside the Mobile review documents. Do not rerun the original-baseline script or create a duplicate migration. Installation verification does not establish authenticated workflow success; inspect current definitions and respect server decisions.

Review the corrected Mobile-side proposal and compatibility/staging matrix:

`C:/Users/james/projects/eFlow-e-Governance-ClientMobile/docs/mobile-redesign/backend-review/lead-contributors/README.md`

SQL: `20261116000000_lead_contributor_authority_REVIEW.sql` in that folder. It now normalizes CRLF in the function definition, search anchors and replacement strings, with all baseline hash and unique-anchor checks retained. It passes 31 isolated PostgreSQL checks in each of LF and CRLF input modes. Those use synthetic identity/scope/impact adapters and do not establish real-role/RLS/staging acceptance. Compare against the latest installed definitions before proposing a migration; coordinate one reviewed backend change and do not create competing patches or bypass drift checks.

Do not apply migrations, change production data/configuration/RLS/grants/roles, create test fixtures/accounts, deploy or push without explicit approval. No dedicated actors, disposable project or staging target have been approved yet; authenticated writes remain BLOCKED. Use protected login only and never request passwords or bypass RLS. Keep direct Office Subtasks as the capstone scope and retain Personal/history structures.

Add meaningful regressions for own contributor editing, self exclusion without removing canonical Lead IDs, denied self-transfer, permitted upper-Lead transfer, ordinary Member/other-branch/cross-Office denial, overlapping appointments and revoked-access/receipt recovery. Cover planning and active projects; preserve independent restrictions. Run the repository-required check/test/build and applicable configured browser smoke tests. Once approved actors/fixtures are available, verify actual Web → Mobile roster/Activity refresh against real Supabase roles. Do not substitute mocked tests or compilation for authenticated acceptance.

Return exact changed files, confirmed existing behavior versus actual changes, backend deployment evidence, PASS/FAIL/BLOCKED results, and the smallest remaining approved deployment/testing steps. Do not describe the complete workflow as fixed while the deployed server still denies it.
