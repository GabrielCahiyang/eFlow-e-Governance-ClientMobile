# M7 web catch-up

This pass builds on the native redesign at `201522e`. It uses the existing hosted eFlow contracts and keeps Administration, advanced finance configuration, and project funding release in eFlow Web.

| # | Mobile behavior |
| --- | --- |
| 1 | Head Inbox finds actionable staffing escalations from server notices and opens the exact liquidation. |
| 2 | The Head can confirm and post when the current package grants fallback authority. Review-only approval has separate copy. The server still checks conflicts, version, fingerprint, and the command identity. |
| 3 | The request and receipt status refresh from the server. A confirmed Head review can clear the task approval gate under the same terms as web. Project closure still uses its separate settlement check. |
| 4 | More opens the Office Petty Cash fund. A staffing alert opens its exact request. The server's `canSettle` field controls the settlement action for this fund. |
| 5 | Project Funding shows unused task allocations with account and fiscal year, and remaining unallocated funds. The existing project-specific web handoff opens the release workflow. |
| 6 | Finance reviews, task clearance, messages and access checks refresh on relevant events, on resume or after a bounded foreground interval. |
| 7 | Financial alerts retain record type, ID and Office when supplied. Task-funded escalation resolves fiscal year from the underlying budget. |
| 8 | Nested-work retries read the command receipt before replay. A stale subitem details edit can keep changed fields after the user checks the latest record. Subitem activity uses the existing work-event scope and presentation selectors. |
| 9 | The native conversation list opens the thread and its information sheet. The existing More navigation and composer are retained. |
| 10 | The current conversation directory shows separate project and task conversations. Their creation and membership come from the shared backend. |
| 11 | Conversation and people search, previews and unread dots use server data. Marking read sends the timestamp of the latest loaded message. |
| 12 | The native picker uploads supported images to private conversation storage. The thread supports pinning and reactions. Conversation information includes members, pins and media/links from loaded history. |
| 13 | The login screen can open the existing real-screen walkthroughs on eFlow Web using the approved HTTPS origin. |
| 14 | Guest access rechecks on Realtime recovery and at a bounded interval. Existing auth handling clears protected display state when the backend deactivates a guest. Admin lifecycle actions remain on web. |

## Dependencies and personal QA

- Hosted requirements are the existing settlement staffing/fallback, Office petty cash independence, project funding closeout, nested work command receipts, Messages workspace, and project guest lifecycle contracts documented in the web handoff. The mobile app uses them as deployed and fails closed when a required action or read is unavailable.
- Set the approved `EXPO_PUBLIC_WEB_ORIGIN` for browser handoffs. The current local build has no origin configured.
- With labeled test records, have the only Accounting Officer request and receive cash. Confirm the exact Head Inbox decision opens the right Office and year, the requester cannot self-settle, and the eligible Head action posts once. Check the Accounting queue, journal, task clearance and project funding after reopening on both platforms.
- Try the same flow with two eligible officers, an ineligible Head and a lost response. Verify distinct review and settlement outcomes, no duplicate posting, and the separate Office Petty Cash ledger.
- Test project/task chat, unread state on two devices, photo picking, image access, pins, reactions, membership removal, and old-message pagination.
- Check reloading an uncertain subitem change, a concurrent details edit, and guest account deactivation or expiry. Confirm the native app keeps drafts where authorized and removes unavailable project access.
- Device install and signed-in acceptance are separate from the automated checks and Android/iOS exports.

## Verification

- TypeScript and Metro checks passed. The full mobile test suite passed 245 tests across 79 suites.
- Android and iOS production JavaScript exports passed. The credential audit found zero development-account literals in the two exports.
- Android build 27 produced a standalone APK for arm64-v8a and x86_64. Its v2 signature, embedded app bundle, eFlow launch activity and absence of the development launcher passed artifact checks. The local APK uses the existing Android debug certificate for internal QA. [APK](../../artifacts/M7/eFlow-Mobile-M7-CatchUp-v27-arm64-x86_64.apk) · [Verification receipt](../STANDALONE_V27_APK_VERIFICATION.json)
- No signed-in device test or live financial posting was performed for this handoff.
