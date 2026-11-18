# M7 custom-role alignment — build 64

Authorized scope: implement the Web custom-role assignment/permissions contract in the existing native app. Personal acceptance remains PENDING; no phase advancement or hosted changes.

As an active Head, Member or Accounting Staff account assigned a custom role on Web, I need Mobile to show that role and resolve the same permission rows and individual overrides, subject to current account and record authority.

## Reviewed source

- Web checkout: `C:/Users/james/projects/eflow-e-Governance-Project`, clean HEAD `3f053acca80841e15740344f422db6bb596f5198`.
- Mobile Git base: `1d1a2ba`, preserving all prior uncommitted slices and unrelated work.
- Refreshed only `app/features/permissions/selectors.ts`, `app/features/permissions/types.ts`, and `app/types.ts` using `EFLOW_WEB_SOURCE` with `scripts/sync-web-core.mjs`. Provenance is recorded in `docs/WEB_CORE_MANIFEST.json`. No manual generated-core edits.
- Permission constants match the reviewed Web file after whitespace normalization. Web resolver uses the assigned key's persisted rows, unpersisted fallback permissions from its base role, and then individual user overrides. Persisted base-role rows are not merged into the assigned custom role.

| Delta | Status | Source/evidence |
| --- | --- | --- |
| Assigned custom definition, permission precedence and account label | DONE IN SOURCE / automated checks passed | `AuthProvider.tsx`, `assignedCustomRole.ts`, canonical generated resolver; Profile and More |
| Live assignment/permission/definition refresh and fail-closed actions | DONE IN SOURCE / automated checks passed | Scoped account, role, custom definition and override listeners; reconnect/resume and active fallback |
| Open record/draft continuity during access recheck | DONE IN SOURCE / automated checks passed | Display-only destination visibility in AuthProvider, MobileNavigator and MobileContent; draft regression |
| Native role administration | Web-only, intentionally retained scope | Three Mobile base roles remain unchanged; Admin and administrative routes remain blocked |
| Authenticated Android/iOS role-change acceptance | BLOCKED | Approved dedicated role accounts, fixtures and devices required |

## Native adaptations

`assignedCustomRole.ts` reads only the current actor's assigned definition. It performs no role-management writes and does not load the full administrative catalog. A missing/inaccessible definition, unsupported base role or definition/profile base-role mismatch never silently falls back to base permissions. An unassigned account does not query `custom_roles`.

The account access signature includes the assigned definition and resolved permissions. Same-base reassignment and renames invalidate stale display caches. Assignment changes rebind role/definition subscriptions. The existing active fallback interval (60 seconds) now covers all supported accounts, supplementing Realtime, reconnect and foreground checks. [Supabase documents that DELETE events cannot be filtered](https://supabase.com/docs/guides/realtime/postgres-changes); periodic/foreground reconciliation covers missed events without expanding table subscriptions or changing publication configuration.

At refresh start, authoritative permissions and action readiness are invalidated. Older permission-check callbacks consult the current verified permission set and actor. Failed network checks may retain readable identity/record context but never action authority. The display-only `canDisplayDestination` retains an already mounted destination during a check, preserving local drafts; new protected navigation and consequential actions use current `can` / `AccountActionAccess`. Confirmed revocation updates destination visibility and removes the inaccessible record. Record-specific server capability checks remain in place.

Profile and More show the verified custom name using existing cards, chips and typography. Profile also identifies the base role. Permanent roles still determine native navigation scope; labels never confer Head, Accounting or contextual Lead authority. Role creation, editing, assignment and advanced identity/access administration remain Web workflows. Retired native administrative components and their unused generated services were not expanded or imported for this slice.

## Exact shared prerequisites

The inspected Web migration `supabase/migrations/20261117052207_admin_custom_roles.sql` defines `profiles.custom_role_key`, `custom_roles(key,label,description,base_role)`, role-key permission rows and custom-definition publication/access. Mobile requires authenticated SELECT access to the assigned definition and existing own profile, role-permission and user-override reads. No migration was applied and hosted schema/publication availability was not independently verified. The only authorized hosted target remains `ixnfphgjyelhckjwjkdv`.

Missing prerequisites produce unavailable access and Retry / Web Admin guidance. Do not apply historical/pending migrations or change RLS to make a check pass.

## Verification boundary

Current focused checks: 39 passing tests in 9 suites, TypeScript and 9 Metro checks. Tests cover all three custom base roles, exact custom/default/override precedence, unavailable definitions, same-base reassignment, rename/removal, offline revocation, stale callbacks, sign-out races, periodic recovery, Admin rejection, native administration boundaries and mounted-record draft retention.

A broader run reported 775 passed and 18 failed tests across 168 suites. The failures are in existing MobileNavigator (8), NativeBottomNavigation (7), mobileScope (2) and WorkTreePanel (1) expectations: older toolbar/Account & settings/workspace navigation, five-tab expectations versus Reviews, and the former linked Subtask Files shortcut. The latter scope/bottom-nav cases use unchanged source; navigator/work-tree tests mock authentication. They were not rewritten as part of this custom-role slice. The final focused run includes the subsequent destination-continuity adjustment; the full suite is not reported as passing.

Build and credential evidence is recorded separately in the phase build64 evidence and release-audit JSON. Android compilation/APK validation and native JS exports are separate from signed-in Android or iOS workflow verification. Both native device/platform acceptance and personal acceptance remain pending.
