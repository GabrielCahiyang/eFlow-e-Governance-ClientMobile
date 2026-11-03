const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function base64Bytes(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1] || 0,
      c = bytes[i + 2] || 0;
    text +=
      alphabet[a >>> 2] +
      alphabet[((a & 3) << 4) | (b >>> 4)] +
      (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >>> 6)] : "=") +
      (i + 2 < bytes.length ? alphabet[c & 63] : "=");
  }
  return text;
}
export function decodePcm16(text: string): Float32Array {
  if (
    text.length > 24000 ||
    text.length % 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(text)
  )
    throw new Error("The microphone delivered invalid PCM audio.");
  const size =
      (text.length / 4) * 3 -
      (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0),
    bytes = new Uint8Array(size);
  let at = 0;
  for (let i = 0; i < text.length; i += 4) {
    const a = alphabet.indexOf(text[i]),
      b = alphabet.indexOf(text[i + 1]),
      c = alphabet.indexOf(text[i + 2]),
      d = alphabet.indexOf(text[i + 3]);
    bytes[at++] = (a << 2) | (b >>> 4);
    if (at < size) bytes[at++] = ((b & 15) << 4) | (Math.max(0, c) >>> 2);
    if (at < size) bytes[at++] = ((Math.max(0, c) & 3) << 6) | Math.max(0, d);
  }
  if (size % 2)
    throw new Error("The microphone delivered incomplete PCM audio.");
  const data = new DataView(bytes.buffer),
    samples = new Float32Array(size / 2);
  for (let i = 0; i < samples.length; i++)
    samples[i] = data.getInt16(i * 2, true) / 32768;
  return samples;
}
export function waveBytes(samples: Float32Array): Uint8Array {
  if (samples.length < 4000 || samples.length > 400000)
    throw new Error("Speech must be between 0.25 and 25 seconds.");
  const bytes = new Uint8Array(44 + samples.length * 2),
    view = new DataView(bytes.buffer),
    text = (at: number, value: string) =>
      [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value * (value < 0 ? 32768 : 32767), true);
  }
  return bytes;
}
