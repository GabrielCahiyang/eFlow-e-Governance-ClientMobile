# M6 personal QA — streamlined work and navigation

**Acceptance pending.** M6 reduces the native presentation around work, projects and account management. Use this checklist to review the build before accepting the phase.

## Before and after

| Entry | Before M6 | M6 mobile result |
| --- | --- | --- |
| Home | Large empty panels and separate work shortcuts | Compact attention groups and empty copy, then My Work and Inbox rows. Office attention remains on Home. |
| My Work and Inbox | Repeated screen headings, Inbox horizontal filters and larger update cards | One shell heading, grouped rows and filter sheets. Search and work filters remain in My Work. Inbox keeps exact related-item navigation and explicit mark-read. |
| Projects | Repeated title, inline status selector and separate status block per project | Search, one filter sheet, compact rows with status text, favorites and recents. Project detail keeps Main table, Board and Agenda with a shorter progress summary. |
| Office Task Inspector | Large overview, duplicated lead fields and six horizontally scrolling tabs | Status, due date and current work actions followed by immediate subitems. Details and records contains Activity, Evidence & review, Funding and Files. Each opens on the same tab stack. Existing submission and financial record links retain exact IDs. |
| Subitem Inspector and branch menus | Move, reorder, delete and detailed editing alongside execution | Current work actions and branch children remain. Keep authorized Choose people, Add child, progress, completion and review. Move advanced structural planning to a web handoff. Office subitem funding and activity remain available. |
| Personal projects | Members & access terms opened sharing and membership controls. Task list exposed complete/archive. | People is read-only. Owners have web entries for access and project closeout. Task creation, staffing, execution, independent review and project history remain. |
| Office Project options → Project people | Team selection/removal and an Office-wide people preload | Read-only names, Office and engagement/state. Head handoff to the Project People view on web. |
| Project, Personal and Task Files | File upload, task link/unlink and removal alongside file reading | Compact read-only rows use existing authorized file URLs. When management is available, the app offers a project web handoff. Task evidence retains its native upload and recovery path. |
| More, Profile and Settings | Separate Profile, Settings and Appearance entries, email preferences in two places, and Office Team roster in More | Account & settings groups Profile, Notifications, Security and Appearance. Email and push settings are under Notifications. Messages and read-only Announcements remain. Office Team moves to a Head-only contextual web entry in Home. |
| Activity and Messages | Card stack with text composer below conversation history | Compact attributed activity and message rows. Older messages load above the thread, and the text composer stays below the scrolling history. Send and retry keep existing message identity. |
| Accounting | Focused M5 operations with a roomier content layout | Compact spacing for the summary, queue and empty states. M5 finance scope and commands continue. |
| Older routes | Standalone Tasks/Deadlines, Office Team, review and update surfaces | Tasks → My Work, Deadlines → dated My Work, Reviews/Notifications → Inbox, Team/Office Team → authorized eFlow Web. No retired native screen mounts from those routes. |

Retired source presentation includes the old sidebar and its icon adapter, duplicate Inbox and Reviews, Tasks and WorkTools, root task editor, native Office Team roster, Personal membership editor, project access editor, and unmounted incoming-call provider. The removed sidebar tests exercised retired presentation. Current navigation tests cover role tabs, exact origin and Back, workspace boundaries and the Account & settings path. Shared services, native package dependencies, historical records and backend contracts are preserved.

Management handoffs require a configured HTTPS web origin. Project people uses the web People view, Office Team uses team supervision, and other project management entries use the authorized project landing when a specific web display is unavailable. The app returns to the original native screen on Back. This QA build lacks a web origin.

## Personal walkthrough

| Actor | Steps and expected result | Live prerequisites |
| --- | --- | --- |
| Head in a readable Office | Open Home, check the compact attention areas and use the Inbox and My Work shortcuts. Open an existing project in Projects and switch Main table, Board and Agenda. Open a task. Check immediate subitems before the secondary records, then open Activity, Evidence & review, Funding and Files. Return with Android Back each time. | Existing authorized Office project and task. Any changes to the task require an approved fixture. |
| Member with a safe task and a nested assignment | Open My Work, search and filter, then open the exact branch. Verify status, due date and the current action. Use Back and check filter retention. Repeat from an exact Inbox update. | Approved Member login, assigned project/task/branch, safe Inbox fixture. |
| Appointed Task/Subitem Lead and separate eligible reviewer | Verify scoped Choose people, Add child, progress and independent review visibility. Confirm advanced moves, reorder and delete use web. Exercise evidence submission or review writes only with approved test records. | Separate actors, authorized branch and review fixtures. |
| Personal project owner and read-only participant | Open an existing Personal project, inspect People and task history, and confirm access/share and closeout move to web. Use the task inspector to verify existing task staffing and independent review eligibility. | Two approved actors and a safe Personal project. |
| Accounting Staff | Open Accounting, check the compact summary, Requests & releases and Assigned reviews. Confirm that a row opens the exact scoped request and Back restores the queue. Verify no broad finance administration. | Approved Accounting Staff login and readable request fixture. |
| Head or Member in an authorized conversation | Open More → Messages. Open a thread, focus the composer, scroll history, close the keyboard and return. The current draft stays while reading older messages. | A readable conversation. Sending and receipt confirmation require two approved actors and a safe thread. |
| Any approved mobile role | Open More → Account & settings → Profile, Notifications, Security and Appearance. Verify Back and that the bottom role tabs remain stable. Repeat Projects and a task in dark mode, large text and reduced motion. | Protected login for a fresh session. iOS requires Mac/Xcode and a simulator or device. |

## Device and build evidence

[Download the M6 standalone Android APK](../../artifacts/M6/eFlow-Mobile-M6-QA-arm64-x86_64.apk) · [APK verification](M6-apk-verification.json) · [Credential audit](M6-release-audit.json)

Build 12 is a non-debuggable release with ARM64 and x86_64 support, signed with the local QA certificate. Use the existing protected gateway for fresh sign-in. The APK is installed on `emulator-5556` (Android 16 API 36, x86_64). [Protected gateway setup](M0-login-fix-qa.md)

```powershell
adb -s <serial> install -r artifacts/M6/eFlow-Mobile-M6-QA-arm64-x86_64.apk
adb -s <serial> reverse tcp:8322 tcp:8322
```

| Check | Result |
| --- | --- |
| TypeScript and Metro | **VERIFIED.** `npm run check` passed, including nine Metro exclusion checks. |
| Automated regressions | **VERIFIED.** 172 tests across 59 suites. Coverage includes retired routes, contextual web handoff, role navigation, workspace boundaries, Inbox identity and message retry identity. |
| Native JavaScript | **VERIFIED.** Android and iOS Hermes exports passed. Credential audit passed for both exports and the embedded APK bundle. |
| Standalone Android | **VERIFIED.** Signature, version, ARM64/x86_64 libraries, embedded source, and absence of the retired presentation modules in the bundle. Installed and cold-launched on the emulator. |

Emulator actor was the restored `bplo.head@gmail.com` session, permanent role `head`, Office LEDIPO. All checks on existing records were read-only. [Actor and role](../../artifacts/M6/emulator-profile.png)

| Android emulator workflow | Result |
| --- | --- |
| Home and My Work | **VERIFIED** for compact Home and the available Head My Work empty state. Assigned work interaction for a Member is **BLOCKED** pending an approved session. [Home](../../artifacts/M6/emulator-home.png) · [My Work](../../artifacts/M6/emulator-my-work.png) |
| Projects and task inspector | **VERIFIED** for project search with the Android keyboard, opening Customer Service Seminar, exact Venue Reservation → Book Venue and Back, contextual Activity and return to the task. [Projects](../../artifacts/M6/emulator-projects.png) · [Project detail](../../artifacts/M6/emulator-project-detail.png) · [Keyboard](../../artifacts/M6/emulator-projects-keyboard.png) · [M5 task before](../../artifacts/M5/baseline-root.png) · [M6 task after](../../artifacts/M6/emulator-task.png) · [Records](../../artifacts/M6/emulator-task-records.png) · [Subitem](../../artifacts/M6/emulator-subitem.png) · [Activity](../../artifacts/M6/emulator-task-activity.png) · [Back](../../artifacts/M6/emulator-task-back.png) |
| Inbox | **VERIFIED** for read-only updates, applying Unread, opening the exact Venue Cleanup task, and preserving the selected filter on Back. [Inbox](../../artifacts/M6/emulator-inbox.png) · [Filter](../../artifacts/M6/emulator-inbox-filter.png) · [Exact task](../../artifacts/M6/emulator-inbox-related-task.png) · [Back](../../artifacts/M6/emulator-inbox-after-back.png) |
| More and Profile | **VERIFIED** for consolidated account navigation and restored Profile. [More](../../artifacts/M6/emulator-more.png) · [Account & settings](../../artifacts/M6/emulator-account-settings.png) |
| Messages | **VERIFIED** for the available empty state. This actor had no conversation. In-thread keyboard, older messages and send/receipt are **BLOCKED** pending an authorized thread and appropriate actors. [Messages](../../artifacts/M6/emulator-messages.png) |
| Visual QA | **VERIFIED** for Home in light and dark, including 150% font scale and Android animator duration disabled. Projects search was exercised with the keyboard. TalkBack and orientation are **NOT TESTED**. Emulator display settings were restored. [Dark and large text](../../artifacts/M6/emulator-home-dark-large.png) |
| Accounting, Personal ownership, second Office and state-changing workflows | **BLOCKED** pending approved role sessions and safe fixtures. The M6 Accounting tab screenshot is pending. M5 finance prerequisites and authorization remain external. [M5 dependencies](M5-personal-qa.md) |
| Web management handoffs and Announcements | Browser launch is **BLOCKED** because `EXPO_PUBLIC_WEB_ORIGIN` is absent from the build. Automated destination checks passed. Announcements remains subject to the recorded hosted policy issue. [M4 integration record](M4-backend-proposal.md) |
| Fresh sign-in, physical Android and iOS | Fresh sign-in is **BLOCKED** by the protected gateway and availability of approved accounts. Physical Android is **NOT TESTED**. Native iOS compile and device workflows are **BLOCKED** on this Windows host. Personal acceptance is pending. |
