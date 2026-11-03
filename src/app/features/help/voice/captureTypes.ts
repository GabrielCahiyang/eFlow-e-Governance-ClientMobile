import type { MicrophoneSignal } from "../../../../core/web/app/features/help-assistant/types";
export interface CaptureEvents {
  audio: (audio: Uint8Array, final: boolean) => void;
  signal: (signal: MicrophoneSignal) => void;
  ended: (message: string) => void;
  holdAfterTurn: boolean;
}
export interface VoiceCapture {
  start: () => Promise<void>;
  pause: (paused: boolean) => void;
  finish: () => void | Promise<void>;
  stop: () => Promise<void>;
}
