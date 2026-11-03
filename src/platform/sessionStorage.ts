import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// JWTs can exceed a platform keychain item's historical size limit. Chunk the
// serialized session; write the new generation before switching its pointer.
const CHUNK = 1500;
const safe = (key: string) => "eflow." + key.replace(/[^a-zA-Z0-9._-]/g, "_");
async function read(key: string) {
  return Platform.OS === "web"
    ? (globalThis.localStorage?.getItem(key) ?? null)
    : SecureStore.getItemAsync(key);
}
async function write(key: string, value: string) {
  if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
  else
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
async function remove(key: string) {
  if (Platform.OS === "web") globalThis.localStorage?.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}
export const sessionStorage = {
  async getItem(key: string, strict = false) {
    const base = safe(key);
    const raw = await read(base);
    if (!raw) return null;
    try {
      const meta = JSON.parse(raw);
      if (
        meta.v !== 1 ||
        !Number.isInteger(meta.count) ||
        meta.count < 1 ||
        meta.count > 100 ||
        typeof meta.generation !== "string" ||
        !/^[a-z0-9-]+$/.test(meta.generation)
      )
        throw new Error("Invalid secure record metadata.");
      const chunks = await Promise.all(
        Array.from({ length: meta.count }, (_, i) =>
          read(`${base}.${meta.generation}.${i}`),
        ),
      );
      if (chunks.some((c) => c === null))
        throw new Error("A secure record is incomplete.");
      return chunks.join("");
    } catch (error) {
      if (strict)
        throw new Error(
          "This saved request could not be read. Verify its original result before creating another request.",
        );
      return null;
    }
  },
  async setItem(key: string, value: string) {
    const base = safe(key),
      previous = await read(base),
      generation =
        Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
      count = Math.max(1, Math.ceil(value.length / CHUNK));
    if (count > 100)
      throw new Error(
        "This secure record exceeds the supported size. The existing record was kept.",
      );
    for (let i = 0; i < count; i++)
      await write(
        `${base}.${generation}.${i}`,
        value.slice(i * CHUNK, (i + 1) * CHUNK),
      );
    await write(base, JSON.stringify({ v: 1, generation, count }));
    if (previous) {
      try {
        const old = JSON.parse(previous);
        await Promise.all(
          Array.from({ length: Math.min(old.count || 0, 100) }, (_, i) =>
            remove(`${base}.${old.generation}.${i}`),
          ),
        );
      } catch {
        /* replaced invalid metadata */
      }
    }
  },
  async removeItem(key: string) {
    const base = safe(key),
      raw = await read(base);
    await remove(base);
    if (raw) {
      try {
        const old = JSON.parse(raw);
        await Promise.all(
          Array.from({ length: Math.min(old.count || 0, 100) }, (_, i) =>
            remove(`${base}.${old.generation}.${i}`),
          ),
        );
      } catch {
        /* no readable prior generation */
      }
    }
  },
};
