# Native visual and component specification

M0 design contract for review, not rendered screens or visual acceptance. Current source is desktop-derived cards/tables, 12 project tabs, 10–11 budget tabs, a duplicated More/sidebar menu and route-name-based selection. Proposed source emphasizes compact rows, contextual inspectors and five stable destinations. No monday.com identity/assets are used.

## Foundation and ownership

Extend existing `src/app/components/ui/theme.ts`, `Typography.tsx`, `Appearance.tsx`, shared motion and mark components; do not add a competing theme or replace navigation libraries. Canonical reference is web commit `b8d9fd8a7195b50fe7446b45092c9528586b0778`, especially `src/styles/foundation-tokens.css`, project-table status selectors, EFlowMark and motion files. Native SDK is Expo ~58.0.19, React Native 0.88.0; version-check native control availability during M1 rather than assuming packages/APIs.

## M7 logo palette revision — 6 November 2026

The user's supplied eFlow logo authorizes this mobile palette revision. The image's dominant solid colors are navy `#00006b` and blue `#0073ea`. This supersedes the earlier teal color reference in this document. It is a reviewed native visual adaptation; no web comparison/refresh or generated `src/core/web` edit was performed.

| Semantic token | Light | Dark |
| --- | --- | --- |
| Primary / on primary | #00006b / #ffffff | #94baff / #08142f |
| Canvas / surface | #f5f7fc / #ffffff | #0a1028 / #141e3c |
| Primary text / secondary | #161b35 / #505c77 | #eef3ff / #bcc8e2 |
| Muted label / separator | #5e6b85 / #d6deed | #9eaecc / #35466b |
| Selected background / text | #e8edff / #00004f | #243460 / #dce7ff |
| Information background / text | #e7f2ff / #0067d3 | #172f50 / #85c3ff |
| Positive background / text | #e5f5ee / #166749 | #173c30 / #a2e8c6 |
| Warning background / text | #fff2d8 / #795008 | #443818 / #f6d58b |
| Negative background / text | #fde9e8 / #c92a3a | #452826 / #ffc2b8 |
| Review background / text | #f0eafa / #67459e | #35264a / #dbcaff |

`theme.ts` remains the single palette source. The exact bright brand blue is used in the mark and light hero gradient; the slightly darker information blue makes small text readable on tinted surfaces. Dark mode uses lighter blue accents against navy surfaces. Hero, glass, navigation and ambient colors resolve shared theme tokens, including opacity, rather than a second hardcoded teal palette. Startup, form placeholders, loading states, tables, neutral deadline chips and existing export styles use the same theme. Shared chooser, sheet-close, search, empty/error and toast icons resolve the active palette explicitly rather than relying on static style remapping. Native Android `colorPrimary` is persisted through Expo `primaryColor`. Deadline/status hues keep their meanings; decorative identity accents use navy/blue.

An automated contrast regression checks normal text at 4.5:1 or better for labels on canvas/surface, buttons, selected/information/status pairs and white text at each hero gradient stop in both themes. This is numerical verification, not device accessibility acceptance. System/light/dark preference persistence, source motion timings, reduced-motion handling and logo geometry remain as implemented. Static legacy styles continue through the existing appearance adapter; new controls resolve explicit theme colors.

Use bundled Figtree 400/500/600/700/800. Proposed native ramp: screen title 26/32 semibold, section heading 19/26 semibold, task/body 15/22 regular or medium, metadata 13/18 regular, supporting caption 12/16. Font scaling stays enabled; use minHeight/padding and wrapping, not fixed-height text. Numbers use tabular presentation where supported for money/progress. Native 15px body is an intentional readability adaptation of web 14px base; web 22px title need not be copied as a phone screen title.

Extend existing 4/8/12/16/24/32 spacing with 20 only where repeated. Phone edge inset 16; list row vertical padding 12, horizontal 16; title/meta gap 4; sections 24. Controls radius 8, grouped surfaces 10, sheets/dialogs 14; status capsules use full radius. Prefer separators and shared surfaces over nested bordered cards. Elevation only for overlays/sticky controls, matching source restraint. Retain recognizable existing Lucide icon vocabulary (20–24px) and exact six-path eFlow mark; avoid decorative icon/font dependencies.

Status hue references from web: pending_assignment #7b8495, todo #579bfc, in_progress #f4ae36, for_review #8b6be8, changes_requested #df526d, completed #00b97d, cancelled #76808c. These are indicator hues, not automatically accessible text backgrounds. Pair every color with a textual status; semantic chip foregrounds must pass contrast in each theme. Do not rename server status enums or imply every subitem has a review step.

## Shared component plan

| Component/owner | Specification and states | First phase |
| --- | --- | --- |
| App shell / navigation feature | Five tabs, current screen/context header, small mark, unread badges; per-tab child stacks and native back | M1 |
| Workspace switcher / workspaces | Office/personal badge, current name, authorized options sheet; loading/denied/error without authority gain | M1 |
| Screen/Header / existing ui | One title, contextual back and at most one primary action; safe-area and keyboard-aware body | M1 |
| Button / existing ui | primary/secondary/quiet/destructive; busy/disabled; accessible label; min 48dp Android/44pt iOS targets | M1 |
| Sheet/Menu / existing ui | Contextual filters/actions/composition; focus/dismiss/back/keyboard; preserve dirty draft as required | M1 |
| WorkRow / personal-work & tasks | Leading status indicator; two-line title; project/Office/root context; due date and responsible person; optional child count | M2 |
| ProjectRow / projects | Title, Office/personal context, status, concise progress, separate accessible favorite control | M3 |
| StatusChip / existing Status | Text + semantic tone, compact padding, no status-derived permission logic | M1–M3 |
| Empty/Error/Skeleton / existing ui | Per-view row skeleton; meaningful no-work/filtered-empty/denied/unavailable/error/retry; preserve loaded data during refresh | M1–M4 |
| BranchBreadcrumb / nested task feature | Root + current parent; collapse middle ancestors into menu; direct-child list; depth never creates horizontal overflow | M3 |
| TaskInspector / tasks | Status/due/person summary, description, child work, activity, evidence/Funding context; one current primary action | M3–M5 |
| EvidenceComposer / tasks + platform files | Camera/document picker, file previews, upload state, cancel/retry, durable command recovery and immutable submitted evidence | M4 |
| ReviewPanel / reviews | Evidence and current decision authority, approve/return with required reason; stale/no-self-review/denied/error states | M4 |
| MessageRow/Composer / communication | Thread/context, unread, keyboard-safe text entry, pending/sent/failed; no call/Live controls | M4 |
| FinancialRow/Detail / budget | PHP amount, status, actor/provenance, evidence, authorized action; explicit unknown outcome and refresh/recovery | M5 |
| MoreRow / navigation | One secondary destination per row; native disclosure; sign out separate from workflow actions | M1, M6 |

Keep domain-specific rows in their features until reuse justifies extraction. Shared ui must not import task/finance services. Consult Expo native-control skill/package compatibility at implementation time, retaining existing controls when an appropriate supported replacement is unavailable; do not add @expo/ui/Expo Router just for the specification.

## Screen-by-screen composition

| Screen | Order from top to bottom | Primary interaction / dependencies |
| --- | --- | --- |
| Startup/login | Existing branded readiness → sign-in, error/retry/remember preference | Sign in; preserve actual font/session readiness and existing motion |
| Home (Head/Member) | Header/context → brief attention summary → due/returned work rows → relevant decisions | Open exact work/review; no dashboard wall |
| My Work | Title/search → date categories (Today/Upcoming/Overdue/Completed) → compact root/subitem rows | Open inspector; one optional filter sheet for project/status/context |
| Inbox | Title → Needs action/Updates filters → compact decisions/updates with unread | Open exact record; mark read without losing position |
| Projects | Workspace/title/search → recent/favorites → remaining project rows | Open existing project; no creation wizard |
| Project | Breadcrumb/title/status → brief progress → grouped tasks; List/Board option and context menu | Open task; People/Files/agenda contextual, no 12-tab strip |
| Root task | Origin/back/breadcrumb → status/due/responsibility → description → children → relevant activity/evidence/Funding | Highest-priority permitted action; secondary leadership actions in menu |
| Subitem, depth 1–8 | Breadcrumb → current node summary → its direct children → activity/evidence | Execute/complete/review only when current authoritative contract allows |
| Evidence/review | Work context → attachments/preview → note/reason → decision/submit action | Actual operation feedback; do not fake upload percentages |
| Messages/thread | Relevant thread rows → conversation → keyboard-safe composer | Send permitted text/attachment |
| Announcements | Title → relevant dated announcement rows → read detail | Read |
| Office Team | Office identity → relevant appointments/people → concise Head attention | Open relevant work; advanced access management handoff |
| Accounting | Current authorized Office → assigned queue categories/counts → compact transaction rows | Open exact request/review; unsupported backend operation unavailable |
| Funding/cash/receipt/liquidation | Task/request provenance → amounts/status → evidence → eligible action | Preserve receipts and unknown-outcome states |
| More | Account/context → Messages/Announcements/Office Team → authorized Head Office Budget summary when ready in M5 → Profile/Settings → optional Help → sign out | Open one secondary feature; no annual workspace |
| Profile/Settings | Focused native sections for personal details, appearance, account security and notifications | Save only existing authorized personal operations |
| Web-only/unavailable | Clear title/context → reason → validated web action when configured → back | No blank/fake control; preserve original destination |

## Motion and interaction contract

Use existing shared motion tokens: productive 70/100/150ms, expressive 250/400ms; enter [0,0,0.35,1], exit [0.4,0,1,1], state [0.4,0,0.2,1]. Login uses source idle 18°/s, submit 540°/s, entrance spring 260/26/mass .9, stagger 70ms/delay 100ms. Loading uses 1600ms pulse, minimum opacity .45. Exact mark geometry is retained; web hover behavior needs no touch imitation. Native logo rotation must retain the prior safe view-transform adaptation instead of reintroducing the recorded SVG/worklet crash.

Track mark/startup/login, each skeleton, sheet open/close, toast/validation feedback, row/status movement and retained AI activity individually. Reduced motion removes decorative rotation/pulses and replaces spatial movement with immediate state or brief opacity; never delays a functional action. Pause decoration in background. A press state uses productive timing; list/status updates retain stable row keys/scroll and never imply unconfirmed server success. Full drag-board/Live animation parity is outside v1.

## Responsive/accessibility acceptance

Phone reference widths 360/390/430dp; verify a small Android device, iPhone and >=768dp tablet. Lists remain one readable column on phones; tablets may use list/detail panes while preserving primary navigation/context. No essential horizontal scrolling. Touch targets meet platform minimums, icons have labels, selected tabs expose accessibility state, status is announced in words, focus returns after sheets and toast/live announcements do not steal focus. Support keyboard avoidance, Android hardware/predictive back behavior, iOS gestures, text sizes through 200%, screen readers, landscape where supported, light/dark and reduced motion. These are future native verification requirements, not M0 passes.
