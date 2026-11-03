type TimerHost = Pick<
  typeof globalThis,
  "setTimeout" | "clearTimeout" | "setInterval" | "clearInterval"
>;
/** Browser-native timer functions require their own host as `this`. */
export function createTimerBridge(host: TimerHost) {
  return {
    setTimeout: host.setTimeout.bind(host),
    clearTimeout: host.clearTimeout.bind(host),
    setInterval: host.setInterval.bind(host),
    clearInterval: host.clearInterval.bind(host),
  };
}
