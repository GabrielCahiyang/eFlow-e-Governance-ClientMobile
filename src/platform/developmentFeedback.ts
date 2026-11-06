import { LogBox, Platform } from "react-native";

// These are handled by the application's connection/retry UI. Keep the console
// diagnostics intact, but don't add a second developer overlay for them.
export const expectedConnectionLogs = [
  /^(?:TypeError:\s*)?Network request failed\.?$/i,
  /^(?:TypeError:\s*)?(?:fetch failed:\s*)?(?:java\.net\.)?(?:UnknownHostException|SocketTimeoutException|ConnectException):/i,
  /^(?:TypeError:\s*)?Failed to fetch\.?$/i,
];

export function configureDevelopmentFeedback() {
  if (__DEV__ && Platform.OS !== "web")
    LogBox.ignoreLogs(expectedConnectionLogs);
}
