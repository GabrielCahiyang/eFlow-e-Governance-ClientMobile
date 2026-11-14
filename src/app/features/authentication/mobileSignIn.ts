import { backendConfig, configurationError } from "../../../platform/config";
import { supabase } from "../../../platform/supabase";
import {
  AccountSignInError,
  signInWithAccountProtection,
} from "../../../core/web/app/features/authentication/services/accountLogin";

const unavailable =
  "The secure sign-in service is unavailable. Please try again shortly.";

export async function signInOnMobile(email: string, password: string) {
  if (configurationError) throw new Error(configurationError);
  if (!backendConfig.mobileSignIn) {
    return signInWithAccountProtection(email, password);
  }

  const url = new URL("/functions/v1/mobile-sign-in", backendConfig.url);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      apikey: backendConfig.publicKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: email.trim(), password }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(55_000),
  });
  if (!response.ok) {
    const message =
      response.status === 423
        ? "Your account is locked. Contact an Admin to unlock it."
        : response.status === 401
          ? "Email or password is incorrect."
          : response.status === 403
            ? "This account cannot sign in yet. Confirm your email or contact an Admin."
            : response.status === 429
              ? "Sign-in is busy. Please try again shortly."
              : unavailable;
    throw new AccountSignInError(response.status, message);
  }
  const body = await response.json().catch(() => null);
  if (
    typeof body?.access_token !== "string" ||
    !body.access_token ||
    typeof body?.refresh_token !== "string" ||
    !body.refresh_token
  ) {
    throw new Error("Unable to finish sign-in. Please try again.");
  }
  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) throw new Error("Unable to finish sign-in. Please try again.");
}
