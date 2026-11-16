# M7 Task people permissions

**Superseded for contributor management:** see [the clarified Lead contributor rules](M7-lead-contributors.md). The read-only production findings below remain historical evidence; the earlier restriction requiring appointment authority for all Office Task people edits is no longer the intended Mobile behavior.

16 November 2026, Asia/Singapore. Personal acceptance pending.

## Confirmed production observations — read only

Supabase target `ixnfphgjyelhckjwjkdv` is production. Catalog queries and existing records were read; no actor impersonation, new command execution or data/configuration changes were performed.

- Andres Manili (`5918fe34-c9ce-4471-94e7-aa430b6356d6`) has the permanent role `member`, is active and is not the appointed Head of an Office.
- He is the appointed Project Lead of the active **Barangay Digital Records Management Initiative** (`8cbeb9a5-48b8-48db-876c-e90da136bdd8`). A Member account can hold this contextual appointment.
- Two existing root staffing receipts for Andres were found: `contributors` on **Prepare Barangay Records** (`cb1bcffc-5f3a-4190-a6da-d2c77cfe3c42`, receipt revision 15), and `root_lead` on **test task** (`f0744fdb-b239-4221-8490-7cd1dae6b14e`, receipt revision 4). Both belong to that project. Both stored results grant `appoint_lead` and `manage_contributors`.
- **Ormoc MSME Outreach Program** has Cheryl Gallo as its Project Lead. No root staffing receipt for Andres on that project was returned by the inspected query.

The records inspected explain authorized saves within Andres's Project Lead scope. They do **not** confirm the reported ability to save changes to every Task as an ordinary project Member. No exact Task outside his Project Lead scope was identified. Receipt existence and SQL inspection are not a substitute for authenticated negative testing.

## Installed SQL and Web evidence

Authoritative Web checkout: `C:/Users/james/projects/eflow-e-Governance-Project`, clean Git state at `d68f13d964d644fdb2b84b1ca345d3c1d2016771` when inspected. No Web code or generated Mobile snapshot was changed.

- `eflow_r7.operation_capabilities(uuid,uuid)` grants root `appoint_lead` only through `eflow_r7.head(root)` or Office-scoped `eflow_publication.planning_lead(project,office)`.
- `eflow_r7.head(uuid)` calls `eflow_phase6.head(project,office,actor)` for Office work. That checks the appointed Office Head and joined project Office relationship.
- `eflow_publication.planning_lead(uuid,uuid)` checks the actual Project Lead appointment, active account, matching Office and supported project state. A global `member` role does not remove that appointment.
- `eflow_publication.manage_plan(uuid,uuid,boolean)` also includes Task Lead branch authority through `eflow_r7.manage`; contributor management is therefore broader than root appointment authority in some project states.
- `eflow_publication.root_contributor_change_locked(uuid)` and `eflow_r7.command(uuid,integer,uuid,text,jsonb)` block an ordinary Task Lead's root contributor changes when the project is active. `root_lead` separately requires Head/Project Lead appointment authority. The current command MD5 is `de5545a802178c113db8493bb23297d3`.
- Web migration `supabase/migrations/20261113190755_active_root_contributor_lock_and_work_timeouts.sql` contains the active Task Lead restriction and trigger. The installed function definitions contain those guards; this audit did not execute a staffing mutation or independently exercise the trigger.

There is no confirmed active-project backend bypass in the inspected evidence. The backend's broader Task Lead contributor rights outside active projects are a **remaining contract difference** from the user's clarified Task-level rule. Mobile now applies the narrower rule. Extending it across Web/backend requires a separately reviewed backend change; this correction creates/applies no migration and does not claim backend enforcement changed.

## Confirmed Mobile issues and scoped correction

| File | Issue and correction |
| --- | --- |
| `src/app/features/tasks/TaskDetailsScreen.tsx` | The people action accepted `appoint_lead OR manage_contributors`. Office Task staffing now requires the server's scoped appointment capability, and the action is hidden while capabilities refresh or fail. |
| `src/app/features/tasks/postCreateStaffingPrompt.tsx` | The post-create Task handoff had the same contributor-only fallback. It now requires the same Task staffing access before offering the prompt. |
| `src/app/features/tasks/WorkEditorSheet.tsx` | People fields were enabled without checking each field's capability. Appointed Lead and Contributors now use their individual capabilities; a denied Office root staffing form shows an explanation and hides the pickers. New saves recheck current Task staffing authority before constructing/sending a request. |
| `src/app/features/tasks/workRecovery.ts` | After proving that an earlier staffing request did not commit, recovery now rechecks current Task staffing authority before replaying it. A confirmed existing receipt is still readable after authority loss, and the original request identity is preserved. |
| `src/app/features/tasks/workPermissions.ts` | Native adapter requires root appointment authority for Office Task staffing. It relies on verified, actor/scope/revision-bound server capabilities; it does not grant access based on a role label or navigation context. Personal work and Subtask appointments retain their separate scope. |

The confirmed UI issue is separate from proof of an unauthorized database write. A picker appearing or accepting selections does not establish write authority; existing receipt and actual saved-record evidence are required.

## Required personal QA — BLOCKED

Use approved dedicated accounts and disposable fixtures through protected login. No approved actors/fixture were designated for agent-run writes. Run separately on Android and iOS:

1. Ordinary Member contributor and Task Lead, with neither Project Lead nor Office Head authority: open an active project's Task. **Choose people must be absent.** Repeat in planning and on hold under the clarified Task-level rule.
2. A Member appointed Project Lead of Project A: Task staffing is available in A when server capabilities allow it, and unavailable on Project B's Tasks unless separately appointed there.
3. Appointed responsible Office Head: check allowed Task staffing; a Head of another Office must receive no authority from the permanent role alone.
4. Approved Project Lead/Head: save a permitted Task assignment, then refresh Web and a second Mobile device. Verify the exact Lead and contributor roster, Activity and receipt. Do not use existing capstone records for negative writes.
5. Revoke authority through an independently approved fixture change while the form is open. A new save must fail clearly and leave records unchanged. For an uncertain earlier save, confirm its receipt before retrying; an uncommitted denied request must not write, while a committed request must remain verifiable.
6. Verify Subtask-specific team permissions, both themes, large fonts, screen reader, reduced motion and keyboard on each platform.

Authenticated positive/negative permission execution, RLS behavior and cross-device validation remain unverified; native compilation/automated checks are reported separately below.

## Verification results

- **PASS:** 45 focused tests in five suites, including scoped Member/Head presentation, contributor-only denial, revoked access before save, receipt-only recovery after revocation and exact authorized retry identity.
- **PASS:** final `npm test` exited successfully, 572 tests / 137 suites. The initial broad run's teardown error came from a unit test loading the real Supabase singleton; the recovery unit test now mocks its platform/service dependencies, and the full rerun passed.
- **PASS:** `npm run check` (TypeScript and nine Metro checks), separate Android and iOS production JavaScript exports.
- **PASS:** Android ARM64/x86_64 release compilation, APK signature/non-debuggable verification, startup source matches and all five affected feature source matches. The packaged contributor Next step source also matches the current implementation. [APK verification](M7-task-staffing-apk-verification.json).
- **PASS:** credential audit across Android export, iOS export and APK embedded executable. [Audit receipt](M7-task-staffing-release-audit.json). Pre-existing generic build/audit receipts were preserved.
- **NOT RUN / BLOCKED:** native installation, signed-in role permission tests and device UX checks. Native iOS compilation requires Mac/Xcode. M7 remains unaccepted.

[M7 Task People Permissions v57 APK](../../artifacts/M7/eFlow-Mobile-M7-Task-People-Permissions-v57-arm64-x86_64.apk). Use this exact filename; earlier candidates also use version 57. SHA-256: `415031ccb16e06adbdc0e771f320a2e3611c69897b894a293dc2869bf6dab1c3`.
