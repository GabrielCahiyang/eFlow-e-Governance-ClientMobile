# M7 contributor → Lead: structured Next step

16 November 2026, Asia/Singapore. Implementation complete; personal acceptance and authenticated workflow testing remain pending.

## Scoped correction

New Task and Subtask progress proposals send `p_terms.next_step` separately from `p_terms.note` through `m7_propose_work`. Notes retain the 3000-character limit; Next step has its own 300-character limit. Blank Next step is omitted. Completion proposals retain their existing fields and permissions.

`src/app/features/tasks/workProposals.ts` declares the optional field. `WorkProposalSheet.tsx` displays it on review cards, preserves it in immutable saved-request previews, restores it when discarding an unsubmitted upload, and seeds the editable field when correcting a returned progress submission. The contributor must still enter a revised work note. Existing permission rechecks, assigned reviewer routing, evidence and receipt validation remain in place.

Saved requests with an uncertain RPC result retain their original request identity and terms. Historical notes containing `Next step:` stay intact; Mobile does not parse or rewrite that prose into a structured field. Attachment recovery preserves structured terms.

## Read-only backend evidence

The authenticated Supabase CLI identified `ixnfphgjyelhckjwjkdv` as **production**. A catalog-only SELECT on 16 November confirmed:

| Function | Definition MD5 | Observed contract |
| --- | --- | --- |
| `eflow_m7.propose_work(uuid,uuid,uuid,text,jsonb,uuid)` | `19e28c86c73e6ccffb375c5cc29fdef1` | `next_step` is in the accepted terms whitelist and is limited to 300 characters. |
| `eflow_m7.decide_work(uuid,uuid,boolean,text)` | `a66b17fc79934f1094685531f32c302c` | Passes `work.terms->>'next_step'` to `public.submit_task_progress`, `public.save_subtask_progress` and `public.save_subtask_work_update`. |

No migration is required for this field against those inspected definitions. This evidence verifies the installed SQL contract, not successful execution with real contributor/reviewer permissions. No database records, schema, configuration, Web files or migration history were changed during this correction.

## Verification

- **PASS:** 14 focused proposal tests, including Task/Subtask payloads, review display, separate field limits, returned corrections, upload recovery and unchanged replay of legacy and structured requests.
- **PASS:** full current-worktree suite, 561 tests / 136 suites; TypeScript and nine Metro checks; separate Android and iOS production JavaScript exports.
- **PASS:** Android ARM64/x86_64 release compilation, signature verification, non-debuggable standalone packaging, startup and feature source-map matches. [APK verification](M7-contributor-next-step-apk-verification.json).
- **PASS:** development-account credential audit on the Android export, iOS export and APK's embedded executable. [Audit receipt](M7-contributor-next-step-release-audit.json). Pre-existing generic audit/build receipts were preserved.
- **NOT RUN:** installation and signed-in Android workflows; native iOS compilation/workflows; device themes, accessibility, keyboard and reduced-motion acceptance.

[Install the M7 Contributor Next Step v57 APK](../../artifacts/M7/eFlow-Mobile-M7-Contributor-Next-Step-v57-arm64-x86_64.apk). Other candidates also use version 57; use this exact filename. SHA-256: `591962e78455c14dab1cd7db20d648db49ca945017e1ad36dbf8aee696d2d902`.

## Personal workflow checklist — BLOCKED pending approved actors and fixtures

Use a designated contributor, an appointed Task/Subtask Lead who is a different person, and a dedicated non-financial fixture with active parent records and valid dates. Existing account names alone do not establish approval to use them or change their records. Sign in through the normal protected login flow; do not use Admin credentials or bypass RLS.

Run these scenarios separately on Android and iOS:

1. As contributor, submit a Task progress update with Blocked, a blocker, a work note, Next step and optional evidence. Confirm pending review is reported honestly and authoritative work state changes only after the permitted approval.
2. As the assigned Lead, verify separate note, blocker, Next step and evidence in the review card. Approve; confirm the resulting Task update retains Next step in Activity and the current blocker is accurate on a second device.
3. Repeat under a direct Office Subtask, with a different Subtask Lead as required by the appointment. Confirm the same fields survive approval.
4. Return a progress proposal with a reason. As its original author, open Resubmit work, verify the editable Next step is retained, revise the work note and Next step, and submit. Verify the replacement links to the returned proposal and only the permitted Lead can decide it.
5. Submit In progress without a blocker to request clearing. After approval, check the blocker disappears while history retains both updates. Confirm Next step is present if supplied and absent if deliberately left blank.
6. On an approved test fixture, exercise interrupted submission recovery. Verify an uncertain result before another write; the saved note and Next step are read-only and retry uses the same request. For a saved evidence upload not yet submitted, discard the upload and verify Next step remains editable.
7. Verify no self-review, revoked capabilities, understandable server errors, both themes, increased font size, screen reader, reduced motion and keyboard behavior. Record exact actor, server-confirmed role, record IDs, error and platform for each result.

No approved actors or disposable project have been designated for agent-run writes. Therefore real role execution, RLS visibility, cross-device approval/blocker refresh and native device acceptance remain **BLOCKED / NOT RUN**. An APK build and JavaScript exports do not establish these results.
