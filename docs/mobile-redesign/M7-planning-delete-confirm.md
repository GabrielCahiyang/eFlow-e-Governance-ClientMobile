# M7 pre-start deletion, Subtask planning visibility and picker confirmation

16 November 2026. M7 personal acceptance remains pending. Scope reflects both user corrections: **deletion applies to Tasks and Subtasks; the new visibility rule applies only to Subtasks.**

| Delta | State and evidence |
| --- | --- |
| Task Delete action | **DONE IN SOURCE / backend atomic guard pending.** `TaskDetailsScreen.tsx` exposes Delete to the scoped Project Lead/Head for an unstarted, unarchived Task. `taskDeletion.ts` verifies actor identity, rereads Task state/scope and authority, then uses existing `soft_delete_task`. A known concurrent Start window needs the prepared server guard. |
| Subtask Delete action | **DONE IN SOURCE.** `WorkTreePanel.tsx` exposes Delete to the authorized Task Lead for an unstarted Subtask with current delete capability. `WorkEditorSheet.tsx` rechecks state and authority and uses the existing impact-confirmed work command. A confirmed receipt returns navigation to the remaining parent. |
| Subtask planning visibility | **DONE IN NATIVE PRESENTATION / BLOCKED ON SHARED CONTRACT.** `subtaskVisibility.ts` gates lists/details and `LinkedWorkNodeScreen.tsx` gates links/subpages, including legacy read fallback. Before parent Task Start, only its Task Lead gets the planning view. Other authorized readers see it after parent Start; visibility grants no write capability. Full shared privacy is not implemented by these client checks. |
| Task behavior | **PRESERVED, except requested Delete and shared picker UX.** No Task visibility or edit-permission changes were introduced. Task details only suppress the child Subtask content in the new pre-start planning case. |
| Lead/contributor picker confirmation | **DONE IN SOURCE.** `Fields.tsx` supports opt-in staged selection. Team pickers use Confirm Lead / Confirm contributors. X/Cancel discards the nested draft. Copy says confirmation applies to the form; Save team performs the actual write. Other Choice users retain their existing behavior. |
| Started-work editing | **EXISTING CONTRACT PRESERVED.** Keep execution updates, blockers, Next step, evidence, decisions and authorized contributor changes available. Structural/planning and Lead changes remain subject to their existing independent capabilities/history checks. No blanket lock on active Task editing was added. |
| Web / hosted schemas and policies | **NOT CHANGED.** Read-only findings and exact backend dependency records are in the linked review. |

Read [the shared backend review](backend-review/subtask-planning/README.md) before interpreting a visibility or delete test as successful. A subsequent explicit policy-type inspection confirmed the operational policies are restrictive; the original assumption of a permissive OR bypass was incorrect. Their visibility helper still has no parent-Start condition, so drafts can remain available through other clients/reads. Do not claim a security boundary from a hidden Mobile card. The native fail-closed handling of ambiguous/cancelled parent states also needs an authoritative historical-start projection for full historical visibility.

## Verification

- **PASS:** final full suite, 603 tests / 140 suites; TypeScript and nine Metro checks. Meaningful regressions cover staged selection/cancellation, original Task readability, delete-state checks, revoked/changed scope, direct links before/after parent Start, unstarted Subtask delete impact and navigation recovery. Existing permission and workflow regressions also pass.
- **PASS:** separate Android and iOS production JS exports, Android ARM64/x86_64 release compilation, signature/non-debuggable packaging and startup/feature source-map matches. [APK verification](M7-planning-delete-confirm-apk-verification.json).
- **PASS:** development-account credential audit on both exports and the embedded APK executable. [Audit receipt](M7-planning-delete-confirm-release-audit.json). Existing generic receipts were preserved.
- **PASS:** 18 isolated PostgreSQL checks of the Task delete review script, with explicit synthetic identity/permission adapters.
- **BLOCKED / NOT RUN:** approved actor/fixture mutation tests, hosted RLS/privacy, concurrent Start/delete, Web/native cross-device behavior and staging. Native installation, device themes/font scaling/keyboard/accessibility/reduced motion and native iOS compilation/workflows were not executed. Native iOS requires Mac/Xcode.

[M7 Planning Delete Confirm REVIEW v57 APK](../../artifacts/M7/eFlow-Mobile-M7-Planning-Delete-Confirm-REVIEW-v57-arm64-x86_64.apk). Use this exact filename; previous candidates also use version 57. SHA-256: `3400aa0ff72fc503f5be79cc753574673b6750eae150165bf477716f446db666`.

## Personal QA after actors/fixtures are approved

1. **Cheryl — Head/Project Lead:** open an unstarted Task. Verify Task visibility and editing are unchanged and Delete is available only when permitted. Cancel deletion once. On an approved disposable Task, confirm deletion and verify the project remains. Attempt the started-work and concurrent Start/delete cases only in approved staging.
2. **Andres — Task Lead:** before parent Task Start, create/plan direct Subtasks and inspect the unstarted Subtask Delete action. Confirm an authorized delete after impact review and check navigation returns to the remaining parent. A started, history-blocked or unauthorized Subtask must not be deletable.
3. **Crisostomo — Subtask Lead; Gabriel — contributor/project reader:** the Task remains visible under its existing rules, while draft Subtask titles and links do not open in the affected native screens before Andres starts the parent. Verify feeds/direct RPC/table reads and counts separately after the backend privacy change; they are not accepted now.
4. **Andres starts parent Task:** after refresh, otherwise authorized project participants can view its Subtasks without waiting for individual Subtask Start. Crisostomo/Gabriel receive only their existing assigned actions; ordinary readers have no modification permission. Independent schedule/dependency/start/review requirements remain.
5. **Authorized team editor:** choose a Lead or contributors. Selections must not reach the parent form before Confirm; X/Cancel discards them. Confirm applies the choices to the form, and Save team persists them. Reopen and compare the confirmed roster on another device. Revoked access must fail before writing.
6. Repeat on Android and iOS in both themes with larger text, screen reader, reduced motion and keyboard. Record account/server role and appointment, record IDs, exact result/error and platform. No live fixtures or production mutations have been approved for agent execution.
