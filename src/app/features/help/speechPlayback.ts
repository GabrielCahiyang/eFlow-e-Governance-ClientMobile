import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import type { HelpReply } from "../../../core/web/app/features/help-assistant/types";
import { fetchNativeSpeech } from "./services";
type SpeechPart = { uri: string; parts: number; dispose: () => void };
async function partSource(
  reply: HelpReply,
  part: number,
  signal: AbortSignal,
): Promise<SpeechPart> {
  const result = await fetchNativeSpeech(reply, part, signal);
  if (Platform.OS === "web")
    return {
      uri: "data:audio/wav;base64," + result.audio,
      parts: result.parts,
      dispose: () => {},
    };
  const file = new File(Paths.cache, `eflow-help-${crypto.randomUUID()}.wav`);
  file.write(result.audio, { encoding: "base64" });
  return {
    uri: file.uri,
    parts: result.parts,
    dispose: () => {
      if (file.exists) file.delete();
    },
  };
}
export async function playNativeReply(
  reply: HelpReply,
  signal: AbortSignal,
  onStage: (value: "preparing" | "speaking") => void,
  options?: { keepMicrophoneSession?: boolean },
) {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: !!options?.keepMicrophoneSession,
    shouldPlayInBackground: false,
  });
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  // Resolve prefetch errors into values so stopping audio never leaves an
  // unhandled rejection in the one-part-ahead pipeline.
  const fetchPart = (index: number) =>
    partSource(reply, index, controller.signal).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
  let pending = fetchPart(0),
    player: AudioPlayer | undefined,
    current: SpeechPart | undefined;
  try {
    for (let index = 0; index < 4; index++) {
      onStage("preparing");
      const result = await pending;
      if ("error" in result) throw result.error;
      current = result.value;
      if (controller.signal.aborted) return;
      const more = index + 1 < current.parts;
      if (more) pending = fetchPart(index + 1);
      player = createAudioPlayer(current.uri, { updateInterval: 100 });
      const audio = player;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let loaded = false;
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          subscription.remove();
          controller.signal.removeEventListener("abort", stopped);
          error ? reject(error) : resolve();
        };
        const stopped = () => {
          audio.pause();
          finish();
        };
        const subscription = audio.addListener(
          "playbackStatusUpdate",
          (status) => {
            if (status.isLoaded && !loaded) {
              loaded = true;
              onStage("speaking");
            }
            if (status.didJustFinish) finish();
          },
        );
        const timeout = setTimeout(
          () =>
            finish(
              new Error(
                "Audio playback timed out. The written answer is still available.",
              ),
            ),
          120000,
        );
        controller.signal.addEventListener("abort", stopped, { once: true });
        if (controller.signal.aborted) stopped();
        else audio.play();
      });
      player.remove();
      player = undefined;
      current.dispose();
      current = undefined;
      if (!more || controller.signal.aborted) return;
    }
  } finally {
    controller.abort();
    signal.removeEventListener("abort", abort);
    player?.remove();
    current?.dispose();
    // A prefetched part may complete at the same time as Stop/unmount.
    const extra = await pending;
    if ("value" in extra) extra.value.dispose();
  }
}
