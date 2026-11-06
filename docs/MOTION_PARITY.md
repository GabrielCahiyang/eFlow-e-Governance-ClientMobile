# Native presentation and motion — 28 October 2026

> Historical presentation inventory. The [v1 visual contract](mobile-redesign/design-system.md) preserves brand/motion for retained experiences; full desktop/Live replication is outside v1. Android and iOS visual verification remain separate.

The Expo starter is replaced with real eFlow screens. The following implementations are connected to native application state. No Android/iOS visual acceptance is claimed yet; browser preview is supplemental evidence only.

| Web presentation contract | Native implementation | Remaining verification |
| --- | --- | --- |
| EFlowMark and login motion | Exact six SVG paths, animated ring, idle/submitting/error/success states, source spring values and entrance/stagger timing | Device rendering and interrupted sign-in transitions |
| App startup | Branded mark, “Getting things ready”, 168px loading track and gradient sweep; readiness follows fonts/preferences/session verification | Cold and warm startup, network failure, large text on both OSs |
| ViewLoadingState | Title/subtitle, four cards, panel/rows, 1.6s opacity pulse with 0.45 minimum | Shape against each source screen; small phone/tablet layouts |
| Workspace skeletons | Native equivalents of both source workspace skeletons | Navigation transitions and no disappearing loaded content |
| Shared motion tokens | Productive 70/100/150ms, expressive 250/400ms; Figtree typography; source colors | Remaining per-feature movement and appearance themes |
| Dialogs and inspectors | Centered responsive modal; safe-area/keyboard support; fade/scale enter/exit; inspector slide; busy dismiss locks | Focus restoration, hardware back, keyboard and immediate parent-unmount exit cases |
| Feedback | Animated busy icon; dismissible/announced toasts; source-style validation shake | Screen-reader acceptance, interruption/background cases |
| Login preview board | Six original cards and columns; source cycling algorithm; touch movement; reduced-motion/background pause | Real long-press/drag on Android and iOS |
| Shell | Source-style My Work / Workspaces / Inbox / Accounting / More navigation, filtered by actual permission; responsive tablet sidebar with favorites and disclosure | Full tablet/rail visual acceptance and remaining route destinations |
| Task/board/report/cash queue transitions | Screen and dialog transitions exist | Full list movement/drag/state animation parity is pending |
| AI and Live | Auto-assignment queue messages exist | Complete native import and Live listening/speaking presentation is pending |

Reduced motion and application activity are observed through MotionProvider. Reduced motion suppresses decorative continuous animation; timers are paused in the background. Source paths/hashes are recorded in PRESENTATION_SOURCE_MANIFEST.json. More than copied tokens or installed animation dependencies are required for parity acceptance.

Required evidence remains separate for Android and iOS: small/large phone, tablet, large text, keyboard, screen reader, reduced motion and source-supported appearance themes. Passing TypeScript, Jest or Hermes export does not satisfy this checklist.
