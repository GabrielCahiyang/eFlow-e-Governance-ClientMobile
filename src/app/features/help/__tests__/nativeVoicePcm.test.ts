import { test, expect, jest } from "@jest/globals";
import { base64Bytes, decodePcm16, waveBytes } from "../voice/pcm";
import {
  VoiceActivity,
  LIVE_TURN_SILENCE_MS,
} from "../../../../core/web/app/features/help-assistant/services/voiceActivity";
test("native ASR encoding is a valid bounded mono 16 kHz 16-bit PCM WAV", () => {
  const samples = new Float32Array(16000);
  samples[0] = -1;
  samples[1] = 1;
  samples[2] = 0.5;
  const wave = waveBytes(samples),
    header = new DataView(wave.buffer);
  expect(
    Uint8Array.from(atob(base64Bytes(wave)), (c) => c.charCodeAt(0)),
  ).toEqual(wave);
  expect(String.fromCharCode(...wave.subarray(0, 4))).toBe("RIFF");
  expect(header.getUint32(4, true)).toBe(32036);
  expect(header.getUint16(20, true)).toBe(1);
  expect(header.getUint16(22, true)).toBe(1);
  expect(header.getUint32(24, true)).toBe(16000);
  expect(header.getUint16(34, true)).toBe(16);
  expect([...decodePcm16(base64Bytes(wave.subarray(44, 50)))]).toEqual([
    -1,
    32767 / 32768,
    16383 / 32768,
  ]);
  expect(() => waveBytes(new Float32Array(3999))).toThrow("0.25");
  expect(() => waveBytes(new Float32Array(400001))).toThrow("25 seconds");
});
test("native local turn detection finishes at two seconds of quiet without waiting for ASR", () => {
  const final = jest.fn(),
    preview = jest.fn(),
    voice = new VoiceActivity(16000, final, preview, LIVE_TURN_SILENCE_MS),
    talk = new Float32Array(1600).fill(0.04),
    quiet = new Float32Array(1600);
  for (let i = 0; i < 6; i++) voice.feed(talk);
  for (let i = 0; i < 19; i++) voice.feed(quiet);
  expect(preview).toHaveBeenCalled();
  expect(final).not.toHaveBeenCalled();
  voice.feed(quiet);
  expect(final).toHaveBeenCalledTimes(1);
  expect(final.mock.calls[0][0]).toHaveLength(9600);
  for (let i = 0; i < 30; i++) voice.feed(quiet);
  expect(final).toHaveBeenCalledTimes(1);
});
