# eFlow rules and validations — Mobile to Web handoff

Prepared **18 November 2026**, Asia/Singapore. Read this file from the **Mobile repository root**. Paths such as `src/app/...` below are relative to that root, not to this document. `path:line` identifies the inspected source location; search the named symbol if later edits move a line.

This is a source map and implementation contract for the main project → task → subtask → review → finance → closeout flows. It includes the important validation entry points, rather than claiming that client checks describe every installed database constraint, RLS policy or historical migration. The receiving Web agent must inspect its own current sources and the installed server definitions before changing them.

## 1. Read first: authority, source status and precedence

1. Read `AGENTS.md`, this handoff, the relevant source files and tests. Preserve unrelated dirty work. This document does not authorize deployment, hosted writes, live financial tests, migration execution, pushes or changes to account roles.
2. **The server owns authorization and canonical state.** A visible button, role name, route, selected Office, cached capability or local progress value never grants authority. Recheck the current actor, exact record/branch, project/Office, revision, lifecycle, appointments and financial restrictions on submission. Missing or malformed capabilities fail closed.
3. Web owns its production implementation and shared backend migration coordination. Mobile owns native presentation. Match the rules and RPC contracts using the current Web design system; do not copy React Native components into Web.
4. `src/core/web` is a **generated headless snapshot**, not necessarily the newest Web implementation. Inspect the current Web Git state before comparing. Refresh through `scripts/sync-web-core.mjs` with `EFLOW_WEB_SOURCE`; retain reviewed native adaptations. Do not patch generated code to conceal a denied action.
5. Current inspected Mobile HEAD: `b0a521391ac4924e59281349ac055b2f486c2d65`, with uncommitted implementation/design changes. Current inspected local Web HEAD: `3f053acca80841e15740344f422db6bb596f5198`. A Git SHA alone does not include dirty working-tree changes or prove a deployed Web build.
6. Sole authorized hosted project: **`ixnfphgjyelhckjwjkdv`**. This documentation task performed only a read-only function/schema presence check. No hosted schema, data, journal, role, grant or migration-history changes were made by the agent.

### Current contract status — avoid replaying old migrations

| Contract / evidence | Status at this handoff | Meaning for the Web agent |
| --- | --- | --- |
| New work/financial-clearance APIs | Read-only check on 18 November found all five public RPC signatures and `eflow_work_clearance` schema present; exact signatures are in §9 | They are no longer merely absent prerequisites. Presence does **not** verify every function body, policy, trigger, grant or authenticated workflow. Inspect installed definitions before use or amendment. |
| `docs/mobile-redesign/backend-review/work-financial-clearance/work-financial-clearance.sql` | Delivered manual migration; original header/README say not applied **by the agent** | That delivery-time statement is not the current installation inventory. **Do not run it again simply because that older note says NOT APPLIED.** Its preflight expects the pre-installation definitions and its schema creation is intentionally one-shot. |
| Native clearance, receipt, return and finalization controls | Implemented in the current dirty Mobile source | Web consumer parity still needs review/implementation in the Web checkout. Server presence does not supply Web controls. |
| Contributor and started-editing contracts | Earlier read-only evidence is linked in existing contributor/editing handoffs | Recheck current server definitions. Do not reapply their older SQL patches over newer shared functions. |
| Date-neutral **linking** candidate | Historical review candidate in `backend-review/dependency-linking/`; deployment was not freshly checked by this document | Linking dates and Start eligibility are different rules. Audit these three installed dependency guards separately before declaring parity. |
| Live signed-in Android/iOS/Web financial acceptance | Not established by source or the presence check | Use dedicated approved actor fixtures and normal protected login. Do not claim end-to-end acceptance from mocked/local tests. |

**Precedence for changed rules:** this handoff and the November 18 clearance source supersede older statements that work can Start only on/after its planned start, that cash must be settled before *work acceptance*, or that project completion must release unused funds to Office Budget. Older files remain useful historical evidence. In particular, the own-start-date execution gate in `WEB_WORKFLOW_UX_DEPENDENCY_HANDOFF.md` and the exact-date start instructions in `M7-task-subtask-rules.md` are superseded. Their independent schedule-bound, dependency, authority and review protections remain relevant.

## 2. Main flow and state meanings

```text
Project setup / applicable Office governance and funding readiness
  → activate through the authorized project lifecycle
  → Task Lead starts task (planned-date mismatch is allowed; dependencies must be complete)
  → appointed leads start their subtasks after parent execution is available
  → contributors propose work; eligible leads independently review it
  → whole work is submitted / accepted through its existing review route
      no open cash: existing authorized completion route can complete it
      open cash: record WORK ACCEPTED; canonical status stays not-completed
  → registered cash recipient uploads REQUIRED financial receipt files
  → existing independent receipt endorsement / late-package review, as applicable
  → if unused cash exists:
      actual handover → independent Accounting acknowledgment
      → separate independent funding Office Head return approval
  → existing authorized settlement / independent review / balanced journal posting
  → eligible unused allocations automatically restore to the SAME PROJECT
  → currently authorized work lead explicitly finalizes cleared work
  → complete parent only after all required descendants and reviews are complete
  → project completion readiness → complete project, retaining its remaining budget
```

These are separate facts: **work proposed**, **work accepted**, **receipt package endorsed**, **cash physically received**, **return approved**, **settlement posted**, **canonical work completed**. Never collapse them into one “Approved” value. “Accounting accepted the receipts” alone does not authorize a lead to finish if returned cash, independent review, settlement, descendants or other server requirements remain open.

| Concept | Required interpretation / source |
| --- | --- |
| Work status | Use persisted lifecycle status and server receipts. `for_review`, a pending proposal, `percent_complete=100`, or `workAccepted=true` is not canonical `completed`. See `src/core/web/app/features/tasks/selectors/submissionReadiness.ts:21` and clearance SQL §9. |
| Completion percentage | `src/app/shared/completion.ts:1`, `completionPercent`: completed-child count / total, rounded, capped at 99 until all children complete. With no children, 100 only for `completed`/`done`, otherwise 0. This display helper does not rewrite canonical raw progress fields. |
| Funding requirement | Distinguish an approved budget allocation from an outstanding cash request. Allocation alone is not physical cash received. New acceptance staging is driven by server `cash_open`, not a generic “has budget” flag. |
| Closed project | A retained project balance is not permission to spend on a completed/archived project. Active-project guards still apply. |

## 3. Actor, Office and approval rules

| ID | Rule / validation | Location and enforcement to trace |
| --- | --- | --- |
| A01 | Mobile permanent roles are Head, Member and Accounting Staff. Admin is web-only in Mobile; Task Lead and Subtask Lead are contextual appointments. Do not assign permanent “task_lead” roles. | `AGENTS.md:1`; `src/app/features/navigation/mobileScope.ts:107`, `resolveMobileRoute`; current Web authentication/permission counterparts. |
| A02 | Lead Office Head, Responsible Office Head, Project Lead, Task Lead, Subtask Lead and Accounting authority are distinct. Membership in another Office/project can be legitimate; neither own Office nor global Head status alone is sufficient. | `src/app/features/tasks/workPermissions.ts:9`, `taskStaffingCapability`; `src/core/web/app/features/nested-work/selectors/capabilities.ts:24`, `rememberWorkCapabilityContext`; `src/app/features/budget/financialScope.ts:3`, `financialOffices`. |
| A03 | A mutation capability is bound to actor/root/project/Office/kind/revision and a freshly fetched snapshot. Persisted/cloned/activity snapshots are not authority. Missing actions or malformed entries deny access. | `src/core/web/app/features/nested-work/selectors/capabilities.ts:32`, `isCurrentWorkSnapshot`, plus `selectRootWorkCapability` / `selectNodeWorkCapability`; `src/core/web/app/features/nested-work/services/workTreeService.ts:23`, `fetchWorkTree`. |
| A04 | Recheck account/session changes before consequential actions and uploads. Prevent an old actor's restored draft from writing as a new actor. | `src/app/shared/AccountActionAccess.tsx:11`, `useAccountActionAccess`; `src/app/features/tasks/taskEvidence.ts:22`, `assertEvidenceActor`; scope checks in `workTreeService.ts`. |
| A05 | Office and Personal contexts use separate authorization. Preserve personal ownership/history without importing Office Head/finance power into Personal work. | `src/app/features/navigation/mobileScope.ts:285`, `routeFitsWorkspace`; `:315`, `bindWorkspace`; tree root `kind`, `office` and capabilities. |
| A06 | No self-review for contributor proposals, financial endorsement, independent financial review or cash returns. Eligible ancestor fallback and Responsible Office root authority must remain scoped and server-selected. | `src/app/features/tasks/WorkProposalSheet.tsx:181` vicinity, current proposal decision checks; `src/app/features/tasks/reviewAccess.ts:5`, `independentReviewAllowed`; financial SQL and `independentReviewService.ts` (§8). See the existing root Office exception in §11; do not invent wider exceptions. |
| A07 | After Office project planning, a Project Lead/Head who is not the appointed Task Lead does not gain subtask planning/staffing from that title. Existing appointment/contributor permissions remain separate and server-authoritative. | `src/app/features/tasks/workPermissions.ts:82`, `isProjectLeadSubtaskPlanningBlocked`; `:103`, `canDecideSubtaskProposals`; `src/app/features/tasks/WorkTreePanel.tsx`. |
| A08 | A lead can manage eligible contributors on their own scope when the current capability permits. Contributor management cannot transfer the lead appointment. Exclude the appointed lead from contributor-picker choices/counts while preserving required canonical worker IDs. | `src/app/features/tasks/workPermissions.ts:9`; `src/app/features/tasks/WorkEditorSheet.tsx`; `docs/mobile-redesign/WEB_CONTRIBUTORS_HANDOFF.md`; tree `manage_contributors` versus `appoint_lead`. |

## 4. Project rules and lifecycle

| ID | Rule / validation | Source location / contract |
| --- | --- | --- |
| P01 | Atomic project creation requires a nonempty trimmed title, authenticated user and active profile. Payload includes the correct organization, owner, source/proposal/program identity, dates, members and ordered nonblank milestones. The server validates the payload and scope. | `src/core/web/app/features/projects/services/projectMutationService.ts:9`, `createProject` → `create_project_with_details`. Advanced creation/configuration may remain Web-only; presence in the snapshot is not Mobile feature scope. |
| P02 | Generic metadata saving cannot change lifecycle status or owner. Require expected `updated_at`; stale writes surface a conflict rather than overwriting newer edits. | `src/core/web/app/features/projects/services/projectMutationService.ts:82`, `updateProject` → `update_project_metadata`; adjacent `projectMetadata.ts`. |
| P03 | Activate only after current authoritative readiness checks. Mobile re-fetches readiness; governed projects cannot use its ordinary activation shortcut. Project review, activation and completion are different operations. | `src/app/features/projects/ProjectReadinessSheet.tsx:36`; `src/core/web/app/features/project-readiness/services/readinessService.ts:9` → `phase7_project_readiness`, `phase7_review_project`, activation service. |
| P04 | Cross-Office collaboration approval is bound to the current revision. Required participating/governance Offices must approve that revision; any open change request blocks readiness. Do not reuse approval of an older revision. | `src/core/web/app/features/interdepartment-collaboration/selectors/collaborationReadiness.ts:3`, `calculateCollaborationReadiness`; server governance/readiness contracts. |
| P05 | Project completion uses the server's readiness/blocker list, then `complete_project`. Work, descendant, cash and governance prerequisites remain enforced. Do not replace this with a generic project status patch. | `src/core/web/app/features/projects/services/projectLifecycleService.ts:32`, `fetchProjectCompletionReadiness`; `:39`, `completeProject`; clearance SQL `public.project_completion_readiness_internal` at `:1628`. |
| P06 | Archive is its own authorized lifecycle, normally after completion; deletion/restore have separate guarded services and history/finance restrictions. Do not equate task soft delete with permanent project deletion. | `src/core/web/app/features/projects/services/projectLifecycleService.ts:45`, `archiveCompletedProject`; `src/core/web/app/features/projects/services/projectMutationService.ts:120`, `archiveProject`, `restoreProject`, `deleteProject`. |
| P07 | Completion does **not** automatically release the project balance to Office Budget. An eligible sweep restores unused task allocations within the project before completion. Explicit Head release of project funding remains a separate authorized operation. | Clearance SQL `eflow_work_clearance.before_project_completion` at `:423`, `eflow_budget.pre_subtask_budget_closeout` at `:1572`, project readiness at `:1628`; §8. |
| P08 | Planning validation still matters even though execution is date-neutral. Plans require title/description, at least one enabled task, appropriate program/project/activity/task labels, task description/due date/estimate, and a funded/no-cost decision with valid funded lines. | `src/core/web/app/features/proposal-import/services/manualPlanValidation.ts:11`, `validateManualPlanDraft`; `src/core/web/app/features/project-import/selectors/draftValidation.ts`; current Web import/planning counterparts. |

## 5. Tasks: structure, dates, execution and editing

| ID | Rule / validation | Source location / contract |
| --- | --- | --- |
| T01 | Task creation/editing rechecks session actor, current project and authorized scoped access/setup. Creation requires an active project; this editor permits existing-task edits on hold only where its current access/policy allows. Title is 1–300 trimmed characters; new/changed priority must be Low/Medium/High. New tasks require a current project group. | `src/app/features/projects/ProjectTaskEditor.tsx:185` onward; `taskStructureAccess` at `:44`; `m7_create_scheduled_task`, `phase3_patch_task`, delegated `edit_selected_project_task`. |
| T02 | Task dates must remain within project start/target and start ≤ due when the schedule changes. New dates cannot be in the past under the editor's rules. Unchanged historical dates can survive a metadata correction. Do not reset old dates during an unrelated save. | `ProjectTaskEditor.tsx:220` vicinity; `src/app/features/tasks/taskDates.ts:24`, `taskDatePatch`. Calendar conversions use `taskCalendarDate` at `:9`; do not shift date-only values by device timezone. |
| T03 | Prerequisite selection rejects self, duplicate, unavailable/out-of-project and circular dependencies. Missing/restricted selected work is unresolved, never implicitly complete. Multiple prerequisites mean ALL must be completed. Current Head prerequisite-edit authority and pre-start locks remain. | `src/app/features/tasks/taskPrerequisites.ts:43`, `taskPrerequisiteSelectionError`; `ProjectTaskEditor.tsx:203`; `src/core/web/app/features/tasks/selectors/dependencyReadiness.ts:3`, `pendingTaskDependencies`. |
| T04 | Linking A as prerequisite of B is independent of A's due date versus B's planned start. Overlap, same-day schedules and an undated prerequisite do not by themselves invalidate the link. Keep each item's own required schedule/bounds. | `taskPrerequisites.ts`; `docs/mobile-redesign/backend-review/dependency-linking/README.md` and its guarded review SQL. Audit current `eflow_project.guard_dependencies`, `eflow_r7.guard_subtask_dependency_write`, `eflow_r7.check_subtask_dependency_graph` before claiming deployed parity. |
| T05 | **Start work may occur before, on or after the planned start date.** Preserve current lead authority, active project, unstarted lifecycle and completed prerequisites; no “today equals planned date” gate or forced reschedule just to Start. | `src/app/features/tasks/TaskDetailsScreen.tsx:355`, `verifyExecution`; `src/core/web/app/features/tasks/services/taskReviewLifecycleService.ts:37`, `startTaskIfTodo`; clearance SQL `eflow_m7.guard_root_start` at `:488`. |
| T06 | Task Lead starts work. Contributors cannot bypass Start by posting progress/completion; changed/rejected work resumes through the existing authorized lifecycle. Check live dependencies and project state again on submission. | `TaskDetailsScreen.tsx:355`; `workPermissions.ts:46`, `isTaskLeadOrContributor`; lifecycle service at `:18`, `updateTaskStatus`. |
| T07 | General detail edits are read-only while awaiting review or completed/cancelled. Authorized title/priority corrections after Start are separate from planning changes. Due-date changes after Start require supervising authority and a reason; start/prerequisite/structure changes stay locked after current or historical Start/started descendants. | `src/app/features/tasks/workDetailEditing.ts:18`, `readDetailEditState`; `:37`, `fetchDetailEditState` → `work_detail_edit_state`; `:51`, `detailEditError`; `docs/mobile-redesign/WEB_STARTED_EDITING_HANDOFF.md`. Reason limit 1,000 characters. |
| T08 | Deletion is available only for eligible unstarted work. `todo` alone is insufficient: started history, started descendants, dependencies, review/financial history and server restrictions still apply. Preserve task soft-delete/audit, scoped permission, confirmation and valid parent navigation. | `src/app/features/tasks/taskDeletion.ts:6`, `taskCanBeDeletedBeforeStart`; `:17`, `deleteUnstartedTask`; `taskReviewLifecycleService.ts:175`, `deleteTask` → `soft_delete_task`; `backend-review/subtask-planning/` reviewed SQL. |
| T09 | A task with subtasks is submission-ready only after every required subtask is canonically completed and its required review binding is valid. Pending review or raw 100% is insufficient. Never finish a parent around an unresolved branch. | `src/core/web/app/features/tasks/selectors/submissionReadiness.ts:21`, `getTaskSubmissionReadiness`; server `eflow_r7.require_completed_descendants`; clearance SQL `finalize_cleared_work` at `:437`. |
| T10 | Task completion submission needs its completion note; ordinary supporting evidence files are optional where the existing work contract permits. File validation still runs for supplied files. “Optional files” does not remove required text or review. | `src/app/features/tasks/TaskEvidenceSheet.tsx`; `src/app/features/tasks/taskEvidence.ts:80`, `sendTaskEvidence`; `taskReviewLifecycleService.ts:71`, `submitTaskForReview`. Financial receipt rules are stricter (§8). |

## 6. Subtasks: branch, start, dependencies and completion

| ID | Rule / validation | Source location / contract |
| --- | --- | --- |
| S01 | Retain the shared nested-work model, branch-scoped authority and maximum eight-level nesting. Validate parent/root/kind membership, no cycles and structural impact. Governed/unresolved Office planning can retain its flat workflow; Mobile feature selection must not erase deeper/history records from the backend. | `src/core/web/app/features/nested-work/types.ts`; `src/core/web/app/features/nested-work/selectors/tree.ts:2`, `MAX_WORK_DEPTH`, `reparentChoices`, `supportsNestedWork`; `src/app/features/tasks/WorkEditorSheet.tsx`; `workTreeService.ts:62`, `fetchWorkImpact` → `nw_work_impact`. |
| S02 | Before the Office parent Task starts, its Task Lead gets the subtask planning view; other otherwise authorized readers wait for parent Start. After parent Start they need not wait for each subtask to Start merely to read it. Personal scope retains its separate behavior. | `src/app/features/tasks/subtaskVisibility.ts:4`, `subtasksVisibleForActor`; `WorkTreePanel.tsx` visibility gate; shared `eflow_m7.node_visible`/RLS and `backend-review/subtask-planning/` visibility candidate. Native cancelled-parent/history handling has a known limitation (§11). |
| S03 | **Subtask Start ignores its planned-date mismatch.** Current Subtask Lead starts; root Task must be in progress, parent execution available, scope open, dependencies known/complete, current snapshot valid and project execution not paused. Re-fetch before Start and validate returned node ID and `started_at`. | `src/app/features/tasks/WorkTreePanel.tsx:284` and `:403` vicinity; `m7_start_subtask`; clearance SQL at `:515`. `subtaskSchedule.plannedStartReached` is a legacy helper, not the new Office Start gate. |
| S04 | Explicit prerequisites are eligible siblings under the same parent. Reject self, duplicates, cross-scope choices and cycles, including cycles through legacy order. Editing needs a supported contract, current edit capability and unstarted zero-progress state. | `src/app/features/tasks/subtaskDependencies.ts:13`, `supportsSubtaskDependencies`; `:57`, `canEditSubtaskDependencies`; `:72`, `subtaskDependencyWouldCycle`; `:148`, `subtaskDependencySelectionError`. |
| S05 | Preserve `dependency_ids=null` legacy ordered/non-standalone sequencing; explicit `[]` means independent. Do not normalize one to the other. Unknown/undefined projection, missing/restricted IDs and cancelled prerequisites block execution/completion. | `subtaskDependencies.ts:36`, `legacySiblingDependencyIds`; `:180`, `subtaskDependencies`; server `subtask_dependencies_ready`, `m7_start_subtask`, `finalize_cleared_work`. |
| S06 | Subtask schedule creation/editing still validates calendar dates, start ≤ due, parent/project/ancestor bounds and current started-editing policy. Removing Start date gating must not remove schedule validation. | `src/app/features/tasks/subtaskSchedule.ts`; `src/core/web/app/features/nested-work/selectors/subtaskDates.ts:4`, `subtaskDateLimits`; `:25`, `subtaskDateIssue`; `WorkEditorSheet.tsx`. |
| S07 | Contributor progress/completion is staged for eligible lead review. In Office work, a separate Subtask Lead submits whole-subtask completion to the Task Lead; other direct-completion paths are available only when current capabilities and the complete routing checks permit them. | `src/app/features/tasks/workProposals.ts:45`, `fetchWorkProposals`; `WorkProposalSheet.tsx`; `SubtaskCompletionSheet.tsx`; `src/app/features/tasks/branchInspector.ts:89`, `completionMode`, **together with** the `requiresCompletionReview` override in `WorkTreePanel.tsx:456`; `m7_propose_work` / `m7_decide_work`. |
| S08 | Direct completion rechecks project/Office/branch, dependencies and completed children. Completion note here is limited to 3,000 characters; the current direct sheet permits an empty note. Optional work evidence still validates if supplied. | `src/app/features/tasks/SubtaskCompletionSheet.tsx:90` onward; `complete_subitem`; clearance SQL `eflow_r7.complete_subitem` at `:926`. Do not copy root-note requirements blindly into every subtask path. |
| S09 | With open cash, accepted subtask work records an acceptance milestone without setting `is_completed`, canonical completed status or completed-child counts. Future progress proposals are closed after acceptance; material scope/appointment changes can invalidate acceptance and require current review again. | Clearance SQL `stamp` at `:93`, `accepted` at `:108`, `record_acceptance` at `:128`, `complete_subitem` at `:926`, `work_scope_open` at `:1028`, capability amendments at `:1050` / `:1260`. |
| S10 | Moving/deleting/staffing/reordering uses current tree revision, authorized impact preview and its fingerprint where required. A changed tree requires refreshed confirmation; no generic table write around impact/history guards. | `src/core/web/app/features/nested-work/services/workTreeService.ts:41`, `saveWorkTree`; `:62`, `fetchWorkImpact`; `src/app/features/tasks/workRecovery.ts`; `WorkEditorSheet.tsx`. |
| S11 | Preserve draft scope and immutable request terms. Ordinary membership selection is a set; sibling order is positional. Creation/editing validates its applicable fields/dates, while execution/review/staffing each uses its own capability. Do not send every form field through every command. | `src/core/web/app/features/nested-work/selectors/editorDraft.ts:8`, `workEditorDateError`, plus `captureWorkEditorBaseline`, `workEditorPayload`, `freezeWorkEditorRequest`, `workEditorCapability` and `sameWorkEditorScope`. |

## 7. Contributor and work-review flow — both task shapes

### Task with no subtasks

1. Appointed Task Lead starts it, subject to dependencies and current authority.
2. Assigned contributor submits a **work proposal** (progress or completion, optional work files). Canonical status/progress does not change merely because the contributor submitted it.
3. Eligible Task Lead reviews independently. Changes requested returns the proposal to its author; a replacement references the original proposal, preserving history.
4. Task Lead uses the whole-task completion/review route. Assigned current root reviewer/backup/eligible Office route decides; contributor approval does not bypass that review.
5. Open cash means accepted work, then recipient receipt submission, financial review/return/settlement, and explicit lead finalization. No open cash retains the existing completion route.
6. A root contributor does **not** automatically receive root cash-request authority. The current task-level request contract is Task-Lead scoped; the registered cash recipient, not an arbitrary contributor, submits that request's financial receipts.

### Task with subtasks

1. Task Lead starts the parent; each appointed Subtask Lead starts its eligible scope.
2. Root-task contributors continue through root proposals to the Task Lead. Subtask contributors propose within their exact branch to its eligible lead; Task Lead supervision/ancestor fallback remains server-controlled.
3. Accepting a contributor's contribution does not mean accepting the entire parent task or every sibling. Separate Subtask Lead whole-completion review and descendant review restrictions still apply.
4. A permitted subtask contributor may be an authorized subtask cash requester/recipient under the existing cash contract. Use the actual request's recipient and routing; assignment alone does not grant every finance operation.
5. Budgeted/open-cash subtasks clear their own work and cash before canonical completion. Parent submission/finalization waits for completed descendants and required review bindings. Root-level cash must also clear where present.

### Review and proposal source index

| Concern | Source / contract |
| --- | --- |
| Proposal context, author/reviewer, pending/approved/changes-requested and immutable terms | `src/app/features/tasks/workProposals.ts:13`, `WorkProposal`; `:45`, `fetchWorkProposals` → `m7_work_proposals`. |
| Submission/upload author checks and exact retry payload | `workProposals.ts:74`, `sendWorkProposal` → `m7_propose_work`; evidence bucket `m7-work-evidence`. |
| Resubmit only changed proposal's original author, without an existing replacement | `workProposals.ts:62`, `canResubmit`; `supersedes` relationship retained. |
| Decision must still be assigned, pending and not self-authored; correction explanation required | `src/app/features/tasks/WorkProposalSheet.tsx`; `m7_decide_work`. Office Subtask Lead whole-completion acceptance checks the new clearance contract. |
| Root review, current reviewer/read authority and truthful accepted-versus-completed feedback | `src/app/features/tasks/TaskReviewPanel.tsx`; `taskReviewLifecycleService.ts:142`, `verifyTask` → `decide_task_review`; clearance SQL at `:579`. |
| Assigned subtask review inbox | `src/app/features/tasks/assignedSubtaskReviews.ts:18`, `fetchAssignedSubtaskReviews` → `m7_assigned_subtask_reviews`; SQL at `:1008`. `cash_blocked=false` permits **work acceptance**, not a claim that cash is settled. |
| Work-update field limits | `src/app/features/tasks/WorkProposalSheet.tsx:618` vicinity: nonblank work/completion note ≤3,000 characters; progress in a stuck state needs a blocker; Next step ≤300 characters; supplied evidence validates. Root progress proposals preserve/clamp existing progress to 0–99 rather than letting submission manufacture completion. Generic tree progress commands also validate integer 0–99 in `workTreeService.ts:42`. |

## 8. Financial rules, receipts, returns and approvals

### 8.1 Money identity, allocation and cash authorization

| ID | Rule / validation | Source location / contract |
| --- | --- | --- |
| F01 | Separate Office appropriation/authority, committed project funding, task allocation, subtask cap, cash released, settled spending and returned cash. Cash movement does not create new appropriation. Do not double-count returns as new funding. | `src/core/web/app/features/budget/selectors/financialPosition.ts:6`, `financialPosition`; `src/app/features/budget/mobileFinanceScope.ts`, `cashRequestAmount`, `cashReturnAmounts`. |
| F02 | Every financial write stays bound to the correct organization, fiscal budget, project, task/subtask, original funding source and permitted actor. Cross-Office read selection never grants approval/journal power. | `src/app/features/budget/financialScope.ts:3`; `src/core/web/app/features/budget/services/independentReviewService.ts:48`, `getLiquidationFiscalYear`; funding context and server guards. |
| F03 | Task Lead distribution requires `canManageDistribution`, a current subtask/cap and eligible approved parent source. Open cash can block cap changes; history/finished work cannot switch source. Require a reason (≤3,000 characters), positive cents, spending floor and available-source ceiling. | `src/app/features/budget/subtaskDistribution.ts:11`, `distributionLimits`; `:30`, `buildDistributionRequest`; `src/app/features/budget/SubtaskBudgetDistribution.tsx`; budget service `setSubtaskBudgetCap` at `:259`, `removeSubtaskBudgetCap` at `:279`. |
| F04 | A requested cash amount is not an approved amount or a release. Preserve leader/department approval, installment/release schedule, cash/cheque details, authorized execution, recipient acknowledgment and late/overdue restrictions. Never mark cash released locally. | `src/core/web/app/features/budget/services/budgetService.ts:218`, contextual request; `:304` request decision; `:308` leader decision; `:312` / `:326` release; `:330` / `:341` schedule override; `:362` recipient acknowledgment. Trace actual RPC arguments in these functions. |
| F05 | Cash needed-by date remains required, valid, not before today and within applicable task bounds. An expired task range blocks this request form until schedule correction. **Work Start being date-neutral does not remove this separate cash-date rule.** | `src/app/features/budget/cashNeededByRange.ts:20`, `cashNeededByBounds`; `:61`, `cashNeededByError`; `src/core/web/app/features/budget/selectors/cashWorkflowRules.ts:18`, `assertCashNeededByIsCurrentOrFuture`. |
| F06 | Preserve finance command identities, exact terms, scope and original source. A timeout/unknown result is not a failed transaction and must not automatically produce a new command/payment. | `src/app/features/budget/financialReceipt.ts:13`, `executeFinancialCommand`; `useFinancialCommand.ts:14`; §10. |

### 8.2 Required receipt validation

Authoritative client validation entry point: `src/core/web/app/features/budget/validation/financialValidation.ts:24`, `liquidationInputError`. Native enforcement: `src/app/features/budget/LiquidationSheet.tsx:149` and `:187` onward. Shared upload/service: `src/core/web/app/features/budget/services/budgetService.ts:412`, `submitPettyCashLiquidation`.

| Validation | Current rule |
| --- | --- |
| Eligibility before file selection/upload/submission | Current registered cash recipient only; read `receipt_submission_clearance`, validate version and exact request ID, require `canSubmit=true`, recheck on submission. Work must be currently accepted or qualify through historical canonical completion. Active project, unarchived/undeleted task and eligible cash status remain required. |
| Allowed cash states | New clearance allows `released`, `changes_requested`, `overdue_liquidation`. Do not infer submission permission from every “released cash” display category. |
| Note and package | Nonblank liquidation note; between 1 and 100 receipt rows. |
| Each receipt | Valid historical receipt date, vendor, finite nonnegative amount within precision/limit, and a **required file**. Description required for non-itemized rows. |
| Itemized receipt | Up to 100 purchased items; quantity, unit, particulars, purpose and approved expense source required; positive line amount. Sum item amounts in integer cents equals receipt amount. |
| Package total | Sum receipt cents exactly equals declared actual spending. Spending must not exceed authorized released cash under the current financial workflow. |
| File | JPEG/JPG, PNG, WebP or PDF; extension and available MIME checked. Shared attachment helper defaults to 25 MB per file. Native picker/platform and server Storage checks also apply. A filename/path alone is not proof of a valid uploaded object. |
| Storage authorization | Private receipt object must exist, belong to the authorized uploader and exact organization/request path. New restrictive INSERT policy gates financial receipt objects before accepted work. `/requests/` support attachments cannot substitute for expense receipts. Ordinary work evidence buckets retain their own rules. |
| Zero spending / all-cash-return case | Preserve existing zero-spend/return-document validation. Current form still requires its package/document rules; never invent an expense/receipt amount to make a return pass. |
| Refund metadata | For a positive unused return, the native fresh-submission form requires a cash-return receipt number and date (`LiquidationSheet.tsx:206` vicinity). A supplied return date must be historical/valid. This recipient-entered metadata is not Accounting acknowledgment or Head approval of receipt of the money. |

`src/core/web/app/shared/fileValidation.ts:8`, `attachmentError`, also defines ordinary work attachment types (images/PDF/Word/Excel), default maximum 10 files and per-file size. Work evidence can be optional; financial receipt files cannot.

Native work evidence additionally requires a nonblank filename of at most 255 characters: `src/app/features/tasks/EvidencePicker.tsx:16`, `evidenceIssue`. Do not treat a picked local URI as proof of a successful authorized upload.

Numeric entry points in `financialValidation.ts:6` onward and `src/core/web/app/shared/numericValidation.ts`:

- Financial amounts: two decimal places; normally ≥0.01, explicitly zero allowed for spending/receipt fields; general ceiling 90,000,000,000.
- Budget line total ceiling 9,999,999,999. Quantity × unit cost rounds **once** to cents, then validates the resulting total.
- Receipt quantity: ≥0.001, up to three decimals, ≤`floor(Number.MAX_SAFE_INTEGER / 1000)`. Budget quantity: ≥0.01, up to two decimals, ≤`floor(Number.MAX_SAFE_INTEGER / 100)`.
- Fiscal year integer 2000–2200. Budget settings: nonnegative daily/per-receipt limits, liquidation deadline integer 1–90 days, utilization target 0–100 with up to two decimals. These configuration validators are not permission for Mobile users to configure finance.

### 8.3 Who reviews a contributor's financial receipts?

**Do not equate contributor work review with financial receipt routing.** The uploader is the request's registered cash recipient. Existing liquidation logic routes by the stored request `task_leader_id` and current project financial reviewer; it does not simply choose any Subtask Lead visible in the UI.

Trace these **installed server functions** before porting labels or recipient assumptions:

- `public.submit_petty_cash_liquidation`: leader endorsement if required; a package submitted by its stored leader can skip that endorsement and move to department settlement. This does not skip Accounting/independent review.
- `eflow_project.guard_cash_route` and `eflow_project.reviewer`: project financial reviewer can be the Project Lead when eligible/distinct, with Office Head fallback under the existing conflict rules. Do not hardcode every financial review to the nearest work lead.
- `public.decide_petty_cash_liquidation_leader_review`: rechecks current eligible project reviewer/stored route, denies cash-recipient self-review, then endorses or requests correction.
- `eflow_budget.cash_request_v2`: current root task request is Task-Lead scoped; eligible assigned subtask requesters can use their own subtask route. Do not widen this from contributor membership alone.

The local captured writer definition for `submit_petty_cash_liquidation` is in the clearance SQL at `:1481` and the original captured source in `backend-review/work-financial-clearance/installed-functions.json`. Other installed function definitions should be inspected in the current backend or current Web migrations; do not invent a local source path for uncaptured routines.

Receipt endorsement, late-package authorization, independent review and journal settlement remain separate operations. Shared consumers: `budgetService.ts:470`, `decidePettyCashLiquidation` → `settle_accounting_liquidation`; `:474`, `authorizeLateLiquidation`; `:478`, `decidePettyCashLiquidationLeaderReview`.

### 8.4 Unused cash: acknowledgment, approval and settlement

| Step | Actor / rule | Source |
| --- | --- | --- |
| Physical handover | Recipient returns actual unused cash. Completion does not synthesize a bank transfer or cash receipt. | Product contract; returned amount on the current liquidation package. |
| Acknowledge receipt of unused money | Current independent funding-Office Accounting Staff with `accounting.settle_liquidation`, distinct from liquidation submitter, requester and cash recipient. Attest exact returned amount and a nonblank receiving reference. | `src/app/features/budget/CashReturnPanel.tsx`; SQL `cash_return_clearance` at `:219`, `record_cash_return` at `:252`, action `acknowledge`. |
| Approve returned money | Current active **Head of the funding Office**, distinct from receiving officer, submitter, requester and recipient; only after valid acknowledgment. Separate reason/decision and command identity. | Same contracts, action `approve`. This is separate from receipt-package endorsement and independent settlement review. |
| Settle / post | Existing server-authorized settlement actor, after all required receipt review, current independent review/staffing escalation, return decisions and accounting/journal prerequisites. Head fallback must satisfy the same return guard. | `src/app/features/budget/SettlementPanel.tsx:135` / `:168`; SQL `guard_settlement` at `:308`; existing journal writer retained. |

Return decisions are bound to **liquidation ID + package version + fingerprint + exact returned amount**. A replacement/changed package cannot inherit approval blindly. Receiver/Head authority is revalidated; changes can invalidate the current projection while immutable commands/audits remain. No partial/mismatched amount is silently accepted. A different current receiver may need to acknowledge again; preserve history rather than deleting the old command.

**One Accounting Officer who is also the worker/cash recipient:** self-approval is denied. Existing staffing/independent-review escalation can alert/route to the eligible Office Head and offer only server-confirmed fallback settlement capabilities. It does **not** automatically authorize that person to acknowledge their own unused-cash return. If no eligible independent receiving officer or non-conflicted Head exists, the return/settlement remains blocked. Do not invent an Admin/substitute receiver or claim auto-escalation resolves every conflict.

Independent-review contracts: `src/core/web/app/features/budget/services/independentReviewService.ts:20`, `getIndependentReview`; `:26`, `routeIndependentReview`; `:32`, `decideIndependentReview`; `:38`, `independentReviewAllowsPosting`; `:58`, `approveStaffingEscalation`. Preserve `version`, current fingerprint, eligible-settler count, `escalationRequired`, Head alert state, `headEscalationApproved`, `headCanPostSettlement` and reviewer/settler separation. An “independent reviewer” is a server-selected eligible appointment; the **return approver** specifically is the funding Office Head. Do not replace all review candidates with a generic Head role check.

### 8.5 Automatic restoration is to project budget

1. Successful settlement or eligible authorized work completion invokes server restoration; project completion also sweeps eligible previously completed tasks. Work acceptance alone does not return unsettled physical cash.
2. Only accepted/completed eligible scope with no open cash restores unused allocations. Preserve other open obligations, spent floors, child caps, original parent allocation/source, fiscal identity and project binding.
3. Restore eligible unused subtask/task allocation through its hierarchy to the **same project's unallocated balance**. Do not reduce `eflow_project.funding` or Office `budget_commitments`, and do not call `release_project_funding` as a side effect of completion.
4. An allocation with a positive-amount database constraint can be cancelled while retaining its historical positive amount. Do not set that historical allocation's amount to zero just because an allocation line can reach zero.
5. Missing/unmapped/wrong-project original source blocks restoration with an exact dependency record (including `project_funding_binding` where applicable). Never choose a convenient replacement Office budget or discard a guard.
6. No historical completed/archived-project/journal backfill is implied. Explicit later Office release remains its separate current Head-authorized command.

Source: clearance SQL `eflow_work_clearance.restore` at `:337`, `after_settlement` at `:403`, completion triggers at `:412`, project sweep at `:423`; existing source/obligation functions remain authoritative. Example: a ₱10,000 project allocation with ₱7,000 settled spending and ₱3,000 properly returned/restorable leaves ₱3,000 available **within the project**, subject to remaining obligations. It does not add ₱3,000 new appropriation or automatically release that commitment to Office Budget.

## 9. New shared clearance API and migration rules

Canonical delivery: `docs/mobile-redesign/backend-review/work-financial-clearance/work-financial-clearance.sql` (standalone transaction). Companion contract: the adjacent `README.md`. Copy for manual SQL Editor delivery: `artifacts/M7/M7-Work-Financial-Clearance.sql` when included; use the canonical file if ignored artifacts are not in your checkout.

All five signatures below were **present** in the read-only hosted check on 18 November. This is signature/schema inventory, not an exact-body or authenticated execution verification.

| RPC and exact SQL signature | Consumer behavior / implementation location |
| --- | --- |
| `public.work_financial_clearance(uuid,uuid)` → `p_root`, nullable `p_node` | Version 1; validate exact `rootId`/`nodeId`, boolean `workAccepted`, `cashOutstanding`, `completed`, `canFinalize`. `src/app/features/budget/workFinancialClearance.ts:14`; SQL `:148`. |
| `public.receipt_submission_clearance(uuid)` → `p_request` | Version 1; exact `requestId`, boolean `workAccepted`/`canSubmit`. Read before picking/uploading and recheck before fresh submission. Service `:44`; SQL `:186`. |
| `public.cash_return_clearance(uuid)` → `p_liquidation` | Version 1; exact liquidation, integer packageVersion, finite nonnegative amount; received/approved and current actor capabilities. Service `:73`; SQL `:219`. |
| `public.record_cash_return(uuid,integer,text,numeric,text,uuid)` | Args `p_liquidation,p_version,p_action,p_amount,p_reference,p_key`; action `acknowledge` or `approve`; stable UUID command and unchanged exact terms on retry. SQL `:252`; `CashReturnPanel.tsx`; saved-command validation in service `:115`. |
| `public.finalize_cleared_work(uuid,uuid)` → `p_root`, nullable `p_node` | Explicit current lead finalization after accepted work, no open cash, current active project, valid descendants/dependencies. Already-completed returns its current clearance idempotently; do not infer success from a lost response. SQL `:437`; `WorkFinancialClearancePanel.tsx`; saved-scope validation in service `:149`. |

`src/app/features/budget/WorkFinancialClearancePanel.tsx` shows acceptance versus outstanding cash and exposes finalization only with current `canFinalize`. `workFinancialClearance.ts:95`, `assertWorkAcceptanceAvailable`, ensures the versioned contract exists before Mobile uses the changed acceptance sequence.

### Existing definitions amended by the delivered SQL

| Function | SQL line | Important change; all unrelated guards retained |
| --- | --- | --- |
| `eflow_m7.guard_root_start()` | 488 | Remove planned-date gate; enforce live root prerequisite/project binding under existing locks. |
| `public.m7_start_subtask(uuid,uuid)` | 515 | Remove planned-date gate; keep lead/parent/project/dependency/legacy sibling restrictions. |
| `public.decide_task_review(uuid,boolean,text,text)` | 579 | Accept work with open cash without canonical completion; keep submission decision/audit and truthful status/notification. |
| `eflow_r7.complete_subitem(uuid,jsonb)` | 926 | Stage acceptance with cash outstanding after existing authority/descendant/evidence checks. |
| `public.m7_assigned_subtask_reviews()` | 1008 | Cash no longer blocks work acceptance; this does not authorize settlement. |
| `eflow_m7.work_scope_open(uuid,uuid)` | 1028 | Close further work proposals after current acceptance. |
| `eflow_r7.operation_capabilities(uuid,uuid)` | 1050 | Reflect accepted-work execution/submission restrictions. |
| `eflow_r7.node_capabilities_fast(...)` | 1260 | Same restriction in the fast projection; preserve all other branch/appointment rules. |
| `public.submit_petty_cash_liquidation(uuid,numeric,text,jsonb)` | 1481 | Require current receipt clearance and real owned/scoped private receipt objects. |
| `public.guard_task_financial_completion()` | 1557 | Require financial clearance; old Head-review-only shortcut cannot finish open cash. |
| `eflow_budget.pre_subtask_budget_closeout(uuid)` | 1572 | Preserve closeout guards while removing compulsory Office release. |
| `public.project_completion_readiness_internal(uuid)` | 1628 | Preserve work/cash/governance readiness; unused project balance no longer forces Office release. |

Migration handling rules:

- **Inspect before executing.** The functions/schema now exist; compare installed full definitions, trigger attachments, restrictive Storage policy and grants before proposing a follow-up. Never replay this one-shot migration or older candidates blindly.
- The delivered file begins with `BEGIN` and an exact normalized `pg_get_functiondef` MD5 preflight for the twelve old definitions. Drift/missing prerequisites aborts everything. Never remove hashes/anchor checks to force installation. Its original preflight hashes describe the **pre-installation** baseline, not desired installed post-migration hashes.
- `scripts/prepare-work-clearance-sql.mjs` regenerates the reviewed amendments and delivery copy **offline** from captured source. `installed-functions.json` and `fixture-catalog.json` are review evidence, not migrations or proof of current hosted state. Do not automatically regenerate/execute SQL just to consume this handoff.
- New private acceptance/return tables have RLS and no direct client grants. Private schema functions are not public APIs. Preserve explicit authenticated RPC execution grants, restricted search paths, current actor checks, exact-scope reads and restrictive Storage authorization. Do not add service-role access to Web/Mobile.
- Acceptance is fingerprinted to work/appointments/review scope. Return commands retain immutable identities/history and package fingerprints. Do not replace these tables with client-local flags or generic `approved=true` columns.
- The settlement trigger applies to **every** settlement writer, including Head fallback. Preserve existing posting/journal commands and balanced-journal, mapping, staffing, late-package and independent-review prerequisites. Missing NW11 reconciliation remains an external dependency; do not invent missing functions, replay the migration backlog or bypass finance guards.
- No changes to account roles/credentials, historical journals or `supabase_migrations` history are part of this contract. Never backfill completed projects or redirect historical funding as a convenience.

## 10. Recovery, validation errors, audit and navigation

| Rule | Source / required behavior |
| --- | --- |
| Stable work requests | `src/app/shared/sharedWorkRequest.ts:21`, `saveSharedWork`; `src/app/features/tasks/workRecovery.ts`; `workProposals.ts`. Preserve actor, scope, request UUID, revision, original payload, upload progress and impact fingerprint. A committed result can be confirmed after authority changes; a fresh/uncommitted write still needs current authority. |
| Stable finance commands | `src/app/features/budget/financialReceipt.ts:13`; `useFinancialCommand.ts:14`; `src/core/web/app/features/budget/financialReceipts.ts`. Distinguish confirmed rejection, confirmed commit and unknown result. Query/verify the original receipt before considering another write. Never auto-retry with a new payment ID. |
| Validate restored commands | `workFinancialClearance.ts:115`, `verifySavedReturn`, and `:149`, `verifySavedCompletion`: UUID shape, exact scope/version/amount, valid action/reference and allowed argument keys. Do not send a malformed or another scope's saved draft. |
| Truthful feedback | Success only after a validated server receipt. A committed write followed by refresh failure should say the operation was recorded but the view needs refresh; not “failed” with an invitation to duplicate it. |
| Error disclosure | `src/app/shared/domainErrorMessages.ts`; `src/app/shared/userMessages.ts`. Surface exact missing prerequisites safely, preserve drafts and do not display raw sensitive SQL/hidden record details. `PGRST202`/missing RPC is unavailable, not permission to use direct table writes. |
| Realtime and stale state | `src/app/features/budget/useCashRequestUpdates.ts` includes work/task updates for clearance; refresh affected financial/work views and capability context after a confirmed decision. Subscription arrival is not authorization or proof of a write's outcome. |
| Audit/history | Retain original authors, submitters, reviewer identities, decisions, versions, supersession, amounts/sources and activity/audit entries. Accepted work must not emit a misleading Completed event/count. |
| Exact links/back | Preserve originating workspace/tab, project/root/node and record ID for work proposals, cash packages and reviews. `src/app/features/tasks/assignedSubtaskReviews.ts:41`, `assignedSubtaskReviewRoute`; `src/app/features/budget/mobileFinanceScope.ts`, `linkedFundingSubitem`; `mobileScope.ts:107`. Resolve only an exact unique record match; never guess a sibling or Office from a notification title. |

## 11. Known differences / audit points the Web agent must not miss

1. **Old date guidance is superseded.** Date-neutral Start is current. Date-neutral prerequisite *linking* is a separate candidate whose installed guards still need inspection. Schedule bounds and needed-by validation remain.
2. **Root Office review has an existing exception.** The captured `decide_task_review` contains `office_finalization` for the organization-default Office output reviewer and a constrained self-finalization branch (SQL `:691` vicinity). This is not a general contributor/finance self-review exception. New root acceptance validation separately checks approved submission/reviewer bindings. Preserve current behavior for audit; do not widen it or claim every legacy route is exception-free.
3. **Project financial reviewer is not always the work lead/Head.** See §8.3. Product authority names must not be implemented as a hardcoded universal Head check. Responsible Office root review, Project Lead financial routing and funding Office return approval are different contracts.
4. **Legacy cash-completion selector drift:** `src/core/web/app/features/budget/selectors/taskCashClearance.ts` contains an older approval/Head-review exception. New server completion guards are stricter; do not copy that exception into the new finalization flow or equate work-acceptance readiness with settlement.
5. **Open-cash terminal set:** new `eflow_work_clearance.cash_open` at SQL `:123` excludes only `settled`, `rejected`, `cancelled`. An `expired` request is not automatically excluded by this guard. UI grouping/status helpers can use different sets for different purposes; do not unify them by assumption.
6. **Historical parent visibility:** current native `subtasksVisibleForActor` uses current parent statuses and the Task Lead. A cancelled parent with historical Start is not fully represented by that simple projection. Earlier visibility SQL considered historical Start; current native/server alignment, old signed links, caches, embedded event snapshots and Storage reads need dedicated verification. Do not broaden reader access as a workaround.
7. **Independent receiver availability:** existing Head settlement escalation does not fabricate an independent Accounting cash receiver. A conflicted sole officer with unused cash can remain blocked even if the Head is eligible to review/post through the existing fallback.
8. **Required receipts versus optional evidence:** do not change the shared receipt validator to make files optional, and do not require optional work files merely to reuse the finance form.
9. **Source versus deployment:** older manual delivery READMEs and snapshots are dated records. This handoff's hosted inventory verifies only the five signatures/schema. Exact installed bodies, grants/RLS/Storage, current actor capabilities, concurrency and real journal outcomes need their own evidence.

## 12. Web implementation and regression checklist

Use current Web counterparts of task inspector/execution/review, nested-work editor/hierarchy/proposals, cash/liquidation forms, independent review/settlement, project readiness and closeout. Reuse the current Web design system. Read Mobile logic and tests as reference, not runnable Web UI code.

1. Inventory current Web support first; record existing behavior, missing consumer work and exact backend dependencies. Confirm installed contracts read-only. Avoid duplicate SQL or a competing authority model.
2. Remove runtime planned-date Start gates on both tasks and subtasks while retaining all authority, parent, lifecycle and prerequisite checks. Keep create/edit schedule and cash needed-by validations.
3. Separate contribution review, whole-work acceptance and final completion. Gate receipt upload with the new versioned clearance read before file selection/upload and fresh submission.
4. Offer separate current Accounting acknowledgment and funding Office Head return approval. Preserve version/fingerprint/exact amount/reference/command IDs. Keep independent settlement review and the original journal writer.
5. Expose explicit finalization only from current `canFinalize`. Show retained project balances; never call Office release from project completion.
6. Preserve recovery and validate exact receipts before showing success. Refresh Web/Mobile/inbox/activity/counts consistently from confirmed server state.

| Regression group | Minimum cases / Mobile reference |
| --- | --- |
| Start and dependencies | Before/on/after planned date; incomplete/missing/cancelled prerequisites; ALL-of dependencies; same-day/overlap linking; scope/self/cycle rejection; `null` vs `[]`; stale actor; unstarted parent; hold/closed project. `src/app/features/tasks/__tests__/TaskDetailsScreen.test.tsx`, `WorkTreePanel.test.tsx`, `subtaskDependencies.test.ts`, `taskDates.test.ts`, `subtaskSchedule.test.ts`. |
| Contributor / lead / reviewer | Root contributor with no children; root contributor with children; subtask contributor versus appointed Subtask Lead; whole-completion review; own-proposal denial; ancestor/Office fallback; unrelated branch/Office denial; appointment change; stale capability/draft. `workPermissions.test.ts`, `workProposals.test.ts`, `WorkProposalSheet.test.tsx`, `TaskReviewPanel.test.tsx`, `workDetailEditing.test.ts`. |
| Receipt controls | Before acceptance denied; accepted correct recipient permitted; wrong actor/request denied; every file required; real owned scoped object; support-file substitution denied; mismatched cents/items; overspending; zero-spend documentation; stale correction package and unknown submission outcome. `src/app/features/budget/__tests__/LiquidationSheet.test.tsx`, `workFinancialClearance.test.ts`, `FinancialClearancePanels.test.tsx`. |
| Cash returns and settlement | Exact amount/version; separate receiving and Head commands; self/conflicted actor denied; removed receiver/changed Head; superseded package; duplicate original command; unknown-result retry; zero eligible settlers and Head fallback; return guard enforced on every posting route. Same finance tests and `scripts/verify-work-financial-clearance.mjs`. |
| Project restoration / closeout | Nested cap and root allocation restoration; original fiscal/source preserved; spending floor and unrelated obligations protected; no Office commitment/project funding reduction; missing source blocked; cancelled historical amount preserved; project completion retains balance; no historical journal rewrite. Local SQL harness plus approved integration fixtures. |
| Recovery / routing | Lost response versus confirmed denial; original request verified after capability change; changed uncommitted actor/scope denied; restored malformed terms denied; exact root/node/package deep link; originating workspace/back preserved. `src/app/features/tasks/__tests__/workRecovery.test.ts`, `workRecoveryStaffing.test.ts`, budget `financialReceipt.test.ts`, `mobileFinanceScope.test.ts`. |

Existing clearance validation evidence is in `docs/mobile-redesign/M7-work-financial-clearance-verification.json` and `M7-work-financial-clearance-personal-qa.md`: 84 focused Jest tests passed, and 56 disposable local PostgreSQL assertions passed for each LF/CRLF mode in the implementation slice. The local SQL harness uses captured writers with synthetic scope/identity/finance-read adapters; it is **not** full production RLS/Storage/concurrency or a live journal test. Android release and Android/iOS JS export evidence do not establish signed-in workflow acceptance. Existing broader unrelated typecheck/navigation failures are recorded in that verification; do not report full release readiness from the focused passes.

For this documentation task, validation is limited to checking source references and the read-only hosted API/schema inventory. No application tests/builds, live actor writes, migrations or deployments are required or claimed by creation of this file. Android and iOS signed-in workflow, themes, accessibility/font scaling, keyboard and reduced-motion acceptance remain separately required for affected native work. Web needs its own targeted tests and browser acceptance.

## 13. Additional local entry points

| Need | Read |
| --- | --- |
| Current clearance contract / manual SQL / captured pre-installation writers | `docs/mobile-redesign/backend-review/work-financial-clearance/README.md`, `work-financial-clearance.sql`, `installed-functions.json`, `fixture-catalog.json` (dated evidence; see current presence inventory above). |
| Contributor versus lead appointment | `docs/mobile-redesign/WEB_CONTRIBUTORS_HANDOFF.md`. |
| Started detail editing and impact/reason rules | `docs/mobile-redesign/WEB_STARTED_EDITING_HANDOFF.md`; `backend-review/started-editing/README.md`. |
| Dependency linking candidate, feedback, pending actions | `docs/mobile-redesign/WEB_WORKFLOW_UX_DEPENDENCY_HANDOFF.md`; `backend-review/dependency-linking/README.md`; superseded Start-date clause noted above. |
| Historical visibility/deletion design | `docs/mobile-redesign/WEB_PARITY_HANDOFF.md`; `backend-review/subtask-planning/README.md`; validate current installation and known historical visibility limitations. |
| Native financial UI and finalization reference | `src/app/features/budget/WorkFinancialClearancePanel.tsx`, `CashReturnPanel.tsx`, `SettlementPanel.tsx`, `LiquidationSheet.tsx`. |
| Source refresh/provenance | `scripts/sync-web-core.mjs`; inspect `src/core/web` provenance and native adaptations before refreshing. |
| Project scope/phase and design constraints | `AGENTS.md`, `docs/mobile-redesign/`, `.agents/skills/eflow-mobile-product-design/SKILL.md`. Implementation completion is not user phase acceptance. |

Other relevant validation indexes, when those Web features are in scope:

- Recurring work templates: `src/core/web/app/features/tasks/validation/recurringValidation.ts:5`, `recurringTemplateError`: interval integer 1–365; daily/weekly/monthly frequency; nonblank title ≤200 characters; description ≤20,000; up to 100 nonblank criteria each ≤1,000; future first run; owner and reviewer distinct. Recurring configuration remains outside the selected native execution scope.
- Calendar and numeric primitives: `src/core/web/app/shared/calendarDates.ts`, `numericValidation.ts`; reuse their actual scheduled/historical-date and decimal/integer semantics instead of browser/device-local comparisons.
- Governance validation: `src/core/web/app/features/interdepartment-collaboration/validation/governanceValidation.ts`; retain revision, Office identity and existing governance writers rather than substituting ordinary project edits.
- Import/decomposition validation: `src/core/web/app/features/proposal-import/services/decomposition/hierarchyValidation.ts`, `manualPlanValidation.ts`, and `src/core/web/app/features/project-import/selectors/draftValidation.ts`; do not use import to bypass nesting, budget decisions, staffing or lifecycle guards.

### Finding server-only rules that are not captured locally

When authorized read-only backend access is available, inspect exact overloads instead of guessing from names. This example reads function definitions only; it performs no migration or business operation:

```sql
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as signature,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('eflow_project', 'reviewer'),
  ('eflow_project', 'guard_cash_route'),
  ('eflow_budget', 'cash_request_v2'),
  ('public', 'decide_petty_cash_liquidation_leader_review'),
  ('eflow_r7', 'require_completed_descendants'),
  ('public', 'get_liquidation_independent_review'),
  ('public', 'settle_accounting_liquidation')
)
order by n.nspname, p.proname, signature;
```

Also inspect the associated `pg_policies`, `pg_constraint`, `pg_trigger` definitions and effective grants for the exact tables/buckets touched by a proposed change. Historical migration files alone do not establish their current installed definitions. If read-only backend access is unavailable, list the specific unverified dependencies in the Web handoff; do not infer permissive behavior from the absence of a local file.

**Receiving-agent instruction:** read the actual referenced code, installed definitions and your Web repository instructions; implement only the authorized Web delta, preserve all existing server decisions, and report exact changes with PASS/FAIL/BLOCKED/NOT RUN evidence. If a prerequisite is missing or policy conflicts with installed behavior, name the exact function/scope/dependency and stop that dependent action rather than simulating financial or approval success.
