# eFlow Mobile

- Android and iOS are equal acceptance targets. This is a full React Native port of EflowWeb, not a WebView shell.
- Mobile supports Head, Member and Accounting Staff only. Admin sign-in, global account management, role defaults, lockout administration and Admin navigation are web-only by explicit user decision. Preserve Head Office identity/access workflows separately.
- Preserve roles, permissions, server contracts, terminology, navigation destinations and financial invariants. Never bypass server decisions to make mobile UI work.
- The sole hosted target is ixnfphgjyelhckjwjkdv. Do not modify schemas, RLS, account credentials or deployed migration history for this port.
- Organize native implementation by feature under src/app/features; shared native controls live in src/app/components/ui and platform adapters in src/platform.
- src/core/web is a generated headless TypeScript snapshot from the sibling EflowWeb source. Run scripts/sync-web-core.mjs to refresh; record intentional native adaptations separately. Never copy server secrets or service-role keys.
- Feature status must distinguish implemented, Android verified and iOS verified. A web preview is not native-device verification. Keep pending parity items explicit; no stub action counts as complete.
- One-to-one parity includes presentation and motion: the animated eFlow mark, startup/loading screens, per-view skeletons, login entrances, dialogs/drawers, toast and feedback transitions, task/board movement, and AI/Live activity states. Generic native spinners or slide modals are not proof of parity. Reuse source timings/easing and honor reduced-motion preferences; track each native replacement and verify it on both platforms.
- Keep native entry points small. Add meaningful regression tests for permissions, financial receipts, routing and state recovery; run check, tests and both native JS exports before reporting a slice complete.
