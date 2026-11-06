# M7 navigation clearance and Activity labels

| Surface | Build 25 | Build 26 |
| --- | --- | --- |
| All tab roots and detail screens | The absolute-positioned navigation bar overlapped scrolling content. Some roots added extra bottom padding, while detail screens could leave their last row or action under the bar. | The navigation bar has its own layout space and handles the system bottom inset. The navigator bounds each screen above the bar. Roots use normal content spacing. |
| Task Activity | Event headings used database codes with underscores replaced by spaces. | The app displays “Subitem Progress,” “Subitem Completed,” “For Review,” and other title-cased headings. Stored event codes, notes, actors and dates are preserved. |
| Task funding setup handoff | A large illustration pushed the actions down. A missing web address exposed build configuration text and the internal work-item ID. | The compact handoff shows a short explanation and puts Back near the top. A validated web destination still shows the browser action when available. |

1. Install [Android APK 26](../../artifacts/M7/eFlow-Mobile-M7-Latest-v26-arm64-x86_64.apk) over the previous standalone build.
2. With an authorized Head or Member account, scroll to the end of Home, My Work, Projects, Inbox and More. Check that the last entry and any button are visible and tappable above the navigation bar. If you have an authorized Accounting Staff account, repeat on Accounting.
3. From Projects, open an authorized task, open Activity and scroll to the final event. Confirm the headings use capital letters and “Subitem.” Check that authors, dates and notes still agree with the activity history.
4. Open a subitem and scroll to its child list. Where available, open the funding setup handoff, then use Back. Repeat in light and dark and with larger system text. For an editable task, focus an Activity comment field and dismiss the keyboard without sending anything.

These are read-only checks using an existing authorized account. Personal acceptance is pending.

TypeScript, Metro checks, 240 tests across 79 suites, and production JavaScript exports for both platforms passed. Android build 26 installed and reached sign-in without Metro. The three-bundle credential audit passed. [APK verification](M7-latest-v26-apk-verification.json) · [Credential audit](M7-latest-v26-release-audit.json)

Android API 36 previews used the Member layout with offline fixtures and no server-confirmed role. The native Activity screen and funding handoff were checked in dark mode. The last actions of Home, My Work, Inbox, Projects and More were visible above the bar. The automated tab suite also covers Head and Accounting Staff. [Activity at the end of the list](../../artifacts/M7/build26-activity.png) · [Funding handoff](../../artifacts/M7/build26-funding.png) · [Projects clearance](../../artifacts/M7/build26-tab-projects.png) · [Other tabs](../../artifacts/M7/build26-tab-clearance.png)

Signed-in emulator testing is blocked by the lack of an approved dedicated actor and task fixture. Physical Android, native iOS, light-theme preview, large text, keyboard and screen-reader checks are pending for this update.
