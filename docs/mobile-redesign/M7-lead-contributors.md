# M7 Lead contributor management

16 November 2026. This clarification supersedes the prior Task people restriction in `M7-task-staffing-permissions.md`. M7 personal acceptance remains pending.

## Implemented Mobile behavior

- Task staffing entry accepts either the current server appointment or contributor-management capability. An ordinary project Member gains neither authority from membership alone.
- Appointed Lead and Contributors use separate capabilities. Contributor changes cannot be repurposed as a Lead transfer. Current permissions are rechecked for the specific action before saving or replaying an uncommitted request.
- Both Task and Subtask contributor pickers omit the selected Lead, including the selected value/count. The save boundary still retains that Lead's canonical ID as required by existing SQL. Lead transfer retains existing workers, including a former Lead where historically present.
- A Project Lead/Head who is separately appointed Subtask Lead can use their own contributor capability when available; the general active-project planning presentation guard does not mask that branch action. Upper-level and Office Head authority remain independently server-controlled.
- Older committed requests remain verifiable after permission changes; an uncertain request is never converted into a new request identity.

Affected native files: `workPermissions.ts`, `TaskDetailsScreen.tsx`, `WorkEditorSheet.tsx`, `WorkTreePanel.tsx`, `postCreateStaffingPrompt.tsx`, and `workRecovery.ts` under `src/app/features/tasks/`. Generated core and Web files were not modified for this correction.

## Backend status — user-applied correction verified

The earlier deployed active-project Task Lead contributor lock conflicted with the clarified rule. The user has now applied the [guarded backend correction](backend-review/lead-contributors/README.md). A fresh read-only comparison confirms all five installed function bodies match the reviewed correction after newline normalization. [Installation evidence](backend-review/lead-contributors/installed-readonly-verification.json). It also handles overlapping Project Lead/Task Lead/Subtask Lead appointments without granting transfer authority from contributor permissions.

The agent made no hosted mutations. The prior deployment blocker is cleared at the installed-function level. Actual contributor edits, denied transfers, RLS and cross-device behavior still need authenticated checks; installation verification alone does not establish workflow success. The APK verification receipt records the earlier build-time backend status and is superseded on deployment status by the linked installation evidence.

## Verification

- **PASS:** 62 focused Mobile tests across five suites; final full suite 577 tests / 137 suites; TypeScript and nine Metro checks.
- **PASS:** Android and iOS production JS exports, Android ARM64/x86_64 release compilation, non-debuggable packaging/signature, startup and affected feature source matches, and credential audit on all three executables.
- **PASS:** 31 disposable local PostgreSQL checks of the guarded backend proposal, with explicit synthetic scope/identity/impact adapters. This is not hosted RLS or staging acceptance.
- **BLOCKED / NOT RUN:** authenticated roles and fixture writes, staging migration/rollback, cross-device confirmation, Android installation/device UX, native iOS compilation and workflow testing. No approved accounts/fixtures or staging target were provided. Native iOS requires Mac/Xcode.

[Lead Contributors REVIEW v57 APK](../../artifacts/M7/eFlow-Mobile-M7-Lead-Contributors-REVIEW-v57-arm64-x86_64.apk) · [APK verification](M7-lead-contributors-apk-verification.json) · [Credential audit](M7-lead-contributors-release-audit.json).

Use this exact APK filename; earlier builds also use version 57. SHA-256: `d486f0dfff191b5c5f741659c52afaf649c8f4360c05bc01ceffad11351fbd01`.

## Personal checklist after staging approval

Use the dedicated actor and fixture matrix in the backend review. On both Android and iOS, verify a Task Lead's contributor picker omits their own name and cannot open Lead transfer; repeat as a Subtask Lead. Save adding and removing another contributor, and confirm the appointed Lead remains unchanged. Use the separate Project Lead and Task Lead actors to verify permitted root and direct Subtask Lead transfers, including existing history/evidence restrictions. Check an ordinary contributor cannot staff either record. Confirm Web and a second device refresh from confirmed writes. Exercise permission revocation and receipt recovery before further submissions. Check both themes, large fonts, screen reader, reduced motion and keyboard. Record actor, server-confirmed role/appointment, IDs, exact errors and platform separately. Do not mutate existing capstone records.
