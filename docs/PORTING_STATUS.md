# eFlow native conversion status — 28 October 2026

> Historical full-port status. The [v1 mobile scope](mobile-redesign/mobile-feature-scope.md) supersedes desktop-feature parity requirements. Use the [M0 package](mobile-redesign/M0-personal-qa.md) for this checkout's actual build/evidence status; old download links are not current artifacts.

**Current Android download:** [standalone build 3](../artifacts/eFlow-android-standalone-v3.apk). The native `document` lifecycle crash is fixed and the Expo development launcher remains removed. Native assembly, signature, manifest/DEX and embedded-startup checks passed; physical-phone startup remains user-owned verification. See [build-3 report](NATIVE_DOCUMENT_CRASH_2026-10-28.md).

Android and iOS are both targets. Native React Native screens use the existing hosted backend `ixnfphgjyelhckjwjkdv`; this is not a WebView. Mobile supports Head, Member and Accounting Staff. Admin is web-only.

**The native implementation has expanded; full one-to-one acceptance is not complete.** The user is doing manual/device testing. A JS bundle, a unit test and an installable APK are different evidence from a passed real workflow.

| Area | Implementation present | Remaining acceptance/configuration |
| --- | --- | --- |
| Account and navigation | Secure sessions, role/server checks, account entry links, responsive native navigation, workspaces/favorites; Admin rejection | Both OS account/link/large-text/permission checks; HTTPS domain association |
| Presentation | Source branding/fonts/motion tokens, animated startup/login, view skeletons, busy states, dialog/drawer/toast motion; persisted light/dark/device theme | Screen-by-screen device comparisons, including keyboard, zoom/large text and reduced motion |
| Projects | Main table/board/Gantt/calendar/dashboard/Offices/files/settings/readiness; groups, staffing, lifecycle; R9 sharing/redemption/removal, milestones/task links, saved views, drag/arrow task ordering, CSV/PDF exports | Live invitation acceptance, all view/action variants and native export acceptance |
| PDF import | Native positioned text/vector-rule extraction, shared budget/work layout parsing, persisted import sessions, office review, Qwen + LAYA and atomic publish receipt | User-owned native verification; no automated PDF walkthrough performed; iOS Swift compilation still needs Xcode |
| Tasks/personal work | Existing metadata/scheduling/staffing/progress/evidence/review/nested-work flows; personal members/shares/removal/shortcut/activity | Personal eligibility server fix must be deployed before acceptance; remaining nested action parity still needs comparison |
| Finance | Annual Q1–Q4-capable sections and fiscal controls, task funding/caps, cash request/correction/release/acknowledgment/liquidation/review/settlement, pending allocation decisions, authorized Office scope and queue filters | User-owned full conservation/retry/role walkthrough; source bulk queue controls and remaining nested variants still need comparison |
| Financial output | Journal detail, balanced adjustment, mappings/audit, CSV/PDF financial and journal exports; assigned-review package-only route | Real itemized receipts, independent approval versus posting, cross-Office permissions and export acceptance |
| Communication | Direct/task/standing Office chat, retained message identity and history pagination; native foreground WebRTC calls; announcements; unified review/update inbox | Real account-to-account/media checks; STUN/TURN for remote networks; background incoming-call integration not implemented |
| Push | Device registration/settings/tap routing plus isolated registry/outbox/dispatcher source package | **Not live:** needs reviewed backend deployment, protected dispatcher schedule, EAS ID, FCM/APNs credentials and actual device delivery checks |
| Team, reports, settings | Office member/invitation lists, profile/PDS processing, Office access exceptions, supervision/intelligence/coaching, report lenses/CSV/PDF, account preferences/password/theme | Live invitation/PDS/member-inspector and remaining report/view comparisons |
| Help/Live | Native PCM modules, VAD/silence/progressive queue, existing Help knowledge/record scope, Kitten playback and interruption controls | User-owned real microphone/audio/latency tests; AI gateway must be reachable |

Read [current implementation handoff](REMAINING_PARITY_IMPLEMENTATION_2026-10-28.md), [manual walkthrough](MANUAL_MOBILE_VERIFICATION.md) and [delivery receipt](DELIVERY_RECEIPT_2026-10-28.md). The isolated backend proposals are documented in `delivery/README.md`; no schema/RLS/history/credential changes were applied by this native pass.

`WEB_CORE_MANIFEST.json` records copied headless source and adapter review. Copied modules alone are not proof of native reachability or action parity. Historical preview screenshots and older development APKs do not establish acceptance of this build.
