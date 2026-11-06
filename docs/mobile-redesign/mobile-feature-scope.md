# Mobile product and feature scope

M0 scope contract for personal review, 4 November 2026. Classification is the v1 decision; phase implementation/Android/iOS verification remain separate in `phase-progress.md`. Existing source availability is not acceptance.

| Capability | Decision | Native v1 destination and boundary | Phase |
| --- | --- | --- | --- |
| Personal overview | Simplify | Home: assigned work/deadlines and actionable attention; no long analytics dashboard | M2 |
| Assigned root tasks and nested subitems | Keep | My Work: Today, Upcoming, Overdue, Completed; retain Office/personal/project and exact root/node identity | M2–M3 |
| Project discovery/recent/favorites/search | Keep | Projects with authorized workspace context and compact status filter | M3 |
| Project Main Table | Simplify | Grouped task rows; status/deadline/responsibility without horizontal table scrolling | M3 |
| Board | Simplify | Optional status grouping using the same tasks; no desktop editor, drag ordering or inferred permissions | M3 |
| Calendar/deadlines | Simplify | Agenda/due-date list in My Work/project context | M2–M3 |
| Project Dashboard | Simplify | Brief progress/status overview; preserve denominator/status meaning | M3 |
| Task/subitem inspector and recursive hierarchy | Keep | Drill-down/breadcrumbs through authorized depth eight; no eight-level card indentation | M3 |
| Status/progress, completion and contextual leadership | Keep | Server-capability-driven execution, contributors, permitted child creation/branch management | M3 |
| Evidence/attachments/camera/files | Keep | Task/subitem submission and review; immutable history, upload/retry/error states | M4 |
| Root/subitem reviews and changes requested | Keep | One Inbox action experience and contextual inspector; no self-review/authority changes | M2–M4 |
| Task activity/work updates | Keep | Contextual chronological activity and comments | M4 |
| Notifications, unread and assigned independent reviews | Simplify | Unified Inbox, Needs action/Updates filters, exact record routing; no duplicate review workspace | M2, M5 |
| Project/task/direct conversations | Keep | More → Messages and contextual entry points; text and authorized attachments | M4 |
| Announcement reading | Keep | More → Announcements; authoring/administration web-only | M4 |
| Office/team and project people | Simplify | More → Office Team and project context; relevant people/appointments only | M4, M6 |
| Head Office identity/access | Web-only | Distinct Head context and authorized web handoff; no global Admin surrogate | M1, M6 |
| Authorized task funding and budget totals | Simplify | Task → Funding and Head Office summary; no annual financial workspace | M5 |
| Cash request/status, receipts, liquidation | Keep | Existing backend-supported and authorized commands only; amount/provenance and durable receipts | M5 |
| Accounting release/acknowledgment/independent review/settlement | Simplify | Accounting assigned queues/detail; roles/appointments remain independent | M5 |
| Office petty cash | Simplify | Requests/receipts/settlement within focused cash scope when installed/authorized; no replenishment/configuration workspace | M5 |
| Profile, appearance/security/notifications | Keep | More → Profile/Settings; no role/account administration | M1, M6 |
| Lightweight contextual eFlow AI Help | Defer | Optional More → Help only when supported; clear unavailable state, no fake answers | M6 evaluation |
| Voice/AI Live, phone/video calls | Defer | Initial v1 excludes full Live and calls; messages remain | Post-v1 |
| Simple project/personal workspace creation | Defer | Existing-project execution first; no creation wizard; existing personal work remains supported | Post-v1 |
| Full project setup/activation/funding configuration | Web-only | Authorized project-context handoff; planning records read-only where required | M3, M6 |
| Gantt/dependencies/advanced timeline | Web-only | Explanation and authorized web handoff | M3, M6 |
| PDF import/reconciliation/AI decomposition | Web-only | Web handoff; evidence files remain viewable | M3, M6 |
| Groups/columns/bulk ordering/saved-view builders | Web-only | Retain group labels/simple filters; editors on web | M3, M6 |
| Publication/governance/project invitations/access terms | Web-only | Preserve records/permitted read context; administration on web | M3, M6 |
| Invitation/activation recipient links | Simplify | Secure account entry/recovery; project invitation administration web-first; tokens never confer authority | M1, M6 |
| Annual budgets/fiscal setup/account mapping/journal authoring | Web-only | Focused summaries remain; no configuration/posting editor | M5, M6 |
| Audit explorers/bulk exports/detailed analytics/reports | Web-only | Preserve records/backend; native task activity/provenance remains | M5, M6 |
| Team intelligence/skills/coaching/performance analysis | Web-only | Safe handoff replaces native analytics destinations | M6 |
| Admin/global users/permissions/lockout/migration | Web-only | Reject Admin sign-in; no Admin tab/menu or mobile role changes | All |

## Invariants and authorization

Permanent roles remain Admin, Head, Accounting Staff and Member. Admin is web-only; contextual Task/Subitem Lead appointments never elevate a permanent role. Preserve Lead Office Head versus Responsible Office Head, cross-Office selected-project staffing, Task Lead child/contributor authority, Subitem Lead branch authority, removal/delegation restrictions and maximum depth eight.

Keep no-self-review, eligible ancestor fallback, Responsible Office Head root review, outstanding-descendant review completion restrictions and immutable authorship/decisions/evidence/financial history. Existing direct `complete_subitem` contracts must not be replaced with invented review transitions; authoritative records/capabilities determine eligibility and parent final review. Check detailed current web behavior before M3/M4 implementation.

Navigation is a product filter over server permissions, not authority. Revalidate actor/session, workspace kind, Office, project, root/node and revision at action time. Missing/expired capabilities produce denied/unavailable states. An independent reviewer does not automatically become a settler or journal author.

Head approval, Accounting execution, independent review and journal authority remain separate. Preserve financial units, balances, request IDs, evidence provenance, receipt recovery and unknown-outcome handling. Never interpret timeout/unavailable as successful release/payment/settlement or retry through a less guarded RPC.

Hosted target is only `ixnfphgjyelhckjwjkdv`. M0 does not verify installed backend functions. NW11 reconciliation remains external: no schema, migrations, RLS, grants, accounts or credentials are changed. Missing functions require an unavailable state and exact prerequisite; M5 can be UI-ready / integration-blocked, not accepted.
