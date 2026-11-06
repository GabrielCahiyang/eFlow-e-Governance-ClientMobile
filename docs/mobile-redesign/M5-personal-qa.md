# M5 personal QA — focused Accounting

M5 reduces Accounting and funding presentation. **Implementation complete / QA pending.** Personal acceptance is pending. The server continues to decide which records and operations each actor may access.

## Before and after

| Entry | Before M5 | M5 mobile result |
| --- | --- | --- |
| Accounting tab and Office Budget aliases | Eleven local views, fiscal editor, Office budget release administration, and export actions | Accounting opens a short Office summary, Requests & releases, and Assigned reviews. The existing Head Office Budget route can display a read-only summary. |
| Accounting → Requests & releases | Full Office budget bundle with multiple filters, an annual-budget gate, and expanded cards for all requests | An independently loaded searchable queue, a read-only year choice where historical years exist, and exact request detail. Back returns to the same queue. |
| Accounting → Annual budget, Account mapping, General Journal, Financial Audit Trail, Expenses, Office petty cash and Task funding | Native editing, authoring, audit browsing, broad reporting and CSV/PDF export | Removed from the active Accounting entry, embedded panels and legacy native routes. Supported old links use the configured eFlow Web handoff. |
| Accounting → Settlements and Independent reviews | Separate broad panels under the budget tab strip | Settlement remains in the existing authorized request detail. Assigned reviews reuse the focused receipt-review screen and the existing exact Inbox entry. |
| Project options → Funding | Project allocation requests and decisions, funding authorization and fund releases | Read-only project totals. Funding setup links to the project's eFlow Web Budget view. |
| Task/Subitem → Budget | Direct budget authorization, account and allocation controls, subitem cap changes, Office petty-cash management and replenishment | Funding shows brief authorized amounts and contextual cash request, correction, receipt and liquidation workflows. The existing cap is read-only. Office subitems open their own Funding view. Eligible actors have a funding setup handoff. |
| Scheduled cash release → Override schedule | Exceptional release override beside the normal recording action | Removed from the native request detail. Normal authorized release recording remains. |
| Financial Inbox links | Opened task Budget with branch context, but the renderer could drop the financial record ID | Resolve the exact request, release, or receipt package within the linked task and branch. A missing record shows an unavailable state. |

Historical request and receipt detail still uses the existing scoped budget bundle. The Accounting list avoids that report bundle and loads separately from the summary. The current protected web contract supports a project Budget or Office Funding display view for setup handoff. It does not establish an exact web Task/Subitem inspector link. The app keeps the original record context on Back.

## Personal walkthrough

| Actor and data | Steps and expected result | Live status |
| --- | --- | --- |
| Approved Accounting Staff with `navigation.accounting_overview` and `navigation.accounting_releases`, with a readable Office and safe existing cash request | Open **Accounting**. Check for the two cash-work actions and short Office summary. Tap **Requests & releases**, search for the request, open it and compare the request number, Office, fiscal year and displayed amounts. Use Android Back and confirm the queue and search are preserved. Check that journal, mapping, exports and schedule override are absent. | BLOCKED in agent emulator QA pending the approved Accounting session and readable fixture. Personal QA pending. |
| Same Accounting Staff, authorized read access in a second Office | In **Requests & releases**, switch to the second authorized Office and optionally a historical year. Verify only that scope's records open. Try a stale or unavailable link and confirm it gives an explicit state with Back. | BLOCKED pending second-Office coverage. Personal QA pending. |
| Head with a readable Office project and task | Open **Projects → existing Office project → Project options → Funding**. Check that the totals are read-only and allocation and release administration are absent. Return to project tasks, open a task and select **Funding**. Verify short balances or an explicit unavailable state. | See emulator evidence below. Personal QA pending. |
| Member who is the authorized task lead or cash recipient, with a funded assigned task/subitem and exact cash update | Open **Inbox → related funding record**. Confirm the exact task/subitem and request. Verify no setup controls, and check that a receipt already on file opens only for the authorized actor. Use Back to return to Inbox. | BLOCKED pending an approved Member and safe fixtures. Personal QA pending. |
| Separate assigned independent reviewer and a readable existing receipt package | Open **Assigned reviews** or the exact Inbox item. Check that the package ID and receipt match and that review and settlement are separate actions. Read-only QA may inspect the package and back path. | BLOCKED pending approved reviewer and package. Personal QA pending. |

The steps above can run in an emulator or on a phone. For write QA, separate the assigned requester/recipient, appointed Head, Accounting Staff and independent reviewer. Use specifically authorized test records and an approved writable environment. Cash release, acknowledgment, request submission, liquidation, review and settlement writes are **BLOCKED** for this run. Do not record a release from this checklist on a real cash request.

## Integration and device dependencies

- Installed finance/NW11 prerequisites remain external. Summary requires `department_budget_summary`. The queue uses authenticated reads of `department_fiscal_budgets` and `petty_cash_requests`. Task Funding uses `get_task_funding_context`, Project Funding uses `project_flow_snapshot`, and request detail and independent reviews require the existing authorized receipt and decision reads. A source or fixture dependency is recorded for its own screen.
- Fresh sign-in and Office Team depend on the existing protected gateway. Announcements RLS remains tracked with M4. [M4 integration record](M4-backend-proposal.md)
- Native iOS compile and device QA are **BLOCKED** on the Windows host. Physical Android acceptance is **NOT TESTED** by the agent.

## Build and emulator evidence

| Check | Result |
| --- | --- |
| TypeScript and Metro | **VERIFIED.** `npm run check` passed, including nine Metro exclusion checks. |
| Automated regressions | **VERIFIED.** 168 tests across 60 suites passed. Accounting presentation and queue navigation use mocked facts. Covered retired views across finance aliases, release entitlement, exact request/release/package scoping and funding handoff URLs. |
| Android and iOS Hermes exports | **VERIFIED.** Both exports passed. |
| Credential audit | **VERIFIED.** No development account literals in either export or the embedded APK bundle. [Release audit](M5-release-audit.json) |
| Android standalone | **VERIFIED.** Code 11, release, ARM64 and x86_64. Verified signature, embedded M5 source and absence of nine retired presentation modules. Signed with the local Android QA certificate. [APK receipt](M5-apk-verification.json) |
| Install and cold launch | **VERIFIED.** Installed and launched on Android 16 API 36, x86_64 emulator `emulator-5556`. [Cold launch](../../artifacts/M5/emulator-cold-launch.png) |

[Install the M5 Android APK](../../artifacts/M5/eFlow-Mobile-M5-QA-arm64-x86_64.apk). The QA APK includes the protected loopback gateway configuration. For fresh login, the owner-run gateway must listen on this PC and ADB must forward the port. The listener was unavailable during this run. Enter passwords only in the app. [Gateway setup](M0-login-fix-qa.md)

```powershell
adb -s <serial> install -r artifacts/M5/eFlow-Mobile-M5-QA-arm64-x86_64.apk
adb -s <serial> reverse tcp:8322 tcp:8322
```

Read-only emulator actor was the restored `bplo.head@gmail.com` session. Profile confirmed permanent role `head` and Office LEDIPO. [Role evidence](../../artifacts/M5/emulator-profile.png)

| Emulator workflow | Result |
| --- | --- |
| Project Funding | **VERIFIED.** Customer Service Seminar shows the same four retained totals with a single setup handoff. The M4 native fund-release controls are absent. [M4 baseline](../../artifacts/M5/baseline-m4-project-funding.png) · [M5 screenshot](../../artifacts/M5/emulator-project-funding.png) |
| Task Funding | **VERIFIED.** Venue Reservation opens the reduced Funding view with read-only amounts and no root cash requests for this actor. [Screenshot](../../artifacts/M5/emulator-task-funding.png) |
| Subitem Funding and Back | **VERIFIED.** Book Venue opens its own Funding view and shows its existing cash request, FR-00001, pending department settlement. Android Back returns to Book Venue. [Funding and request](../../artifacts/M5/emulator-subitem-funding.png) · [Back](../../artifacts/M5/emulator-subitem-back.png) |
| Web handoff | **VERIFIED** for the unavailable state and return to the project. Browser launch is **BLOCKED** because the QA build has no `EXPO_PUBLIC_WEB_ORIGIN`. [Screenshot](../../artifacts/M5/emulator-funding-web-handoff.png) |
| Android display | **VERIFIED** for Project Funding in light and dark, including 150% font scale with Android animator duration disabled. Settings restored. TalkBack, Accounting keyboard and the equivalent iOS interactions are **NOT TESTED**. [Dark and large text](../../artifacts/M5/emulator-project-dark-large.png) |
| Accounting, second Office, independent review and writes | **BLOCKED** for the live role and fixture scenarios above. The Accounting entry and queue screenshots require an approved Accounting Staff session. |
| Exact Inbox financial links and receipt downloads | **NOT TESTED** with a live fixture. Automated route and record matching checks passed. |
| Personal Android device acceptance | **NOT TESTED.** The user can reproduce the walkthrough after installing the package and arranging the approved test accounts. |

The root Task Inspector still uses the existing horizontal section strip. The M5 Funding reduction is present there. Broader inspector layout and navigation cleanup remain in the proposed M6 scope.
