# Native Help and eFlow Live — 28 October 2026

This is native application code. The Android capture module compiles; neither Android nor iOS microphone/voice acceptance has passed. The browser preview, synthetic PCM tests and successful compilation are different evidence from a real microphone conversation.

## Connection and audio contract

The phone microphone produces foreground mono signed 16-bit PCM at 16 kHz. The local `EFlowPcm` Expo module sends short PCM events to the native application; it does not run a speech model or write microphone files. iOS converts its hardware input format with AVAudioConverter; Android uses AudioRecord with optional device echo cancellation/noise suppression.

The existing VoiceActivity detector controls turn boundaries locally. After speech, two seconds of quiet finalizes the turn independently of a Parakeet response. Preview snapshots update the draft while speech continues. The serialized transcription queue replaces obsolete previews, retains accepted final turns, and reuses an identical preview result at the final silence boundary.

The bounded WAV payload goes through the existing authenticated Help gateway to Parakeet Redux on the AI host. A Live question uses the existing `mode: live` request, preserving the server's smaller Live model configuration. Typed Help continues to use `mode: chat`. Neither mode changes work, account permissions or project membership.

Kitten speech uses the existing reply ID/part protocol, one-part-ahead prefetch and temporary-file cleanup. Live playback keeps the recording-compatible audio session; capture events are ignored while the answer is processing or playing so speaker output does not become another question. This is turn-based hands-free conversation, with an explicit Interrupt answer action rather than unverified full-duplex barge-in.

## Interaction and cleanup

- The composer microphone progressively fills the draft. Stop dictation waits for final audio conversion and transcription before closing capture. Sending remains a separate action.
- eFlow Live opens its own larger responsive dialog. Pause listening does not cancel answer generation, synthesis or playback. End and Interrupt answer are separate actions.
- Ending, changing account/project, leaving Help or backgrounding the app invalidates the capture generation and discards late results. An iOS microphone permission sheet may temporarily make the app inactive during startup; it does not count as intentional backgrounding. Entering the background always stops capture.
- Permission denial, a missing capture module, absent audio frames and ASR errors produce visible errors. Speech never silently falls back to a different cloud speech provider.
- Native uses the current system microphone. Native input-device selection, Bluetooth routing/interruption acceptance and full-duplex barge-in remain unverified or unported.

## Evidence

Tests validate the WAV header/PCM round trip, two-second local silence boundary, preview/final serialization and reuse, cancellation of stale transcripts, final-conversion drain, permission-start cancellation, inactive/background handling, Live request mode, and Pause preserving an in-progress reply. They use simulated audio and mocked services; no real person was recorded for these tests.

The Android module compiled with `:eflow-pcm:compileDebugKotlin`. Local modules are autolinked from `modules/`; see [Expo custom native code](https://docs.expo.dev/workflow/customizing/) and [module lifecycle/events](https://docs.expo.dev/modules/module-api/). iOS compilation requires Xcode and remains pending.

## Manual acceptance

1. Install a build that includes EFlowPcm, start the existing gateway/AI host, and grant microphone access in the app.
2. Dictate a multi-part question; verify progressive text, then stop the mic and edit/send the complete draft.
3. Open Live, speak, and verify the turn ends after approximately two seconds of local quiet even while ASR is slow.
4. Pause while the answer is preparing or speaking. It must continue; no additional question should start until listening resumes.
5. Interrupt an answer, then speak again. A late cancelled response must not pause or overwrite the new turn.
6. End, switch project/account, navigate away and background the app. Verify microphone access ends and late private transcripts do not appear elsewhere.
7. Repeat on Android and iOS, including initial permission, denial, headphones/Bluetooth, lock/unlock and an incoming call. No device results are asserted here.
