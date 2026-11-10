# M7 Lottie folder and refresh navigation QA

Personal acceptance pending.

| Surface | Build 31 | Build 32 |
| --- | --- | --- |
| Pull-to-refresh folder | Hand-drawn folder with an animated page | Native Lottie vector opens to reveal a page during refresh. The single indicator appears above the list in the eFlow light or dark palette. |
| Bottom tab during workspace recheck | The navigation container could remount while the authorized workspace snapshot was temporarily unavailable. | The current tab and back stack stay mounted while access is checked. The selection disc moves on a tab change. |
| Reduce Motion | Static hand-drawn folder | Static Lottie frame while pulling or refreshing |

The animation is [Open Folder by LottieFiles](https://lottiefiles.com/free-animation/open-folder-rxx3cgpITr) with eFlow colors. The bundled compositions include the [Lottie Simple License](https://lottiefiles.com/page/license) and source metadata.

## Verification

- **VERIFIED** on the isolated Android API 36 x86_64 emulator using an offline fixture. The folder rendered above the My Work cards in light and dark mode. Captures showed different folder poses during refresh and a static folder with reduced motion. The indicator cleared after completion. [Light-theme recording](../../artifacts/M7/build32-folder-motion.mp4), [Dark-theme frames](../../artifacts/M7/build32-native-lottie-detail.png)
- **VERIFIED** using the real mobile navigator with a simulated workspace recheck. Projects stayed selected while the workspace snapshot was absent and after access was restored. All 142 sampled video frames kept the disc on Projects. [Recording](../../artifacts/M7/build32-tab-refresh-final.mp4), [Before, during and after](../../artifacts/M7/build32-projects-contact.png)
- **VERIFIED** TypeScript, nine Metro checks, 248 tests across 79 suites, separate Android and iOS production JS exports, the Android release build, APK signature and credential audit. [APK verification](M7-latest-v32-apk-verification.json), [Credential audit](M7-latest-v32-release-audit.json)
- **BLOCKED** for signed-in emulator verification pending approved dedicated mobile QA accounts. The Android fixture used no server-confirmed actor.
- **NOT TESTED** on a personal phone or native iOS, with a screen reader, large text, or keyboard interaction for this update.

## Personal QA

1. Install [standalone Android build 32](../../artifacts/M7/eFlow-Mobile-M7-Latest-v32-arm64-x86_64.apk) over the previous build. Sign in with a supported account.
2. In My Work, pull slowly from the top and release. The new folder should appear in the space above the cards and open while the refresh runs. Let it finish, then repeat with Reduce Motion enabled. Check light and dark mode.
3. Open Projects using an authorized workspace. Pull and watch the bottom bar throughout the request. Projects should stay selected even if the workspace shows its loading state. Repeat in Inbox or My Work.
4. Use the normal tab buttons after refreshing. The disc should glide when you select another tab. Open an authorized project, refresh its contents, and use Back to check the Projects list is still underneath.

These checks use existing authorized accounts and accessible projects. They are read-only.
