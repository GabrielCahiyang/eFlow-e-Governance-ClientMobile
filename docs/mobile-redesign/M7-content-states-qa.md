# M7 - Home and content-state QA

Updated 6 November 2026, Asia/Singapore. Source implementation complete; device acceptance pending. Build 19 predates this source change. No new APK was assembled under the user's existing packaging hold.

## Before and after inventory

| Retained region | Before | Source change |
| --- | --- | --- |
| Home / Recently visited | Translucent elevated card with uneven white center reported in light mode; inert star marks and pagination dots | Opaque semantic surface, matching rounded bounds, transparent idle rows, consistent separators, 44dp browse action, real workspace/project links. Inert stars/dots removed from this card. |
| Home attention | Plain compact empty text; thin two-line placeholders | Work illustration and Browse My Work; grouped status-stripe/title/context/chip skeleton. |
| My Work | Static briefcase circle; copy about following other people; generic thin placeholders | Actor-specific assignment copy, animated work illustration, Clear filters or Refresh assignments. Failures say assignments could not be checked. Separate-row skeleton with section heading, status strip, context and chips. |
| Inbox | Static bell circle and broad real-time promise; same thin placeholders as My Work | Illustrated updates empty state, existing Refresh updates. Failed sources remain unavailable. Update-card skeleton or decision-navigation rows for Decisions filter. |
| Projects | Generic dashboard skeleton; no empty-filter recovery action | Project-section title, icon/title/subtitle/favorite-slot rows; Clear filters or Refresh projects. |
| Project tasks / personal projects | Generic dashboard skeleton and plain empty results | Project summary/progress/tabs/search/task rows or personal project rows. Empty task search can clear search; empty project can refresh. |
| Task / subitem inspector | Generic dashboard skeleton | Inspector title/status/action, subitem rows and detail pairs; dedicated tree layout for nested work. |
| Activity / files / people / conversations / announcements | Generic dashboard skeleton in small panels | Activity text/author/date entries; file navigation rows; people rows with status; sender/body/time messages; announcement cards. Contextual illustration kinds in empty regions. |
| Accounting / retained funding | Dashboard placeholders inside summaries, cash details and permission checks | Label/value summary pairs; request detail and review/receipt shapes; compact verification line. Empty cash-search recovery. Financial permissions and action contracts are unchanged. |
| Profile / invitation / workspace forms | Dashboard placeholders | Label/field geometry. Existing loaded form behavior remains. |
| Workspace routing wait | Dashboard-style workspace loading irrespective of destination | Destination-specific project-list, project, personal-project or inspector shape. The access gate remains. |

No destination, backend operation, authorization rule or record was removed. Web-only legacy presentations remain outside the retained-screen QA scope. Error/unavailable states do not become successful empty results. Refreshes are existing authorized reads; empty actions do not add a creation/approval permission.

## Motion and source comparison

The authoritative local web checkout `C:/Users/james/projects/eflow-e-Governance-Project` was clean at `d51a182` when inspected. Its `src/app/components/ui/EmptyState.tsx` delegates to Vibe EmptyState; `workspace/EmptyWorkspaceState.tsx` uses static markup. Neither file specifies an authored empty-state animation timing to copy.

The native adaptation uses vector/native-view artwork in eFlow navy/blue with semantic light/dark tokens. Two decorative cards drift up to 4px / 3px with a one-degree rotation change, 1600ms per half-cycle and ease-in-out. Existing `loadingMotion.pulse` supplies that timing. This is a documented native adaptation, not a claim that the artwork or idle motion is copied from web. No remote illustration service or new package was added. Motion stops and resets for reduced motion or app inactivity. Skeletons retain the existing 1600ms / 0.45-minimum opacity pulse; reduced motion is static. Art is hidden from accessibility; real action buttons remain reachable. Each skeleton has one accessible busy region and no interactive placeholder controls.

## Verification and limits

| Check | Status | Scope |
| --- | --- | --- |
| Android component rendering | VERIFIED | Existing version-19 debug build, emulator-5554, real components with local display fixtures, no account / actor role. Light/dark Home card and empty artwork; twenty loading layouts. Screenshots below. |
| Empty-state action handling | VERIFIED in automated tests | Clear assignment filters, refresh, project/workspace navigation; artwork excluded from focus navigation. Preview taps only increment local display feedback. No backend mutations. |
| Native reduced-motion rendering | VERIFIED in component preview | Art-region comparison: 37,420 changed pixels with normal motion; zero with reduced motion. Light/dark and 150%/200% text previews inspected; original font scale and dark preference restored. [Receipt](M7-content-states-android-preview.json). |
| TypeScript / Metro | VERIFIED | `npm run check`; nine exclusions. |
| Automated tests | VERIFIED | 199 tests in 65 suites; six added regressions cover Home surfaces/actions, empty-filter recovery, source failure handling, reduced/background motion and accessible loader regions. |
| Android / iOS JS exports | VERIFIED | Both production exports passed. Temporary preview markers are absent; real entry restored byte for byte. This is not iOS compilation or native workflow verification. |
| Credential audit | VERIFIED | [Two-export release credential audit](M7-content-states-release-audit.json). |
| Authenticated page rendering and loading-to-content/error recovery | BLOCKED | Current emulator is signed out. Need an approved Head/Member session and authorized work/project fixtures; Accounting Staff for financial screens. No credentials entered or copied. |
| iOS compilation / rendering / VoiceOver | NOT TESTED | No iOS simulator or macOS build host in this environment. |
| Android TalkBack / actual form keyboard behavior | NOT TESTED for this revision | Automated accessibility contracts and component previews do not establish screen-reader or keyboard acceptance. |
| Personal Android/iOS acceptance | NOT TESTED | Requires the user's review of the updated source/dev build or later authorized APK. |

### Native component screenshots

These are **actual Android screenshots of isolated components**, labeled in the preview as offline. They are not screenshots of an authenticated Home/Inbox session. The temporary preview entry is removed and the real application entry restored before production JS exports.

- [Home card and attention, light](../../artifacts/M7/content-states/home-components-light.png)
- [Home card and attention, dark](../../artifacts/M7/content-states/home-components-dark.png)
- [Inbox illustration and action](../../artifacts/M7/content-states/inbox-empty-light.png)
- [My Work skeleton](../../artifacts/M7/content-states/skeleton-workList-light.png)
- [Inbox skeleton](../../artifacts/M7/content-states/skeleton-inbox-light.png)
- [Project skeleton](../../artifacts/M7/content-states/skeleton-project-light.png)
- [Task inspector skeleton](../../artifacts/M7/content-states/skeleton-task-light.png)
- [Financial summary skeleton](../../artifacts/M7/content-states/skeleton-summary-light.png)
- [Review/receipt skeleton](../../artifacts/M7/content-states/skeleton-review-light.png)
- [Large text at 200%, top](../../artifacts/M7/content-states/home-components-font200-top.png) and [scrolled action](../../artifacts/M7/content-states/home-components-font200-bottom.png)
- [Compact empty state, dark](../../artifacts/M7/content-states/compact-empty-dark.png)

The evidence directory also contains separate people, files, activity, messages, announcements, verification, recent-row, grouped-work, tree, request, form, navigation, personal-project and project-list skeleton captures.

## Personal checklist

Use your own approved mobile account through normal sign-in. Head or Member covers Home, My Work, Projects, Inbox and authorized task/subitem screens. Accounting Staff covers Accounting, authorized cash requests and assigned review packages. No new account is necessary just to inspect visuals on an existing approved account. Dedicated separate worker/reviewer identities and safe fixtures remain necessary for mutations, no-self-review and cross-Office workflow acceptance; this visual change does not execute those scenarios.

1. On Head/Member Home in light mode, inspect Recently visited: one consistent rounded surface, no brighter inner rectangle. Repeat in dark mode. Open the workspace/project row and use Back.
2. In My Work and Projects, search for a name with no match. Inspect the illustration, message and Clear filters action. Verify clearing restores your records. An unavailable source must show an error/unavailable message.
3. In an empty Inbox filter, inspect the updates illustration and use Refresh updates. No invite/account-management action should appear.
4. Open authorized projects, tasks, nested work, people, files, activity and conversations. On a slow connection, compare the placeholders with the content that replaces them: headings, rows, status chips and summary pairs must occupy the corresponding region. Existing loaded content should not be replaced by placeholders during a section's normal refresh.
5. With Accounting Staff, inspect the authorized summary, cash-request list/detail and assigned receipt reviews. Keep the existing pending receipt-note QA checklist. Use visual/read checks only unless safe financial fixtures and write authorization are separately approved.
6. Enable Android Remove animations / iOS Reduce Motion. Artwork and skeletons must stay static. Background/foreground the app; decorative motion must pause and resume appropriately.
7. Repeat on a small phone at 150% and 200% text. Titles/descriptions/actions should wrap and scroll without overlap. Verify keyboard clearance in retained forms and focus actions using TalkBack/VoiceOver on each platform separately.
8. Record actor email, server-confirmed permanent role, selected Office/project, platform, theme and observed outcome. Keep authenticated integration, component rendering and personal acceptance results separate.
