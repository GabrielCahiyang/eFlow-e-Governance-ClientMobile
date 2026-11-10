# M7 folder pull-to-refresh QA

Personal acceptance pending.

## Before and after

| Surface | Before | Build 30 |
| --- | --- | --- |
| Home and other refreshable screens using the shared screen | System spinner after pulling | Native pull cue during the drag, then an eFlow folder with a moving page while the refresh runs |
| My Work, Inbox and Projects lists | System spinner | Same folder and refresh feedback as Home |
| Project Main table and other refreshable project views | System spinner | Folder stays centered in the viewport when the table is panned horizontally |
| Reduce Motion | System spinner | Static folder with an accessible “Refreshing” label |

The folder uses the light and dark eFlow palettes. Initial-load skeletons and quiet background updates are separate from manual refresh. A successful refresh dismisses the folder as soon as it finishes. The refresh control and the existing retry action share the same pending state.

## Android emulator evidence

- **VERIFIED** on the isolated API 36 x86_64 emulator with local fixtures. A real pull triggered the shared screen control, the page moved during the request, and the folder cleared when the request finished. [Light theme recording](../../artifacts/M7/build30-folder-motion.mp4)
- **VERIFIED** on the same emulator with local fixtures. A refresh in a horizontally panned native section list displayed one centered folder. [Panned list screenshot](../../artifacts/M7/build30-table-refresh.png)
- **VERIFIED** on the same emulator with local fixtures. In dark mode with reduced motion, the folder stayed static. Simulated connection failure preserved existing content, displayed a connection message and let Retry complete. [Offline screenshot](../../artifacts/M7/build30-offline.png), [Retry screenshots](../../artifacts/M7/build30-retry-detail.png)
- **VERIFIED** that standalone build 30 installed and reached the signed-out screen on the emulator. [Release screenshot](../../artifacts/M7/build30-release-login.png)
- **BLOCKED** for signed-in emulator testing pending approved dedicated Head, Member and Accounting Staff QA accounts. The local fixtures used no server identity or hosted data.
- **NOT TESTED** on a personal phone, native iOS, with TalkBack or VoiceOver, or with large text for this update.

## Build checks

- **VERIFIED** TypeScript, 9 Metro checks and 246 tests across 79 suites.
- **VERIFIED** separate Android and iOS production JS exports, Android release compilation, the APK signature and the credential audit across both exports and the embedded APK bundle. [APK verification](M7-latest-v30-apk-verification.json), [Release credential audit](M7-latest-v30-release-audit.json)

## Personal QA

1. Install the [standalone Android APK](../../artifacts/M7/eFlow-Mobile-M7-Latest-v30-arm64-x86_64.apk) over the previous build. Sign in with your usual authorized Head or Member account for Home. Accounting Staff can start on My Work.
2. At the top of a page, pull down and release. Look for the folder with a moving page while the app refreshes, then confirm it clears. A fast request may finish before the folder is easy to see.
3. Repeat in My Work, Inbox and Projects with any supported account that can open those screens. Open an authorized project, pan Main table sideways and pull down from its top. The folder should stay centered.
4. Check light and dark themes. Turn on Reduce Motion or Remove animations on your device and repeat. The folder should stay still while the refresh runs.
5. Let the screen sit idle, then switch away and return. Check that ordinary background updates stay quiet. With the page already loaded, interrupt connectivity and pull again. Restore connectivity and use Retry if shown, or pull again.

These checks are read-only. Use an existing authorized account and an accessible project. They do not require task mutations or new QA accounts for personal testing.
