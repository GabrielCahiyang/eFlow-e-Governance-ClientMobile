# M7 subtask assignment picker — build 65

Authorized scope: implement the reviewed subtask assignment recommendation in Mobile. Personal acceptance is PENDING; no phase is accepted or advanced.

As an actor currently authorized to staff a subtask, I need to choose a Lead and contributors from the server-authorized work directory, with the nearest team first, without having to add a specialist to the root Task contributor list.

## Reviewed source and delta

- Mobile main/working base: `3af48f8175005518356b6adfc186a512acf9457f`; working tree was clean before this slice.
- Canonical Web main: `4d6163e61f2675c60d3b8de7d2ee42bb932c6bae`, matching the clean local Web checkout and `git ls-remote origin refs/heads/main` at review.
- Read Web nested-work staffing selectors/components and `supabase/migrations/20261118091500_active_subtask_planning_lock_and_direct_task_staffing.sql`. Its authorized snapshot includes eligible project/Office candidates and historical assignments; branch staffing does not require root contributor membership. Repository migration contents do not establish hosted deployment availability.
- No Web changes, generated-core refresh, schema/RLS/grant/account changes, live fixture writes, deployments, pushes or merges.

| Delta | Status | Evidence |
| --- | --- | --- |
| Authorized assignment directory and save-time capability/eligibility/revision checks | Existing behavior preserved | `WorkEditorSheet.tsx`, generated `selectors/staffing.ts` and `services/workTreeService.ts` |
| Parent team → Task team → other eligible people | DONE IN SOURCE / automated checks passed | Native `subtaskPeopleOptions.ts`; both subtask Lead and contributor pickers |
| Eligibility filtering and selected historical identity retention | DONE IN SOURCE / automated checks passed | Missing/false/conflicting eligibility never becomes a selectable new assignment; retained history is disabled |
| Searchable group headers and empty results | DONE IN SOURCE / automated checks passed | Shared `Choice` optional `Option.group`; empty group headings disappear during search |
| Authenticated Android/iOS staffing and Web consistency | BLOCKED | Dedicated approved accounts, safe assignment fixtures and device sessions required |

## Native adaptations and exact presentation

Reuse the existing eFlow `Choice`/`Sheet`, theme, typography, search, staged confirmation, keyboard handling and reduced-motion behavior. The Expo overview/native UI/UI skills were consulted; this slice extends the existing searchable multi-selection control rather than migrating the application's control system. No native dependency or navigation changes.

Both subtask staffing fields use these groups in order, omitting empty groups:

1. **On parent subtask** for readable immediate-parent Lead/contributors on nested work.
2. **On this task** for the remaining root Task Lead/contributors.
3. **Other eligible people** for remaining entries explicitly eligible in the authorized directory.
4. **No longer eligible** for already selected historical identities only, disabled with **Unavailable for assignment**.

Names sort within groups and each identity appears once. An unreadable/missing parent never creates candidate identities or discloses its membership. The appointed Subtask Lead is excluded from the contributor picker. No people are automatically selected and no Task contributor membership is changed. Existing root Task staffing presentation is retained. Subtask creation and its existing post-create staffing prompt remain unchanged.

The broad group deliberately does not claim all entries are existing project members: latest Web source supports direct assignment of eligible members of an authorized participating Office. Mobile neither queries a global directory nor implements local auto-enrollment. It presents only the supplied authorized candidates and uses the existing checked command. If the hosted contract supplies fewer people, Mobile shows that permitted subset.

Search matches names/descriptions and retains selections across filtering. Group headings expose the accessibility header role; row checkbox/radio and disabled states remain intact. **No options found.** appears for empty results. Confirm applies selection to the form; only saving invokes the existing command. A fresh server snapshot is checked before save; revoked eligibility or capabilities block the write. Unknown command outcomes retain the existing recovery/receipt behavior.

## Verification boundaries

Focused automated regression evidence is in `artifacts/M7/subtask-people-tests.json`; TypeScript/Metro, platform exports and APK evidence are recorded in the matching M7 personal QA entry. Tests cover nested ordering, specialists outside the task team, deduplication, absent/false/conflicting eligibility, restricted parent information, unchanged root contributors, staged search selection, disabled history, save-time revocation, existing permissions, recovery and post-create staffing.

No signed-in actor/server-confirmed permanent role, Android staffing workflow, iOS native compilation/workflow, native theme/font-scale/screen-reader/reduced-motion/keyboard acceptance is claimed. Use the role-specific checklist in `M7-personal-qa.md` on Android and iOS separately. Existing exports or automated rendering do not satisfy native acceptance.
