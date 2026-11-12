import { feedback, isConnectionFailure } from "../../shared/userMessages";
export function loginErrorMessage(error: unknown): string {
  const item = error as {
    name?: string;
    status?: number;
    message?: string;
  } | null;
  if (item?.name === "AccountSignInError") {
    switch (item.status) {
      case 401:
      case 423:
        return feedback.invalidCredentials;
      case 403:
        return "Please confirm your email or contact your Office support team for help signing in.";
      case 429:
        return "Please wait a moment before trying to sign in again.";
    }
  }
  if (item?.name === "TimeoutError" || /timed? out/i.test(item?.message || ""))
    return feedback.timeout;
  if (isConnectionFailure(error)) return feedback.connection;
  return "We couldn't sign you in right now. Please try again shortly.";
}
