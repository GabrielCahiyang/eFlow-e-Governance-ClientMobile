# M7 work and financial clearance — personal QA

18 November 2026, Asia/Singapore. **Mobile development slice validated; shared integration and personal acceptance pending.** M7 remains the current phase. Nothing is marked ACCEPTED, deployed, pushed or published.

## Deliverables

- [Manual SQL](../../artifacts/M7/M7-Work-Financial-Clearance.sql). Run the complete file once on `ixnfphgjyelhckjwjkdv` after reviewing the [contract, prerequisites and Web handoff](backend-review/work-financial-clearance/README.md). It has **not** been applied. No historical/pending migrations were applied or rewritten.
- [Standalone Android review APK](../../artifacts/M7/eFlow-Mobile-M7-Work-Financial-Clearance-v58-arm64-x86_64.apk).
- [APK and changed-source verification](M7-work-financial-clearance-apk-verification.json), [release credential audit](M7-work-financial-clearance-release-audit.json).
- APK: version 58, 100,387,505 bytes, SHA-256 `f382d3e5df20e4b936aa598df04c58ad81c4e044a84396f199c8c09cca4f2d81`. Non-debuggable, embedded bundle, no development launcher; v2 signature verified. Existing local review signing setup; not a store release.

The APK includes this checkout's unrelated, pre-existing UI/navigation edits. Those edits were preserved. Web was inspected at latest remote main `3f053acca80841e15740344f422db6bb596f5198` and was not edited. Mobile base main: `b0a521391ac4924e59281349ac055b2f486c2d65`.

## Source behavior

| Change | Status / evidence |
| --- | --- |
| Date-neutral Start work | Mobile/SQL ready; parent, actor, active project and explicit/ordered prerequisites retained |
| Contributor review | Existing server proposal routing retained; work acceptance with open cash does not complete the record |
| Work accepted / financial clearance | Private acceptance record, versioned capability and explicit finalization; current scope/appointments and descendant approval bindings rechecked |
| Financial receipts required | Actual receipt files required; upload/submission require accepted work. Ordinary evidence remains optional |
| Receiving / return approval | Separate Accounting acknowledgment and funding Office Head approval; exact package, amount, reference, actor and durable retry identity |
| Settlement / journals | Existing posting path and guards retained, including late packages, independent review and authorized Head fallback |
| Automatic restoration | Source-scoped child → task → same project restoration after financial clearance; no automatic Office release |
| Project closeout | Retained project balance permitted; work/cash/governance blockers remain |
| Design | Existing Card, Notice, Button, Field, typography, themes, ErrorState and native feedback; no replacement design system |
| Web UI | Integration handoff provided. Old Web clients are subject to server guards but lack the new dedicated controls |

## Executed validation

| Check | Result |
| --- | --- |
| Focused start/dependency, task/branch review, receipt, return, recovery and capability tests | **PASS: 84 tests in 9 suites**. `artifacts/M7/work-financial-clearance-targeted-jest.json` |
| Delivered SQL in disposable PGlite | **PASS: 56 assertions with LF; 56 with CRLF**. Captured real writers/guards with explicit synthetic identity, scope, locking and financial-read adapters. Covers early starts, prerequisite denial, upload ownership, acceptance, cross-Office denial, exact amounts, separate return decisions, self-approval denial, stale/removed authority and superseded packages, strict completion, source-scoped restoration, missing source binding, zero-balance cancellation, unchanged project/Office commitment and drift rollback. Not full-schema, real RLS/Storage, concurrent-client or live-journal acceptance. |
| Android production Hermes JS export | **PASS**; `artifacts/M7/work-financial-clearance-android-export.log` |
| iOS production Hermes JS export | **PASS**; `artifacts/M7/work-financial-clearance-ios-export.log`. Not native iOS compilation |
| Android release / arm64-v8a + x86_64 APK | **PASS**; Gradle 801 tasks; `artifacts/M7/work-financial-clearance-gradle.log` |
| APK identity, source, launcher and signature | **PASS**: startup sources plus 12 changed workflow runtime sources matched; v2 signature verified |
| Credential audit | **PASS** for both native exports and APK executable. No development-account literals. Previous global audit receipt preserved byte-for-byte |
| Metro exclusions | **PASS: 9 checks** |
| `npm run check`, final `tsc --noEmit` | **BLOCKED by unrelated existing dirty source**: `ProjectAuditTrail.tsx:118` supplies unsupported `active` to Chip. No changed-slice TypeScript diagnostic remains. Metro ran separately and passed |
| Full Jest run, justified by shared live-update/error/server behavior | **717 passed; 17 failed in three unrelated navigation suites**: MobileNavigator, mobileScope and NativeBottomNavigation. Existing navigation/UI edits were preserved. This broader run preceded the final saved-record validation; the final focused run covers that change and its four added regressions. `artifacts/M7/work-financial-clearance-full-jest.log` |
| Hosted migration / financial mutations / real Office approvals | **NOT EXECUTED**: user will apply SQL manually; no production financial fixture created |
| Android install / signed-in workflow | **NOT EXECUTED**: `adb devices -l` showed no attached emulator/device. Compilation is not workflow verification |
| Native iOS compilation / device / simulator | **NOT EXECUTED / unavailable on this Windows host** |
| Themes, accessibility, font scaling, keyboard, motion and Back on both platforms | **NOT EXECUTED for this slice**; personal checks below |

## Required approved actors

Use dedicated accounts through the existing protected authentication flow. Record the actual account ID and **server-confirmed permanent role** for each result; never use Admin credentials or create real financial fixtures to satisfy this checklist.

- Member A: appointed Task Lead, on separate no-child and parent-task fixtures.
- Member B: appointed Subtask Lead, distinct from Task Lead for reviewed completion.
- Member C: assigned contributor and registered cash recipient.
- Accounting Staff D: independent receiving/settlement officer with current required authority.
- Head E: appointed Head of the **funding Office**, distinct from recipient and receiving officer.
- Second approved Office and unrelated Head/Member for scope denial.

Missing actors, safe fixtures, independent staffing or NW11 journal/account prerequisites are **BLOCKED**. The only Accounting Officer cannot acknowledge their own cash return. No substitute role or journal bypass is introduced. Accounting acknowledgment, Head return approval and posting remain separate.

## Personal scenarios — verify Android and iOS separately

Every row is **NOT TESTED on Android / NOT TESTED on iOS** until recorded with actual actors and server receipts.

| Actor / fixture | Expected result |
| --- | --- |
| A/B; future planned date, no prerequisite | Start now; planned date unchanged; actual start recorded |
| A/B; unfinished explicit or ordered prerequisite | Start blocked until official completion; missing/inaccessible prerequisites fail closed |
| C → A; task without subtasks | Contribution stays pending until lead acceptance. One contribution does not finalize the task. Task Lead submits overall work for independent review |
| C → B → A; nested subtask | Correct branch review, then Task Lead whole-subtask review. Other branches and second Office denied. Unapproved descendants prevent final parent completion |
| C; before work acceptance | Financial file selection/submission locked with explanation; ordinary work evidence remains optional |
| C; accepted work, released/acknowledged cash | Every expense requires its actual financial receipt attachment and correct source totals. Rejected receipts request corrections without completing work |
| C/D/E; ₱10,000 released, ₱8,500 spent | C returns ₱1,500. D acknowledges exact amount/reference. E separately approves. Neither action posts settlement or completes work |
| D/E; staffing conflict / Head fallback | No self-review/approval/settlement. Only existing server-authorized Head fallback is offered. Missing independent receiver/Head blocks honestly |
| D; missing Head approval or journal prerequisite | Settlement denied. No settled state, journal, project credit or success is invented |
| D; valid settlement | Eligible unused funding automatically returns to the original source in the same project; other sources/open cash/caps protected; Office commitment unchanged |
| A/B; cleared finances | Only authorized lead gets final Mark as complete; current authority, prerequisites and descendant approval bindings rechecked |
| A/E; project with retained balance | Completion permitted after required work/cash/sign-offs; balance stays in project. No automatic Return to Office Budget |
| C/D/E; interrupted upload, return or settlement | Recover original request; check authoritative result before retry; no fresh write blindly |
| All affected screens | Both themes; 150%/200% text; TalkBack/VoiceOver; reduced motion; keyboard; exact task/branch/receipt destinations and predictable Back |

Retained balances do not authorize new spending on a closed project. Existing explicit Head release to Office Budget remains a separate action. Old posted journals and already archived projects are not rewritten. This delivery is not full release readiness or personal acceptance.
