# Mobile role scope and people workflows — 28 October 2026

The user explicitly excluded Admin from mobile. Head, Member and Accounting Staff are the supported mobile roles. Admin account management, global role defaults, account-activation authoring and lockout administration remain in EflowWeb.

The previously added native Admin screens have been deleted and their routes removed. Mobile authorization rejects current and legacy Admin identities before loading their role permissions or creating a mobile profile, including remembered sessions. The development account chooser excludes Admin. No database account, credential or web feature was deleted or changed.

Removal validation: typecheck passed; 76 tests across 30 suites passed, including restored legacy Admin-session rejection and absent Admin bottom navigation. Android and iOS production JS exports passed, and the two-bundle audit found no development account literals. A fresh visual check was unavailable because browser access was disabled in Work settings. Previously produced APKs predate this scope correction; they are not updated standalone releases.

Head Office identity/access remains in its own feature. Its individual exceptions use the source permission keys and inherited/effective-access selectors, with active people in the exact Office as targets. Native reads fail visibly if permission data is unavailable. A page permission does not bypass project, Office or server policy. Global role-default editing is absent.

Earlier Admin screenshots are historical implementation evidence from before the scope correction; they do not describe the current mobile application. No activation email, account edit, role/permission change, security-setting change or deletion was executed during those checks.

Team Supervision shows scoped people, workload signals, attention items, task/subitem participation and source activity. Identity & Access shows active people in the exact Office, protected leadership and existing accounting-role controls. Only the appointed Head can use those role controls; cross-Office targets and leadership roles are excluded.

Team Intelligence uses the existing health, member metrics and skill-coverage selectors, plus coaching context through the existing employee-notes service. Monthly contribution uses current workflow facts for the current Manila month and stored productivity snapshots for prior months. It remains a recognition/supervision aid, separate from AI assignment inputs.

The browser check loaded the existing LEDIPO QA work: two approved completed tasks, the recorded Head and stored skill coverage. It did not create workflow data or change membership. Screenshots are under `docs/evidence/2026-10-28/`; they are React Native Web evidence, not Android/iOS acceptance.

Remaining mobile people parity includes complete Office invitation presentation, supervision replacement workflows beyond the existing task staffing screen, and complete visual/motion/device acceptance. Admin-only account workflows are excluded from the mobile parity target, rather than listed as unfinished work.
