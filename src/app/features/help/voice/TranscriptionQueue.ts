import { helpRequest } from "../../../../core/web/app/features/help-assistant/services/helpApi";
import { base64Bytes } from "./pcm";
type Snapshot = { audio: Uint8Array; final: boolean; turn: number };
type Events = {
  text: (text: string) => void;
  final: (text: string) => void;
  error: (message: string, final: boolean) => void;
  busy: (value: boolean) => void;
};
/** One ASR request at a time. New previews replace previews; accepted finals stay queued. */
export class TranscriptionQueue {
  private turn = 0;
  private finals: Snapshot[] = [];
  private preview?: Snapshot;
  private committed = "";
  private controller?: AbortController;
  private active?: Snapshot;
  private recognized?: { audio: Uint8Array; turn: number; text: string };
  private running = false;
  private closed = false;
  private idle: (() => void)[] = [];
  constructor(
    private events: Events,
    private accumulate: boolean,
  ) {}
  push(audio: Uint8Array, final: boolean) {
    if (this.closed) return;
    if (audio.byteLength > 800044) {
      this.events.error(
        "This voice turn is too long. Use a shorter question.",
        final,
      );
      return;
    }
    const snapshot = { audio, final, turn: this.turn };
    if (final) {
      if (this.finals.length >= 3) {
        this.events.error(
          "Transcription cannot keep up. Stop the mic and let the current words finish.",
          true,
        );
        return;
      }
      this.finals.push(snapshot);
      this.turn++;
      this.preview = undefined;
      if (this.active && !this.active.final && this.active.audio !== audio)
        this.controller?.abort();
    } else this.preview = snapshot;
    void this.drain();
  }
  private async drain() {
    if (this.closed || this.running) return;
    this.running = true;
    this.events.busy(true);
    try {
      while (!this.closed) {
        const snapshot = this.finals.shift() || this.preview;
        if (!snapshot) break;
        if (!snapshot.final) this.preview = undefined;
        const controller = new AbortController();
        this.controller = controller;
        this.active = snapshot;
        try {
          const result =
            this.recognized?.audio === snapshot.audio &&
            this.recognized.turn === snapshot.turn
              ? { text: this.recognized.text }
              : await helpRequest<{ text: string }>(
                  "transcribe",
                  controller.signal,
                  { audio: base64Bytes(snapshot.audio) },
                );
          if (this.closed || controller.signal.aborted) continue;
          if (typeof result.text !== "string")
            throw new Error(
              "The speech service returned an unreadable transcript.",
            );
          const text = result.text.trim().slice(0, 2000);
          this.recognized = {
            audio: snapshot.audio,
            turn: snapshot.turn,
            text,
          };
          if (snapshot.final) {
            if (this.accumulate && text)
              this.committed = [this.committed, text]
                .filter(Boolean)
                .join(" ")
                .slice(0, 2000);
            this.events.text(this.accumulate ? this.committed : text);
            this.events.final(text);
          } else if (text)
            this.events.text(
              (this.accumulate
                ? [this.committed, text].filter(Boolean).join(" ")
                : text
              ).slice(0, 2000),
            );
        } catch (error) {
          if (!this.closed && !controller.signal.aborted)
            this.events.error(
              error instanceof Error
                ? error.message
                : "Transcription failed. Try the microphone again.",
              snapshot.final,
            );
        } finally {
          if (this.controller === controller) {
            this.controller = undefined;
            this.active = undefined;
          }
        }
      }
    } finally {
      this.running = false;
      if (!this.closed) this.events.busy(false);
      this.idle.splice(0).forEach((done) => done());
    }
  }
  async finish() {
    if (this.running)
      await new Promise<void>((resolve) => this.idle.push(resolve));
  }
  cancel() {
    this.closed = true;
    this.controller?.abort();
    this.finals = [];
    this.preview = undefined;
    this.committed = "";
    this.recognized = undefined;
    this.idle.splice(0).forEach((done) => done());
  }
}
