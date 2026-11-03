# Personal project membership finding — 28 October 2026

**Status: observed in the hosted backend; no database or web source change applied.**

In the native web preview, Cheryl Gallo selected the existing personal workspace `Test1` and created the labeled QA project `QA Mobile — Equipment checkout checklist · 28 Oct 2026` through the existing `r3_create_personal_project` RPC.

Creation completed once. The project snapshot displayed:

- Workspace owner: Cheryl Gallo.
- Participation: active.
- Eligible for assigned work: No.
- The native eligible lead picker consequently had no candidates.

No task, cash request, share or membership change was submitted after discovering this mismatch. The QA project is retained as evidence. Native UI does not substitute the owner for an ineligible person or grant extra authority. It disables task creation when the server returns no eligible members and directs the user to Members & access terms.

## Source investigation

The R7 personal `eflow_r7.project_members` implementation in the web repository's `20261008035748_r7_project_members_and_nested_work.sql` emits each person's profile `org_id` as the display `office` but checks personal eligibility with `eflow_r7.member(p_project, null, p.id)`.

The later R9 `eflow_r7.project_members` wrapper in `20261008081855_r9_project_access_lifecycle.sql` recomputes eligibility using `(m->>'office')::uuid` for every member, including personal projects. That passes an Office ID into a personal membership check. The baseline personal branch requires null Office context. This is a source-based explanation consistent with the observed active-owner/ineligible result; the exact deployed function definition has not been introspected in this native pass.

## Proposed backend remediation

In a separately reviewed deployment, preserve the display Office affiliation while selecting eligibility context by project kind: null for personal membership, the participating Office for operational membership. Apply the same distinction to any read-access/grant checks that consume the display Office field.

Before deployment, regression cases should cover active owner and active member; viewer read-only access; expired/ended/revoked membership; accepted guest; recipient-bound viewer/member grants; and operational cross-Office membership. Verify the snapshot and actual commands agree and that personal work still grants no Office or accounting authority.

This port's contribution rules prohibit changing database schemas, RLS, deployed history or backend contracts to make native UI work. Therefore no live migration or permission bypass was attempted. A source fix and deployment receipt are required before calling the full personal task flow accepted.

## Prepared native handoff proposal

A guarded exact-expression fix is now prepared at `delivery/personal-eligibility/REVIEW_ONLY.sql`. It has not been applied or used to bypass native eligibility. The current source handoff and deployment prerequisites are in `REMAINING_PARITY_IMPLEMENTATION_2026-10-28.md` and `delivery/README.md`.
