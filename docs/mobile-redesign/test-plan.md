# Verification and personal evidence contract

Use four scenario outcomes: **VERIFIED**, **FAILED**, **BLOCKED**, **NOT TESTED**. Phase status is separate: NOT STARTED / IN PROGRESS / IMPLEMENTED / AWAITING PERSONAL QA / ACCEPTED / FAILED / NEEDS FIX / BLOCKED. Record source implementation, unit tests, JS export, native compile, installation, launch, authenticated workflow, platform visual QA and user acceptance independently.

## Baseline and automated checks

Run from the root with existing dependencies; preserve the incoming lockfile edit. M0 changes documentation/build hygiene only, so no implementation-mirroring tests are added. Existing 37-suite/90-test regression coverage is the baseline; future phases add focused tests when behavior changes.

```powershell
npm run check
npm.cmd test -- --json --outputFile=artifacts/M0/jest-results.json
npm run build:android
npm run build:ios
npm run verify:release
```

Exports should run serially because the Metro export file-map cache is shared; native embedded bundle generation should also run after exports. `verify:release` writes the legacy `docs/NATIVE_RELEASE_AUDIT.json`; preserve its historical content and place each fresh result in the phase evidence folder/document. Audit production Hermes string tables for development credentials; no source secrets or actual credentials should be printed.

| Changed behavior | Required meaningful regressions | Phase |
| --- | --- | --- |
| Navigation/scope | Exactly five destinations/order by role; Admin rejection; child origin tab; More; cold/warm back; unsupported route/web allowlist; workspace switch pending destination | M1, M6 |
| Work/Inbox | Root versus node ID, personal versus Office route, date/time boundaries using existing Philippine work calendar, assigned-only visibility, unread/mark read, search/filter/scroll recovery | M2 |
| Task/nesting | Depth eight, lead/contributor/branch restrictions, unrelated/sibling/ancestor denial, stale revision/actor and missing capabilities; completed evidence/history unchanged | M3 |
| Reviews/evidence | Current server review eligibility, no self-review, ancestor fallback, Responsible Office Head, pending descendants; upload failure/retry/restart and immutable submitted evidence | M3–M4 |
| Communication | Thread scope, send failure/pending/confirmed, inaccessible attachments, exact task context and cleanup | M4 |
| Finance | Balance/receipt arithmetic, actor/Office scope, Head versus Accounting/independent review, idempotency/unknown response/restart, success plus refresh failure, missing RPC unavailable | M5 |
| State/security | Sign out/account swap clears cache/drafts appropriately, secure storage recovery, context-safe resumed links, no dev credentials/private keys in actual APK | All changed slices, M7 |

Existing representative tests: `navigation/__tests__/nativeNavigation.test.ts`, `NativeBottomNavigation.test.tsx`, `authentication/__tests__/adminSession.test.tsx`, `entryLinks.test.ts`, `personal-work/__tests__/workDestination.test.ts`, `tasks/__tests__/workRecovery.test.ts`, `budget/__tests__/financialReceipt.test.ts`, `useBudget.test.tsx`, shared secure-storage and source-integrity regressions. Passing these is not proof of SQL/RLS or native OS behavior.

## Safe fixture plan

M1 requires three dedicated, user-approved accounts: Head, Member and Accounting Staff. Verify each actual role and Office through the existing authorized sign-in/profile flow; never infer a role from an email address or an Auth user list. Passwords are entered by the operator in the emulator, are not recorded in evidence, and never enter source or build configuration. Admin credentials must never be used for mobile testing; mocked Admin-denial regressions do not represent an emulator actor.

For each of those three actors, M1 records login, all five role-specific tabs, authorized workspace context, More, project/back navigation and Profile access. Every result identifies actor, permanent role, Office, workspace, build hash and scenario outcome. Missing approved identities/access or backend prerequisites remain BLOCKED, separate from passing unit tests. After every phase, deliver the APK and a personal checklist identifying which dedicated role account reproduces each scenario.

M2-M7 expand this matrix to separate Member/Task Lead/Subitem Lead/Reviewer identities and a second Office. Use safe approved records to exercise assignment, recursive work, no-self-review, and cross-Office denial and selected-project access. No live financial transfer, destructive action, hosted data/role/credential/schema change or migration is authorized merely to prepare test fixtures.

Use a locally disposable environment or separately authorized labeled QA records on the sole approved hosted target. The operator supplies existing test account identities through a secure channel; no account/role/credential changes or production seed writes are part of M0. A local environment must be supplied with a compatible tested schema by its owner; do not replay historical/NW11 migrations to create one.

Required matrix: Member, Head of Lead Office, Head of Responsible Office, Accounting Staff, root Task Lead, branch Subitem Lead, selected cross-Office contributor, eligible ancestor reviewer, unrelated actor and unsupported Admin session. Contextual Leads may be existing permanent roles; do not create new roles. Include an authorized Office project and personal project, depth-eight tree, sibling branch, submitted evidence, pending descendant review, completed historical record and inaccessible record. Finance fixtures use safe non-live amounts, independent actors, known installed capabilities and an explicit transaction authorization before writes.

Until fixtures/access are available, mark mutation/denial scenarios BLOCKED. Do not manufacture a server-rejection pass using only mocked frontend permissions. Historical personal membership eligibility mismatch requires rechecking through authorized reads; do not implement the old delivery proposal or bypass eligibility.

## Native and visual matrix

For each retained screen capture platform, device/OS, dimensions/font scale/theme/reduced-motion state, source identity, build hash and exact steps. Use actual Android emulator/device and actual iOS simulator/device. Label RN Web previews as supplemental web evidence only. Capture login/startup, primary tabs, branch inspector, evidence/review, financial unavailable/unknown states, More and secondary screens when implemented.

Verify cold/warm launch without Metro, background/resume/restart, offline/slow/expired session, Android back and iOS swipe, safe areas, camera/file denial, keyboard, orientation/tablet, 100/150/200% text, screen reader names/order/focus, status words/contrast, theme changes and reduced motion. Account switching/context switching must never leak stale records or grant authority. Use bounded offline interruption tests only on dedicated safe fixtures.

M7 reports timings/render observations on named devices; no invented performance figures. Retained lifecycle histories, immutable evidence and financial balances must match authoritative before/after reads. Do not run real releases/postings/Office approvals to populate screenshots.

## Each phase Personal QA Package

Create `M{N}-personal-qa.md` with scope/actual files; visual before/after; exact commit plus dirty-tree/source hashes; command results/logs; APK path/ABI/build type/version/signature/SHA-256 or precise blocker; installation steps; safe role/fixture prerequisites; numbered actions and expected results; editable Pass/Fail/Blocked results; limitations; only genuinely captured screenshots/recordings; and pending decisions. Builds use `eFlow-Mobile-M{N}-QA-arm64.apk` (or explicitly named emulator ABI) and remain ignored by Git.

After completing implementation/checks/build attempt/evidence, stop for personal feedback. User acceptance is recorded with their explicit words/date. Bug fixes remain in that phase, get a new revision/build hash and rerun affected checks. Never infer acceptance from silence, passing tests or installation.
