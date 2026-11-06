# Phase progress and acceptance gates

Updated 4 November 2026, Asia/Singapore. **M0 was accepted. The user explicitly authorized M4. M1–M3 personal tests remain pending.**

| Phase | Status | Source implementation | Android verification | iOS verification | Personal acceptance |
| --- | --- | --- | --- | --- | --- |
| M0 | ACCEPTED | Contract/audit/specification, baseline package and reported login-connection bugfix; no redesign | Both exports pass; original ARM64 artifact verified; corrected x86_64 local-gateway QA APK installed/launched; authenticated sign-in NOT TESTED by agent | JS export verified; native build/workflows BLOCKED on Mac/Xcode/device | Accepted 4 November 2026: "proceed to m1" |
| M1 | READY FOR PERSONAL QA | Native role-aware shell, stacks/context and shared design system. Type check and 129 tests passed. | ARM64 and x86_64 APKs verified. x86_64 installed and launched. Restored LEDIPO Head navigation verified. Fresh login and Member/Accounting device tests pending. | JS export verified. Native compile and device workflows BLOCKED on Windows. | Awaiting explicit acceptance. [M1 QA package](M1-personal-qa.md) |
| M2 | READY FOR PERSONAL QA | Home, unified assigned work and Inbox, exact work links. Type check and 137 tests passed. | Combined ARM64 and x86_64 APK verified and installed on x86_64. Head Home/My Work/Inbox and an exact notification task link verified. Fixture-based workflows pending. | JS export verified. Native build and workflows BLOCKED on Windows. | Awaiting acceptance. [M2 QA package](M2-personal-qa.md) |
| M3 | READY FOR PERSONAL QA | Workspace-scoped Projects, compact task groups and exact branch inspectors. Type check and 144 tests passed. | Combined ARM64 and x86_64 APK verified and installed on x86_64. Head project, root and level-one child with recorded history and Back verified. Writable fixtures pending. | JS export verified. Native build and workflows BLOCKED on Windows. | Awaiting acceptance. [M3 QA package](M3-personal-qa.md) |
| M4 | IMPLEMENTATION-COMPLETE / QA-PENDING | Retained evidence, review, activity, text and read-only context UI. Retest passed 162 automated tests. | Standalone code 10 installed. LEDIPO Head read-only checks verified. Announcements RLS cycle, Office gateway and live fixtures blocked. | JS export verified. Native build and workflows BLOCKED on Windows. | Explicitly unaccepted. [M4 retest checklist](M4-personal-qa.md) · [Backend proposal](M4-backend-proposal.md) |
| M5 | IMPLEMENTATION-COMPLETE / QA-PENDING | Focused Accounting, read-only project totals, contextual Task/Subitem Funding and exact finance routing. 168 automated tests passed. | Code 11 standalone installed. LEDIPO Head Project/Task/Subitem Funding verified read-only. Accounting role, live fixtures and financial writes BLOCKED. | JS export verified. Native build and workflows BLOCKED on Windows. | Awaiting explicit acceptance. [M5 QA package](M5-personal-qa.md) |
| M6 | IMPLEMENTATION-COMPLETE / QA-PENDING | Focused inspectors, compact work navigation and retired desktop presentation. 172 automated tests passed. | Code 12 standalone installed. LEDIPO Head read-only navigation, exact task/subitem, Activity and Back verified. Accounting and live fixture workflows BLOCKED. | JS export verified. Native build and device workflows BLOCKED on Windows. | Awaiting explicit acceptance. [M6 QA package](M6-personal-qa.md) |
| M7 | QA PACKAGE READY / ACCEPTANCE PENDING | Feature scope carried over from M6. Build 14 restores exact subitem funding access from older Inbox notices. 173 automated tests passed. | Build 14 installed and the affected Inbox route verified. Read-only Head navigation, workspace boundary, offline read behavior and visual smoke checks verified on build 13. Role and fixture workflows remain blocked. | JS export verified. Native build and workflows BLOCKED on Windows. | Awaiting explicit acceptance. [M7 QA package](M7-personal-qa.md) |

Existing pre-redesign source and historical APK records are baseline material, not phase implementation or acceptance. M0 completion refers to the contract package; build/device blockers remain explicit.

Integration prerequisites apply to their own workflow verification. M5 and M6 were authorized and await personal acceptance. M7 was authorized. Personal acceptance remains pending. [Assessment](M0-M4-feature-reduction-audit.md) · [Revised plan](implementation-plan.md).

| Dependency or acceptance item | Current evidence | Consequence / owner |
| --- | --- | --- |
| Android standalone build | VERIFIED. M4 retest code 10 combined ARM64 and x86_64 release, signature, embedded source and credential audit. | x86_64 installed and launched. Physical ARM64 QA pending. [M4 retest checklist](M4-personal-qa.md) |
| Public backend configuration | Approved public routing RPC read verified; its published Cloudflare hostname no longer resolves. Explicit local gateway and ADB forwarding verified for emulator QA; [current retest package](M0-login-fix-qa.md) | Public gateway still requires owner maintenance; local QA depends on this PC's gateway/ADB. Actual sign-in NOT TESTED by agent. No private keys copied to mobile or hosted settings changed |
| Android device | `eFlow_M0_QA` API 36 emulator runs M4 x86_64 and restored the provided LEDIPO Head session. | Office attention, task and subitem history, and text conversation navigation VERIFIED. Fresh sign-in and other roles pending. |
| iOS | Windows host; no Mac/Xcode/iOS simulator/device | Native compilation and device acceptance BLOCKED; equal target remains pending |
| Safe accounts/fixtures | User deferred provisioning. Read-only checks used the existing `bplo.head@gmail.com` session, role `head`, LEDIPO. | Fresh login, Member/Accounting Staff, second Office, independent actors and later workflow fixtures pending. |
| Hosted finance/NW11 | Source contracts inspected; installed capability/deployment evidence unavailable | External reconciliation affects live finance workflows only. The M5 UI can be complete with those workflows still integration-blocked. |
| Personal membership | Historical eligibility mismatch; not retested | Server eligibility remains authoritative; no old delivery proposal applied |
| Gateway/push/AI | Local gateway health 200, malformed login 422, protected Admin route 401 from emulator. Retired public tunnel DNS failed | No authenticated/AI/push workflow verification; full voice/Live/calls remain deferred |
| Canonical web sync | Selected current files fetched at pinned SHA; old generator paths point to another machine | No M0 sync; use validated checkout and reviewed native adaptations later |
| Scope decision | Current source retires legacy subitem review discovery; master brief mentions subitem decisions | M0 review confirms existing direct-completion/parent-review contracts; no new review stage assumed |

On 4 November 2026, Asia/Singapore, the user accepted M0 with **"proceed to m1"**, then authorized M2 with **"for now proceed to m2"** while explicitly deferring M1 personal testing. The user then authorized M3 with **“proceed to m3.”** The user authorized M4 with **“proceed to m4.”** M1–M3 personal acceptance remains pending.


## M7 visual revision — 6 November 2026

The user authorized applying the supplied eFlow logo's navy/blue palette throughout the mobile project. This is an M7 visual revision; no phase was accepted or advanced. Shared native tokens and remaining teal presentation now use the logo palette, with accessible light/dark foregrounds and preserved status meanings. `npm run check`, 182 tests in 60 suites and separate Android/iOS Hermes exports passed. The current APK and platform-specific checks are recorded in [M7 personal QA](M7-personal-qa.md). Personal acceptance remains **PENDING**.


## M7 build 18 fresh-login regression and build 19 repair — 6 November 2026

The user reported the secure-sign-in connection error on build 18. The visual-release build omitted the hosted-sign-in opt-in flag, selecting the retired gateway whose public hostname fails DNS. Earlier restored-session display checks did not verify login, and the build 18 hosted-sign-in description was incorrect. Build 19 makes the existing protected Supabase endpoint the native default, requires explicit gateway QA selection, rejects invalid modes and adds a production transport preflight to both normal JS exports. 190 tests in 61 suites and both exports passed. Live no-credential guards returned expected responses; no real-account login or hosted mutation was performed. [Current APK, evidence and per-role checklist](M7-personal-qa.md). Personal acceptance remains **PENDING**.


## M7 pending source edits / APK hold — 6 November 2026

The user requested the Cash request review-note clutter fix and explicitly instructed: **do not build the updated APK; wait for their command**. The review form, duplicate-warning layout and bottom navigation clearance are corrected in source; TypeScript/Metro, 193 tests in 62 suites, both JS exports and the export credential audit passed. Build 19 remains the latest installable and does not include this queued fix. Keep APK assembly/packaging on hold for queued changes until the user explicitly requests a build. M7 is not accepted. [Pending layout QA](M7-personal-qa.md#pending-source-change--receipt-review-note-layout).
