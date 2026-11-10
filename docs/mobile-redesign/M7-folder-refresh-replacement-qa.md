# M7 folder refresh replacement QA

Personal acceptance pending.

| Surface | Build 30 | Build 31 |
| --- | --- | --- |
| Home, My Work, Inbox, Projects and refreshable detail screens | System spinner during the pull, then an animated folder over the screen | The folder appears during the pull. The list moves down to give it space and returns when the pull cancels or the refresh finishes. |
| My Work summary cards | The indicator could overlap the cards. | The folder has a dedicated area above the cards. |
| Reduce Motion | Static folder after the native cue | Static folder throughout the pull and refresh, with immediate settling on release |

## Android emulator evidence

- **VERIFIED** using local fixtures on the isolated Android API 36 x86_64 emulator. A slow pull showed the folder during the drag, then showed the moving page during the refresh. The My Work-style cards stayed visible beneath it. The folder cleared on completion. The shared screen also showed the folder. [Recording](../../artifacts/M7/build31-folder-final.mp4), [Drag, refresh and completion screenshots](../../artifacts/M7/build31-work-final-contact.png)
- **VERIFIED** using the same fixtures. A short pull returned to rest without refreshing. A downward swipe away from the top scrolled the list without starting a refresh. [Scroll screenshots](../../artifacts/M7/build31-scroll-contact.png)
- **VERIFIED** using a nested table fixture. The horizontal swipe panned to the Office column, then the pull opened the folder above the panned view. The table kept its horizontal position after refresh. [Table screenshots](../../artifacts/M7/build31-nested-final-contact.png)
- **VERIFIED** using local fixtures. A simulated offline refresh preserved the assignment cards and showed the existing Retry action. Retry completed. In the dark-theme reduced-motion captures, the folder stayed static while refreshing. [Offline and retry screenshots](../../artifacts/M7/build31-retry-contact.png)
- **VERIFIED** that standalone build 31 installed and reached the signed-out screen on Android. [Release screenshot](../../artifacts/M7/build31-release-login.png)
- **BLOCKED** for signed-in emulator workflows pending approved dedicated QA role accounts. The local fixtures used no server identity or hosted data.
- **NOT TESTED** on a personal phone or native iOS. Screen-reader, large-text and keyboard interaction remain personal device checks for this change.

## Build checks

- **VERIFIED** TypeScript, 9 Metro checks and 246 tests across 79 suites.
- **VERIFIED** both production JS exports, Android release compilation, APK signature and the release credential audit across both exports and the embedded APK bundle. [APK verification](M7-latest-v31-apk-verification.json), [Credential audit](M7-latest-v31-release-audit.json)

## Personal QA

1. Install [standalone APK build 31](../../artifacts/M7/eFlow-Mobile-M7-Latest-v31-arm64-x86_64.apk) and sign in with your usual authorized account. Open My Work.
2. Pull slowly from the top. The folder should move into view above the cards. Release after a short pull and check it settles. Pull farther and release to refresh. The page should move until the refresh completes.
3. Scroll down into your assignments, then swipe downward. The list should scroll until you return to the top. Test again in Inbox and Projects, and in Home if your role has access.
4. Open an authorized project and swipe across the table. Check that the task column stays pinned and that the folder still centers above the table when you refresh it.
5. Repeat in dark mode and with your device's Reduce Motion or Remove animations setting. Check that the folder stays static. If using a screen reader, try the list's Refresh action.

These checks use existing authorized accounts and accessible projects. They are read-only.
