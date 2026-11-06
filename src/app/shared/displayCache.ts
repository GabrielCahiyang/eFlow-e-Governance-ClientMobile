/** Session memory only; never persist credentials, capabilities or financial records. */
export type DisplayCachePolicy<T> = { actor: string; select: (data: T) => T };
export type CacheInvalidation = "data" | "access" | "identity";
type Entry = { data: unknown; at: number };
const entries = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();
const listeners = new Set<(reason: CacheInvalidation) => void>();
let actor: string | null = null,
  epoch = 0,
  accessEpoch = 0;
export const displayFreshFor = 30_000;
const maximumAge = 5 * 60_000,
  maximumEntries = 24;
export function setDisplayCacheActor(next: string | null) {
  if (actor === next) return;
  actor = next;
  clearDisplayCache("identity");
}
export function clearDisplayCache(reason: CacheInvalidation = "access") {
  ++epoch;
  if (reason !== "data") ++accessEpoch;
  entries.clear();
  pending.clear();
  listeners.forEach((listener) => listener(reason));
}
export function subscribeDisplayCache(
  listener: (reason: CacheInvalidation) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function displayCacheEpoch() {
  return epoch;
}
export function authoritativeReadEpoch() {
  return accessEpoch;
}
export function displayCacheFresh(key: string, owner?: string) {
  const entry = entries.get(key);
  return (
    !!owner &&
    displayCacheOwns(owner) &&
    !!entry &&
    Date.now() - entry.at < displayFreshFor
  );
}
export function displayCacheOwns(owner: string) {
  return !!actor && owner === actor;
}
export function readDisplayCache<T>(
  key: string,
  policy?: DisplayCachePolicy<T>,
): T | undefined {
  if (!policy || !actor || actor !== policy.actor) return;
  const item = entries.get(key);
  if (!item) return;
  if (Date.now() - item.at >= maximumAge) {
    entries.delete(key);
    return;
  }
  entries.delete(key);
  entries.set(key, item);
  return item.data as T;
}
export function loadDisplayData<T>(
  key: string,
  load: () => Promise<T>,
  policy?: DisplayCachePolicy<T>,
): Promise<T> {
  if (policy && !displayCacheOwns(policy.actor)) return load();
  // Coalesce concurrent reads only. Authoritative results are never stored.
  const requestKey = JSON.stringify([epoch, actor, key, !!policy]);
  const running = pending.get(requestKey) as Promise<T> | undefined;
  if (running) return running;
  const generation = epoch;
  const request = Promise.resolve()
    .then(load)
    .then((data) => {
      if (policy && epoch === generation && actor === policy.actor) {
        const display = policy.select(data);
        entries.delete(key);
        entries.set(key, { data: display, at: Date.now() });
        while (entries.size > maximumEntries)
          entries.delete(entries.keys().next().value!);
      }
      return data;
    })
    .finally(() => {
      if (pending.get(requestKey) === request) pending.delete(requestKey);
    });
  pending.set(requestKey, request);
  return request;
}
