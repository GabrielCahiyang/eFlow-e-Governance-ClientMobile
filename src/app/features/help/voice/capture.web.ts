import { HandsFreeMicrophone } from "../../../../core/web/app/features/help-assistant/services/handsFreeMicrophone";
import { LIVE_TURN_SILENCE_MS } from "../../../../core/web/app/features/help-assistant/services/voiceActivity";
import type { CaptureEvents, VoiceCapture } from "./captureTypes";
export function createVoiceCapture(events: CaptureEvents): VoiceCapture {
  let closed = false;
  const waves = new WeakMap<Blob, Promise<Uint8Array>>();
  const pending = new Set<Promise<void>>();
  const push = (blob: Blob, final: boolean) => {
    let bytes = waves.get(blob);
    if (!bytes) {
      bytes = blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
      waves.set(blob, bytes);
    }
    const task = bytes
      .then((buffer) => {
        if (!closed) events.audio(buffer, final);
      })
      .catch(() => {
        if (!closed) events.ended("The captured audio could not be read.");
      });
    pending.add(task);
    void task.finally(() => pending.delete(task));
  };
  const microphone = new HandsFreeMicrophone(
    (blob) => {
      push(blob, true);
      if (!events.holdAfterTurn) microphone.pause(false);
    },
    () =>
      events.ended(
        "The microphone stopped. Check microphone access and try again.",
      ),
    {
      silenceMs: LIVE_TURN_SILENCE_MS,
      onPreview: (blob) => push(blob, false),
      onSignal: events.signal,
    },
  );
  return {
    start: () => microphone.start(),
    pause: (value) => microphone.pause(value),
    async finish() {
      microphone.finish();
      await Promise.all([...pending]);
    },
    async stop() {
      closed = true;
      microphone.stop();
    },
  };
}
