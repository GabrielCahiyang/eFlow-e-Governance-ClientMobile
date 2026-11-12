import { supabase } from "../../platform/supabase";
import { draftStore } from "../../platform/draftStore";
import { PublicMessageError } from "./userMessages";

export async function sharedWorkRpc<T>(
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await supabase.rpc(name, args);
  if (error?.code === "PGRST202" || error?.code === "42883")
    throw new PublicMessageError(
      "This shared work contract is currently unavailable.",
    );
  if (error)
    throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}

export type SharedWorkRequest = { id: string; args: Record<string, unknown> };

export async function saveSharedWork<T>(
  actor: string,
  scope: string,
  name: string,
  request: SharedWorkRequest,
  isReceipt: (value: unknown) => value is T,
  recovering = false,
) {
  const session = await supabase.auth.getSession();
  if (session.error || session.data.session?.user.id !== actor)
    throw new PublicMessageError("Sign in with the same account to continue.");
  await draftStore.set(actor, scope, request);
  try {
    const receipt = await sharedWorkRpc<unknown>(name, request.args);
    if (!isReceipt(receipt))
      throw new PublicMessageError(
        "The result could not be confirmed. Verify this saved request before submitting again.",
      );
    // A confirmed result remains safe to replay if cleanup fails.
    await draftStore.remove(actor, scope).catch(() => {});
    return receipt;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (!recovering && code && /^(22|23|42501|40001)/.test(code))
      await draftStore.remove(actor, scope).catch(() => {});
    throw error;
  }
}
