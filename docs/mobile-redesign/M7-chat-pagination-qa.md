# M7 chat history pagination

[Android APK v36](../../artifacts/M7/eFlow-Mobile-M7-Chat-History-v36-arm64-x86_64.apk)

| Area | Before | Build 36 |
| --- | --- | --- |
| Opening a conversation | Fetched up to 300 messages. | Opens with the newest 50 and checks whether older messages exist. |
| Older messages | Tapping Load older messages requested the next 100. | Scrolling toward the top requests the next batch of up to 50. The reversed native list keeps loaded message positions as older messages appear above them. |
| Interrupted history read | History loading shared the composer action state. | The history edge shows its own loading and Retry feedback. Loaded messages and the composer remain available. |

Use an approved **Head, Member, or Accounting Staff** QA account that already belongs to a safe conversation with more than 50 messages. Use a second approved participant for live-message checks. Reading an unread conversation uses the existing read receipt. Send only designated QA messages.

1. Open the conversation. Confirm it opens at the newest message. Swipe toward older messages and watch for the next batch to appear above the message you were reading. Continue to the oldest message and check for duplicate rows.
2. Disconnect before reaching the first page boundary. Confirm the current messages remain on screen. Reconnect, tap **Retry**, and verify older messages appear once.
3. Type a draft while a history page loads. Check the composer remains usable, then verify a new QA message from the second participant does not pull you away from older history. Return to the newest messages and verify delivery and the read receipt.
4. Switch to another conversation while an older page is loading. Verify the old conversation's messages never appear in the new thread. Check both themes, large text and TalkBack or VoiceOver.

The change uses the existing channel-scoped Supabase read. Chat history paging makes no hosted changes.

## Verification

- **VERIFIED** on an Android API 36 emulator using a local 65-message fixture. The conversation opened at message 65 and automatically requested older messages near message 16. The visible message area matched pixel for pixel before and after the older batch arrived. An injected read failure showed Retry, and the retry reached message 1. [Newest messages](../../artifacts/M7/build36-chat-first.png) · [Loading](../../artifacts/M7/build36-chat-loading.png) · [After append](../../artifacts/M7/build36-chat-anchored.png) · [Retry](../../artifacts/M7/build36-chat-retry.png) · [Oldest messages](../../artifacts/M7/build36-chat-oldest.png)
- **VERIFIED** for TypeScript, Metro, both production JS exports and 259 tests. The full Jest process logged an unrelated SettlementPanel teardown error after the assertions passed. All suites passed when run in two groups.
- **VERIFIED** for the signed Android APK and credential audit. The APK includes the production chat sources and opened to sign-in on the emulator. [APK verification](../STANDALONE_V36_APK_VERIFICATION.json) · [Credential audit](M7-chat-v36-release-audit.json) · [Sign-in screenshot](../../artifacts/M7/build36-release-login.png)
- **BLOCKED** for live conversation testing with approved participants and native iOS compilation and workflow checks. The emulator fixture used no server-confirmed actor.
- **NOT TESTED** for physical device acceptance, live delivery while reading older messages, alternate themes, accessibility services and font scaling.
