# M7 Projects directory and Personal task paging

| View | Before | Build 39 |
| --- | --- | --- |
| Projects in Office and Personal workspaces | Passed every matching project to the list. | Starts with up to 40 matching projects and reveals more in groups of 40. Favorites and recently opened projects still come first. Search, status filters and counts cover all projects in the selected workspace snapshot. |
| Personal project Tasks | Mounted every task row in a scroll view. | Uses a virtualized list, reveals up to 40 rows at a time, and searches the full task list by title. Direct links still resolve a task from the full project snapshot. |
| Data reads | Workspace and Personal project calls each returned a complete authorized snapshot. | Uses the same snapshot calls. Paging changes the number of rows shown on the phone. |

[Installable Android APK, build 39](../../artifacts/M7/eFlow-Mobile-M7-Projects-Personal-v39-arm64-x86_64.apk)

## Verification

| Check | Result |
| --- | --- |
| Android fixture, Projects | VERIFIED. With 45 local projects, the list scrolled past row 40 and opened the Personal shortcut at row 45. Searching for that project before scrolling produced one match. [First view](../../artifacts/M7/build39-directory-first.png) · [Later rows](../../artifacts/M7/build39-directory-last.png) |
| Android fixture, Personal project Tasks | VERIFIED. With 45 local tasks, the list scrolled past row 40 and opened task 45. A separate search from the first page returned one match for that task. [First view](../../artifacts/M7/build39-personal-first.png) · [Later rows](../../artifacts/M7/build39-personal-last.png) · [Task detail](../../artifacts/M7/build39-personal-detail.png) · [Search](../../artifacts/M7/build39-personal-search.png) |
| Android standalone | VERIFIED for compilation, signature, install and signed-out launch. Includes arm64 and x86_64 and embeds production code. The emulator fixture is separate from the APK. [Sign-in screen](../../artifacts/M7/build39-release-login.png) · [APK verification](../STANDALONE_V39_APK_VERIFICATION.json) |
| Automated checks | VERIFIED for `npm run check`, Android and iOS production JS exports, and the [release credential audit](M7-projects-personal-v39-release-audit.json). All 267 tests across 83 suites passed in two batches. The single `npm test` invocation also reported 267 passing assertions but exited with a teardown error from a Supabase refresh timer in the existing SettlementPanel suite. |
| Hosted workspace switching and authorization | BLOCKED for agent verification. Requires approved QA accounts with server-confirmed access and the project/task counts below. The emulator fixture used a simulated Member and performed no hosted writes. |
| iOS native and personal acceptance | NOT TESTED. Native iOS compilation and workflows, real-account Android workflows, and the device-specific checklist below remain open. |

## Personal QA

Use an approved **Head, Member, or Accounting Staff** QA account with access to an Office workspace and a Personal workspace. For paging checks, use a directory with more than 40 projects and a Personal project with more than 40 tasks. For the access check, use an approved account without access to the Personal project. No hosted writes are required. Favoriting a project only changes the mobile preference.

1. Open **Projects** in an Office workspace. Scroll past row 40, then search for a project beyond the first page. Confirm the full match count and the status filter. Favorite a safe project and verify it appears in Favorites. Open it and confirm it appears in Recently opened after returning.
2. Open an authorized Personal shortcut from the Office directory. Switch to the Personal workspace and check that its own directory lists only projects from that authorized snapshot. Search for a project beyond row 40.
3. Open the **Tasks** tab of a Personal project with more than 40 tasks. Scroll to the last task. Then search for that task by title before scrolling and verify the exact task opens. Clear search to restore the list. Check the direct route from My Work or a saved deep link.
4. Switch to People, Project files and Activity history, then return to Tasks. Verify the existing views and pull-to-refresh. Confirm an account without Personal project access cannot see its tasks.
5. Check both themes, large text, keyboard handling and TalkBack or VoiceOver.

## Network paging prerequisite

The workspace snapshot is authoritative for project membership, Office participation, project homes and authorized shortcuts. The Personal project snapshot contains task and membership facts used by its existing workflows. Network paging would need reviewed read contracts that preserve those rules, return full filtered counts and support direct lookup of a task or favorite outside the first page. Build 39 uses the existing contracts.
