# M7 pinned task column and navigation polish

| Surface | Before | Build 28 |
| --- | --- | --- |
| Office project Main table | Task names moved offscreen with the other columns. | The Task header, name and group color rail stay at the leading edge. Status, Owner, Due date and Office scroll together across every group. The frozen column leaves space for the scrolling cells on narrow screens. |
| Top toolbar | A separate surface and native shadow divided it from the screen. | The toolbar matches the page background in light and dark mode and has no shadow. |
| Home Workspaces | Used a solid card. | Uses the same blue frosted finish and rounded outline as Recently visited, with the corresponding dark surface. |
| Bottom navigation | The selection highlight faded while the icon stayed still. | Icons compress briefly on press and lift slightly on selection. The highlight fades between tabs. Reduce Motion leaves immediate selection feedback. |

1. Install [Android APK 28](../../artifacts/M7/eFlow-Mobile-M7-Latest-v28-arm64-x86_64.apk) over your current build.
2. With an authorized Head or Member account, open an Office project with tasks in Main table. Swipe to Office and back. Check that task names stay aligned, tap a pinned title, then use Back. Repeat in an archived project and after searching for a task.
3. Compare the toolbar with the page behind it. On Home, compare Workspaces with Recently visited in both themes and open the workspace picker.
4. Tap several bottom tabs, including Inbox in the fourth position. Try a quick tap, a hold and a canceled press. Enable Reduce Motion and confirm that the selected tab still responds immediately.

An existing authorized account is sufficient for these read-only checks. Accounting Staff can also check the tabs. M7 personal acceptance is pending.

Android API 36 offline component QA used the Member navigation layout and sample project data. The task titles stayed in place at both ends of the horizontal scroll and a pinned title opened the correct task route. Both Home themes, the flat toolbar, and selection settling on Inbox after repeated taps were checked. Signed-in workflow verification, physical-phone animation feel, large text, accessibility interactions, native Reduce Motion and native iOS are pending.

[Home light](../../artifacts/M7/build28-home-light.png) · [Home dark](../../artifacts/M7/build28-home-dark.png) · [Table at start](../../artifacts/M7/build28-table-start.png) · [Table scrolled to Office](../../artifacts/M7/build28-table-end.png) · [Selected Inbox tab](../../artifacts/M7/build28-tab-inbox.png)

TypeScript, nine Metro checks, 245 tests in 79 suites, and Android and iOS production JavaScript exports passed. The standalone APK installed and reached sign-in on the Android emulator without Metro. The APK signature, 182 embedded native source matches and three-bundle credential audit passed. [Release verification](M7-latest-v28-apk-verification.json) · [Credential audit](M7-latest-v28-release-audit.json) · [Standalone sign-in](../../artifacts/M7/build28-release-login.png)
