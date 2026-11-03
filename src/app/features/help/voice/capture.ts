import { requireOptionalNativeModule, NativeModule } from "expo";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import {
  VoiceActivity,
  LIVE_TURN_SILENCE_MS,
  VOICE_RMS_THRESHOLD,
} from "../../../../core/web/app/features/help-assistant/services/voiceActivity";
import { decodePcm16, waveBytes } from "./pcm";
import type { CaptureEvents, VoiceCapture } from "./captureTypes";
type PcmEvent = { captureId: string; pcm: string; sampleRate: number };
type PcmEvents = {
  onPcm: (event: PcmEvent) => void;
  onEnded: (event: { captureId: string; message: string }) => void;
};
declare class PcmModule extends NativeModule<PcmEvents> {
  start(id: string): Promise<void>;
  stop(): Promise<void>;
}
export function createVoiceCapture(events: CaptureEvents): VoiceCapture {
  const module = requireOptionalNativeModule<PcmModule>("EFlowPcm");
  let active = false,
    paused = false,
    closed = false,
    id = crypto.randomUUID(),
    subscriptions: { remove: () => void }[] = [],
    lastVoice = 0,
    firstFrame = 0;
  let monitor: ReturnType<typeof setInterval> | undefined;
  const waves = new WeakMap<Float32Array, Uint8Array>();
  const wave = (samples: Float32Array) => {
    let bytes = waves.get(samples);
    if (!bytes) {
      bytes = waveBytes(samples);
      waves.set(samples, bytes);
    }
    return bytes;
  };
  const detector = new VoiceActivity(
    16000,
    (samples) => {
      if (events.holdAfterTurn) paused = true;
      events.audio(wave(samples), true);
    },
    (samples) => events.audio(wave(samples), false),
    LIVE_TURN_SILENCE_MS,
  );
  return {
    async start() {
      if (!module)
        throw new Error(
          "This app build does not contain native microphone capture. Install the rebuilt eFlow development app.",
        );
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Microphone permission was not granted. Typed Help remains available.",
        );
      if (closed) return;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      if (closed) return;
      subscriptions = [
        module.addListener("onPcm", (event) => {
          if (closed || !active || paused || event.captureId !== id) return;
          try {
            if (event.sampleRate !== 16000)
              throw new Error(
                "The microphone sample rate changed. Restart the conversation.",
              );
            const frame = decodePcm16(event.pcm),
              rms = Math.sqrt(
                frame.reduce((s, v) => s + v * v, 0) /
                  Math.max(1, frame.length),
              ),
              now = Date.now();
            if (!firstFrame) firstFrame = now;
            if (rms >= VOICE_RMS_THRESHOLD) lastVoice = now;
            detector.feed(frame);
            events.signal({
              level: Math.min(1, rms * 40),
              receiving: true,
              speaking: rms >= VOICE_RMS_THRESHOLD,
              ending: detector.ending,
              label:
                rms >= VOICE_RMS_THRESHOLD
                  ? "Hearing audio"
                  : detector.ending
                    ? "Finishing your turn"
                    : "Waiting for speech",
              warning:
                now - (lastVoice || firstFrame) > 6000
                  ? "No audible input detected. Check that your microphone is not muted."
                  : "",
            });
          } catch (error) {
            events.ended(
              error instanceof Error
                ? error.message
                : "Microphone capture failed.",
            );
          }
        }),
        module.addListener("onEnded", (event) => {
          if (!closed && event.captureId === id) events.ended(event.message);
        }),
      ];
      active = true;
      try {
        await module.start(id);
        if (closed) {
          await module.stop();
          return;
        }
        const started = Date.now();
        monitor = setInterval(() => {
          if (
            !closed &&
            !paused &&
            !firstFrame &&
            Date.now() - started > 5000
          ) {
            clearInterval(monitor);
            events.ended(
              "No microphone frames arrived. Check app microphone access and the selected system input.",
            );
          }
        }, 1000);
      } catch (error) {
        active = false;
        subscriptions.forEach((s) => s.remove());
        subscriptions = [];
        throw error;
      }
    },
    pause(value) {
      paused = value;
      detector.reset();
      lastVoice = Date.now();
      events.signal({
        level: 0,
        receiving: active,
        label: value ? "Microphone paused" : "Waiting for speech",
        warning: "",
      });
    },
    finish() {
      if (active && !paused) detector.finish();
    },
    async stop() {
      if (closed) return;
      closed = true;
      clearInterval(monitor);
      active = false;
      detector.reset();
      subscriptions.forEach((s) => s.remove());
      subscriptions = [];
      await module?.stop();
    },
  };
}
