# Native catch-up: direct subtask completion

This slice replaces the old subtask submit/review buttons in the task tree with Mark complete for the eligible subtask or parent task lead. The server remains authoritative on work access, ordering and completion. Parent task review is unchanged. The list no longer shows the retired subtask percent. Completion currently supports an optional note; native completion attachments and durable recovery across app restarts are still pending. Retry within the open sheet reuses the request ID.

Checks: TypeScript and Metro configuration passed, 86 tests passed, and Android/iOS JS exports succeeded. See the catchup logs. This does not establish full web parity or iOS native installation.

The older eFlow-Android-emulator-x86_64.apk is a development client and should not be used for standalone startup. The standalone v3 ARM64 APK is for ARM64 hardware; the Pixel_4a x86_64 emulator requires the matching standalone release.

## Standalone emulator startup

The x86_64 release contains an embedded Hermes bundle and no Expo development launcher. The first release crashed on its animated SVG rotation: Reanimated attempted a synchronous call to a remote JS function while processing the SVG transform string. Rotating a native view around the same logo pivot preserves the animation without that SVG transform path.

The rebuilt APK installed and cold-launched into MainActivity. A screenshot confirms the actual eFlow sign-in screen, and MainActivity remained foreground with a live process. UI Automator could not become idle on the animated login screen, so visual confirmation and activity/process inspection were used. No authenticated workflow was exercised.

Artifact: artifacts/eFlow-android-standalone-catchup-x86_64.apk (emulator only).
Evidence: artifacts/eflow-standalone-emulator.png and docs/STANDALONE_CATCHUP_X86_64_APK_VERIFICATION.json.

## Project setup source update

The native Create project action opens a five-step setup sheet. The Head can save a draft, reopen it from planning-project settings, choose a lead and dates, authorize annual account funding, and finish setup through the existing backend. Funding checks duplicate accounts, available balances and positive amounts. An uncertain funding response retains its request ID while the sheet is open. This slice does not implement subsequent task allocation, closeout, or a complete authenticated mobile walkthrough.

This source update has not been packaged into the existing phone APK. Other handoff items remain open.

## Broader 3 November catch-up

Source now connects the setup wizard and project funding gate, task account allocation and return, shared office petty cash, office budget release schedule and version history, sponsoring Head invitation sending, task deadline badges, work-feed lifecycle refresh, project and employee analytics, and manual project publication. These use the existing backend. No schema, account, test transaction, or publication was changed on the hosted system.

Acceptance must distinguish a packaged build from signed-in validation. Check these on authorized labeled records:

1. Head creates and resumes a draft, authorizes annual project funds, finishes setup, then passes the separate activation review.
2. Allocate two accounts to a task, extend an existing allocation, reject overbudget and duplicate lines, and return unused money without changing the Office reservation.
3. Complete a subtask with evidence and verify parent review stays pending for the assigned reviewer, while Leading and History update without manual refresh.
4. Verify Office petty cash request, reject/re-request, release, receipts, settlement, and Accounting-only replenishment. Separately check scheduled budget availability confirmation and independent settlement.
5. Open invitation on the recipient device and verify own password, profile and project-only access.
6. Compare dashboard counts and role permissions; verify publication review and consent on a separately authorized archive before any live seal.

Outstanding parity includes the full recipient profile/PDS onboarding, finance and Member landing refinements, the complete web analytics tables/metrics, and remaining detail views and native interaction comparisons. Authenticated Android and iOS acceptance is separate.

## Build 4 scope

Later additions in this pass: recipient-owned skills, experience, summary and request-scoped PDS; Head, Member and Accounting overview additions; delivery metrics using server workflow facts; removal of retired subtask review actions from the action inbox; automatic project readiness refresh. The three new regressions cover Philippine deadline rollover, pending-review visibility and locked budget release balances.

The native release does not yet reproduce every web screen or interaction. Remaining examples: full project funding closeout/request decisions, the month-grid calendar and version diffs, complete analytics table/funding drilldowns, and all task/subtask presentation and workflow checks. Public certificate links require a configured HTTPS web origin. No live publication was initiated for testing.

Build 4: the signed combined ARM64/x86_64 APK replaced the old download at artifacts/eFlow-Android.apk. The emulator installed it and cold-launched the actual sign-in screen without Metro. Screenshot: artifacts/eflow-catchup-v4.png. TypeScript and all 89 tests passed. No physical device or authenticated end-to-end acceptance was performed.
