# Teammate agent prompt — Web parity for deletion and Subtask visibility

Work in `C:/Users/james/projects/eflow-e-Governance-Project`. Inspect the latest Git state and AGENTS.md, preserve unrelated work, and make the smallest capstone workflow changes. Do not refactor unrelated features or recreate working controls. The last inspected clean checkout was `d68f13d964d644fdb2b84b1ca345d3c1d2016771`; deployed Web build behavior has not been verified.

Apply this exact corrected scope:

1. **Task behavior remains unchanged except deletion.** Do not add draft visibility restrictions or a blanket new editing lock to Tasks.
2. **Delete applies to both Tasks and Subtasks:** show the action only to the authorized actor for unstarted work. Recheck current authority, state, started history, descendant/financial restrictions and record revision at submission. Preserve existing soft-delete/audit or impact/receipt contracts. Confirm deletion clearly, handle uncertain outcomes without blind replay and return to a valid parent view after success.
3. **New visibility rule is Subtask-only and follows the parent Task:** before the parent Task starts, its appointed Task Lead can plan/view the Subtasks. Assigned Subtask Leads, contributors and other project readers must wait for the parent Task Start. Once the parent Task starts, otherwise authorized project/Office readers can view the Subtasks without waiting for individual Subtask Start.
4. Visibility never grants editing or execution. Preserve assigned Lead/contributor update and approval boundaries, Task Lead supervision, existing legitimate Office authority, dependencies, schedules, evidence and no-self-review. A viewer without the relevant work appointment cannot modify it.
5. Keep Task Lead/Subtask Lead contributor editing separate from Lead transfer. Do not regress the contributor-authority correction already applied by the user.
6. For a genuinely nested people selector, provide explicit Confirm/Cancel. Confirm applies selections to the parent form, and X/Cancel discards that nested draft. The parent Save changes persists the team. Do not suggest that picker confirmation has already written to Supabase. If a Web picker is inline in the existing staffing form with Save changes, retain that interaction rather than introducing unnecessary nested dialogs.

Existing Web source to inspect:

- `src/app/features/tasks/components/board/TaskManagementMenu.tsx` already adds Delete task when its caller supplies the action. Trace caller permissions and `useTaskLifecycleActions.tsx`, including all board/list/editor entry points.
- `src/app/features/tasks/services/taskReviewLifecycleService.ts` uses `soft_delete_task`.
- `src/app/features/nested-work/components/WorkHierarchy.tsx` already offers Delete subtask through its delete capability. Check all table/detail variants, the work command, impact preview and stale/delete recovery.
- `WorkStaffingDialog.tsx` already has Save changes; `WorkPeoplePicker.tsx`, `WorkLeadField.tsx` and `WorkContributorsField.tsx` already separate appointment/contributor authority and exclude the appointed Lead from contributor display. Preserve canonical Lead IDs and historical workers.

Backend work IS required for full enforcement. Production is `ixnfphgjyelhckjwjkdv`. A fresh read-only inspection confirmed:

- `eflow_m7.node_visible(uuid,uuid,uuid)` only checks `can_see_task` and Subtask existence; it has no parent-Start predicate.
- Operational policies on Subtasks/progress/submissions/work events are already **RESTRICTIVE**. Do not claim they combine with permissive policies through OR or blindly add duplicates. Inspect and correctly update the shared predicates and all security-definer projections.
- `public.soft_delete_task(uuid)` checks deletion authority and locks the Task, but has no atomic unstarted/progress/history condition. A frontend status check cannot protect a concurrent Start.
- The previously successful Lead-contributor script does not implement these new visibility/delete rules.

Use the Mobile-side shared contract review and captured Task-delete baseline:

`C:/Users/james/projects/eFlow-e-Governance-ClientMobile/docs/mobile-redesign/backend-review/subtask-planning/README.md`

The adjacent `20261116010000_unstarted_task_delete_REVIEW.sql` is prepared, NOT APPLIED. It passed 18 isolated PostgreSQL checks with synthetic permission helpers, not real-role/RLS/concurrency acceptance. The later `20261116020000_parent_task_subtask_visibility_REVIEW.sql` is also prepared, NOT APPLIED, with separate LF/CRLF local tests. It covers the visibility helper, baseline snapshot projection, evidence readers and restrictive attachment metadata. Compare both against current installed definitions and coordinate one reviewed deployment; do not create competing migrations or apply either without approval. Read the documented remaining real-role, storage/cache and historical/cancelled-parent presentation limitations.

For visibility, review the existing restrictive RLS gates, `node_visible`, linked-work/event helpers, `eflow_r7.snapshot` / baseline projector, counts, dependency metadata, direct table reads, history/proposals/evidence, feeds, notifications, search, reports, links and Realtime. Protect complete before/after node snapshots inside root events. Use persisted parent start/history so genuinely started historical work stays visible through later states; do not confuse a child's own started_at with the parent Task's Start. Preserve Personal work, Task visibility and independent finance authorization. Hiding rows in Web alone is insufficient.

Add regressions for Task visibility remaining unchanged; both delete actions; started/historical-work deletion denial; concurrent Start/delete; Subtask Lead/contributor/viewer denial before parent Start; Task Lead planning access; visibility after Start with independent action restrictions; unauthorized links/direct reads/counts/history; overlapping appointments; picker confirm/cancel; and uncertain receipt recovery. Run repository-required check/test/build and configured browser smoke tests.

Do not deploy, push, modify production data/RLS/grants/configuration, apply migrations, create accounts or create/mutate live fixtures without explicit approval. Approved dedicated actors, disposable fixtures and staging access are still required for agent-run writes. Use normal protected login, never passwords or an authentication bypass.

Deliver exact files changed, an existing/changed behavior ledger, the smallest reviewed backend migration and compatibility/rollback/staging plan, and PASS/FAIL/BLOCKED results. Keep UI compilation, local SQL tests, deployed definitions and authenticated Web/Mobile workflow acceptance separate. Do not declare complete privacy or deletion safety until real enforcement is verified.
