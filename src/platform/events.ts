type Listener = (event: { type: string; detail?: unknown }) => void;
const channels = new Map<string, Set<Listener>>();
export const appEvents = {
  addEventListener(type: string, listener: Listener) {
    if (!channels.has(type)) channels.set(type, new Set());
    channels.get(type)!.add(listener);
  },
  removeEventListener(type: string, listener: Listener) {
    channels.get(type)?.delete(listener);
  },
  dispatchEvent(event: { type: string; detail?: unknown }) {
    channels.get(event.type)?.forEach((listener) => listener(event));
    return true;
  },
};
