import { isConnectionFailure } from "./userMessages";

/** Retry a read once after a transport error. Callers still own the total wait. */
export async function retryTransientRead<T>(
  load: () => Promise<T>,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    const failure = error as
      { status?: number; code?: string; name?: string } | undefined;
    if (
      failure?.status === 401 ||
      failure?.status === 403 ||
      failure?.code === "42501" ||
      failure?.name === "AbortError" ||
      !(
        isConnectionFailure(error) ||
        (failure?.status && failure.status >= 500)
      )
    )
      throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const result = await load();
      if (__DEV__) console.info("eFlow read retry", { outcome: "ok" });
      return result;
    } catch (retryError) {
      if (__DEV__)
        console.warn("eFlow read retry", {
          outcome: "failed",
          errorClass: (retryError as Error)?.name || "Unknown",
        });
      throw retryError;
    }
  }
}
