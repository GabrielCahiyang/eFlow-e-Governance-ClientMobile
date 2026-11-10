# M7 bottom navigation motion

| Build 28 | Build 29 |
| --- | --- |
| Each tab faded its own highlight. The selected outline icon lifted slightly. | One circular highlight glides between tabs. The destination icon fills immediately, then settles. The Inbox bell gives a small ring on selection. |

The supplied recording shows the destination icon filling before the circle arrives. The eFlow version uses the existing palette, a 250 ms indicator transition, and short icon keyframes. Press feedback is separate from selection. Reduce Motion moves the highlight and changes the icon immediately. The screen itself switches immediately.

1. Install [Android APK 29](../../artifacts/M7/eFlow-Mobile-M7-Latest-v29-arm64-x86_64.apk) over your current standalone build.
2. With an authorized Head, Member, or Accounting Staff account, tap adjacent and distant tabs. Watch the circle travel behind the icons and the selected icon fill immediately. Tap Inbox to check the bell's ring.
3. Tap several tabs quickly. Check that the final icon and circle settle on the active tab. Tap the active tab again and try a canceled press.
4. Repeat in light and dark mode, then enable Remove animations or Reduce Motion in system settings. The circle and filled icon should switch immediately with the setting enabled.

M7 personal acceptance remains pending.

TypeScript, nine Metro checks, 245 tests in 79 suites, and Android and iOS production JavaScript exports passed. The standalone APK signature, 183 embedded native source matches, and three-bundle credential audit passed. [APK verification](M7-latest-v29-apk-verification.json) · [Credential audit](M7-latest-v29-release-audit.json)

Android API 36 component preview used the Member layout with no signed-in account. The recording shows the destination icon filled while the indicator moves, including between adjacent tabs. The final selection settled on Inbox after rapid taps. Light and dark layouts and selection with the preview's Reduce Motion override were exercised. [Emulator recording](../../artifacts/M7/build29-navbar-motion.mp4) · [Transition frames](../../artifacts/M7/build29-motion-frames.png) · [Light Inbox](../../artifacts/M7/build29-inbox-light.png) · [Dark reduced-motion preview](../../artifacts/M7/build29-reduced-dark.png)

Build 29 installed and reached the logged-out sign-in screen without Metro on the isolated emulator. Signed-in use, animation feel on a physical device, native iOS, screen readers and the OS Reduce Motion setting are pending. [Standalone sign-in](../../artifacts/M7/build29-release-login.png)
