# M7 limited editing after Start and Activity details

16 November 2026. User approved implementation for Tasks and Subtasks. M7 personal acceptance is pending.

| Delta | State / evidence |
| --- | --- |
| Active Task edit form | **DONE IN SOURCE.** `ProjectTaskEditor.tsx` loads the versioned server policy, rechecks it on Save, locks start/prerequisites after started history and requires supervising permission/reason for due-date changes. Task visibility and existing editor appointments are retained. Creation does not require the new read RPC. Existing stale-record and uncertain-save protections remain. |
| Office Subtask edit form | **DONE IN SOURCE / BACKEND REQUIRED.** `WorkEditorSheet.tsx` uses the verified `edit_details` capability plus field policy. Name/priority edits are separate from locked planning and controlled rescheduling. The new backend is required to allow permitted edits after Start. |
| Recovery | **DONE IN SOURCE.** `workRecovery.ts` checks an existing receipt first. If uncommitted, it rechecks current editing and field-specific authority without replacing request ID/terms. |
| Task Activity | **DONE IN SOURCE / BACKEND REQUIRED.** `taskDetailActivity.ts` adapts metadata omitted by the generated reader, and `TaskActivity.tsx` shows structured persisted deltas. No client-side best-effort audit write is used. |
| Subtask Activity | **DONE IN SOURCE.** `activityPresentation.ts` displays recorded priority/start/prerequisite/schedule-reason deltas in addition to existing structure/staffing/execution fields. Legacy `null` and explicit `[]` remain distinct. Unrecorded historical values remain unavailable. |
| Older schedule component | **MAINTAINED SOURCE ONLY.** `TaskScheduleSheet.tsx` has equivalent field/submission guards and regression coverage. No current route imports it. It is absent from the APK source map; its unit tests are not live-screen verification. Current Task editing uses `ProjectTaskEditor`. |
| Shared SQL | **PREPARED, NOT APPLIED.** [Backend review](backend-review/started-editing/README.md) describes exact functions, baseline evidence, compatibility, staging/role/concurrency tests and deployment dependencies. |
| Web / hosted data | **NOT MODIFIED.** A portable handoff specifies the shared contract for the teammate's own checkout. |

Current inspected source: Mobile `73157322d9db32d81587e65f1532bc3e77b6391c` plus preserved dirty work; Web `d68f13d964d644fdb2b84b1ca345d3c1d2016771` (clean). This slice uses native adapters; it does not edit the generated Web snapshot. Existing unrelated local changes were retained.

## Automated evidence

- **PASS:** TypeScript and nine Metro checks; final full Jest run **620 tests / 143 suites**. Regression coverage includes permitted edits after Start, locked planning/due controls, missing/wrong-record policy, revocation, retained request terms, and persisted Activity values. These use test doubles and are not live authenticated acceptance.
- **PASS:** 50 disposable local PostgreSQL assertions for each LF/CRLF candidate. Captured writer/capability/snapshot/guard bodies are exercised; scope/identity/history helpers are synthetic and the complete production trigger/RLS graph is not staged.
- **PASS:** Android and iOS production JavaScript exports; Android ARM64/x86_64 release compilation; APK signature/non-debuggable checks and exact source-map match for eight reachable feature modules. The older schedule component is explicitly not bundled.
- **PASS:** release credential audit across both exports and the APK executable. [APK receipt](M7-started-editing-apk-verification.json), [credential receipt](M7-started-editing-release-audit.json). Existing generic receipts were restored byte-for-byte after generating these slice-specific records.
- **BLOCKED / NOT RUN:** production deployment, complete-schema staging, real authenticated mutation/RLS/concurrency tests, Web/native cross-device execution and approved fixture cleanup. No production records, schemas, grants or publications were changed.
- **NOT RUN:** Android device installation/workflows, native iOS compilation/workflows, themes, accessibility, increased fonts, keyboard and reduced-motion checks. Windows JS export is not native iOS validation.

APK: `artifacts/M7/eFlow-Mobile-M7-Started-Editing-Audit-REVIEW-v57-arm64-x86_64.apk` â€” 99,572,385 bytes; SHA-256 `2d45d498d9bea1ccadc797293b471578f40a0f8bef499c963c3720e935e17a92`. Earlier candidates also use version 57; use this exact filename for this slice.

**Integration limitation:** the new backend editing contract is absent from production. Task detail editing fails closed with an explanatory unavailable state until it is installed. The started Subtask backend restriction also remains until deployment. This APK is not evidence that the new feature works end to end. See the review's approved setup/test plan before any hosted writes.

Portable Web package: `artifacts/M7/eFlow-Web-Started-Editing-Handoff-2026-11-16.zip` — 24 whitelisted files; manifest verified. Download/send the actual ZIP to the teammate, then extract outside migration discovery. It includes the SQL, current read-only evidence, policy, local SQL runner and native reference scenarios; no machine-specific access is required. [Package receipt](M7-started-editing-handoff-verification.json).
