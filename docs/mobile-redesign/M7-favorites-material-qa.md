# M7 — Favorites carousel, direct picker and frosted surface (build 24)

Implementation complete; personal acceptance pending. Supersedes the build-23 Favorites presentation. Existing Home toolbar, Workspaces entry, compact filters and quiet refresh behavior are retained.

## Before / after inventory

| Surface | Build 23 | Build 24 |
| --- | --- | --- |
| My favorites card | Stacked favorite rows and a labeled Add workspaces action. | Rounded eFlow gradient carousel with a large central plus tile and side-card peeks, following the supplied reference layout. Real favorites have their own tiles; the plus opens the picker. Dots describe actual pages rather than decorative fake pages. |
| Favorites sheet | Initially showed only favorites; Add workspaces and Done changed modes. | Immediately lists every active authorized workspace with search and trailing stars. Centered Add a favorite title, close icon, compact icon/name/context rows. No extra Add/Done step. |
| Starring | Filled icon changed without motion. | One 250 ms pop-and-tilt on the icon, with immediate checked/fill feedback. Repeated taps restart that single acknowledgement rather than queuing animations. No entrance/external-update animation. |
| Reduced motion / background | No star animation. | State still changes immediately. Transform animation is disabled and reset when reduced motion is enabled or the app backgrounds; it does not replay on resume. |
| Recently visited, light | Flat opaque white surface. | Tinted frosted-glass-style material with a uniform base, clipped diagonal sheen and light rim. This is a native material treatment, not a live backdrop blur. Child rows stay transparent; no independent white center plate. |
| Recently visited, dark | Existing dark surface. | Existing dark surface retained. |

No primary screen or navigation destination was added or removed. Only Favorites’ intermediate Add/Done presentation step was removed. Underlying local favorite IDs, actor isolation, workspace authorization, original tab/branch restoration, profile access and project/task operations remain unchanged. No hosted data, Supabase policies, migrations, roles, gateway or financial contracts were modified.

## Native adaptations

- eFlow colors, typography and existing 250 ms expressive duration/state easing are retained. The supplied image is a visual reference; no monday.com brand assets or web feature expansion were copied.
- Star feedback uses Reanimated CSS keyframes on transform only: scale 1 → 1.24 → 1.08 → 1, rotation 0 → −14° → 8° → 0, one iteration. It is triggered by the checkbox tap, not render or every preference update. The checkbox node keeps focus; only its visual child restarts.
- Carousel scrolling uses native horizontal snapping. Pagination can navigate pages and uses non-animated positioning under reduced motion. Removing a favorite clamps the selected page safely. Empty Favorites has one real add page with non-interactive side decorations.
- Favorites rows do not switch workspaces when a star is tapped. The normal Workspaces picker still selects context from its row; its separate star only changes a local preference. List ordering remains stable as items are starred/unstarred, and active authorization filtering remains in place.
- The sheet uses the existing `@expo/ui/community/bottom-sheet` native adapter, with no new package. Android uses its native partial/expanded positions rather than an exact 70% fraction. Focusing search expands the sheet so the query and matching row remain above the keyboard. Native dismissal drives the close callback. The initial keyboard overlap found during component QA was fixed and retested.
- The light frosted material keeps an opaque uniform tint below its sheen to avoid the Android alpha/elevation issue previously seen as a white rectangular patch. It adds no native blur dependency or per-frame blur work.

## Verification

| Check | Status | Evidence / limits |
| --- | --- | --- |
| TypeScript / Metro | VERIFIED | 9 Metro boundary checks. |
| Automated tests | VERIFIED | 238 tests / 77 suites. Direct-list search, no Add/Done step, star versus workspace-selection separation, checked-state feedback, reduced-motion/background reset, real carousel pages and safe page removal, one light sheen/dark surface, plus existing routing and actor-isolation tests. |
| Android / iOS production JS exports | VERIFIED | Separate exports; not iOS native compilation or workflow acceptance. |
| Android APK compilation/source/signing/credential checks | VERIFIED | Version 24, ARM64/x86_64, non-debuggable embedded bundle, same local QA signer; 174 native source files match. Three production bundles pass the credential audit. Final receipts include real-entry and no-preview checks. |
| Android native component appearance / search / checkbox state | VERIFIED (component scope) | Isolated API 36/x86_64 offline fixtures: Home light/dark, carousel proportions, uniform light frosted surface, immediate workspace list, filled/unfilled checkbox, retained search and matching row above keyboard after expansion. No authenticated actor or hosted mutation. |
| Star animation feel / performance on a physical release device | NOT TESTED | Transform sequence, tap-only triggering and reduced-motion/background/no-replay behavior have automated coverage. Native state feedback was observed; exact motion timing and frame smoothness are not certified by screenshots. |
| Standalone installation / launch | VERIFIED | Build 24 installed over the isolated QA debug app with the same signer and launched the real logged-out sign-in screen on API 36/x86_64 without Metro. No account used. |
| Signed-in role/Office/workspace flows | BLOCKED | Approved dedicated actor-role/fixture mapping unavailable. Offline preview and mocks are not role acceptance. |
| Personal Android acceptance, iOS native, TalkBack/VoiceOver and large text | NOT TESTED | Verify separately; no pass inferred from JS exports or offline component previews. Android search-keyboard behavior was tested as recorded above. |

## Actual Android screenshots

These are native component previews with safe offline fixtures, not authenticated role acceptance. The display name is **Design Preview**; there is no server-confirmed actor or role.

- [Home light: carousel and frosted Recently visited](../../artifacts/M7/build24-home-preview-light.png)
- [Home dark](../../artifacts/M7/build24-home-preview-dark.png)
- [Immediate searchable Favorites list](../../artifacts/M7/build24-favorites-sheet-light.png)
- [Expanded search and matching row above the keyboard](../../artifacts/M7/build24-sheet-keyboard-fixed.png)
- [Final standalone release: real logged-out sign-in](../../artifacts/M7/build24-release-login.png)

The temporary component entry was removed and the real production entry restored before final packaging. Offline fixture UI is not included in the standalone APK. This visual pass does not verify persistence through a real account, authorized workspace switching, native iOS, physical-phone motion feel or full M7 acceptance.

[Standalone APK build 24](../../artifacts/M7/eFlow-Mobile-M7-Latest-v24-arm64-x86_64.apk), [source/signing receipt](M7-latest-v24-apk-verification.json), [three-bundle credential audit](M7-latest-v24-release-audit.json). SHA-256: `351e051d4fcf562f034915b74f9c66f4a9c80131b9f738a73966b0a6f675d0c0`. Both supported Android ABIs are packaged. The existing local QA signer is retained; no signing key or credential file is packaged.

## Personal checklist

Use your existing authorized Head or Member account for Home. Any supported role can check stars in the toolbar Workspaces picker. No new account is required for reversible local favorites and read-only navigation. Use approved dedicated fixtures for deliberate authorization changes or mutations; never Admin.

1. Install build 24 over the previous standalone APK without clearing data. On Home, expect the rounded gradient Favorites carousel, central plus tile and real page dots. Existing favorites should remain; tapping a workspace tile still uses normal authorized selection.
2. Tap the plus or header arrow. All available workspaces should appear immediately under search; there must be no extra Add workspaces or Done button. Focus search: the sheet should expand and keep the query and results visible above the keyboard. Search, clear search and close/swipe-dismiss the native sheet.
3. Tap a star. Expect immediate fill/unfill plus a brief pop/tilt. The row must remain in place, the sheet must stay open, and the current workspace must not change. Repeat rapidly; the icon should settle rather than queue motion or remain enlarged.
4. Close the sheet and inspect actual favorite tiles and page count. Swipe or tap page dots; open a favorite and verify the correct context. Remove a favorite while viewing the last page and verify the carousel remains valid. Restart to check persistence; a separate approved account must retain its own list.
5. Enable reduced motion, then star/unstar. Expect instant state feedback without scale/rotation or replay when disabling reduced motion or returning from another app. Check screen-reader checkbox state separately with TalkBack/VoiceOver.
6. In light mode, Recently visited should have a uniform frosted tint/highlight with readable rows and no white rectangular center. Scroll and inspect pressed rows. Dark mode should retain its existing dark treatment.
7. Check long names, large text, rotation, search keyboard and native Back/swipe dismissal. Record exact actor, server-confirmed role, workspace and physical device/emulator. No real financial operation or task creation is needed for this UI check.

M7 remains pending explicit user acceptance. No push, merge, publish or deployment was performed.
