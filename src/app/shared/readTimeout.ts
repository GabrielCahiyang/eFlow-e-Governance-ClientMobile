export const DEFAULT_READ_TIMEOUT_MS = 60_000;

/** Bound waiting in read-only views. No retry and no write is performed here. */
export async function readWithTimeout<T>(
  load: () => Promise<T>,
  milliseconds = DEFAULT_READ_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Object.assign(new Error("Read timed out"), {
                name: "TimeoutError",
              }),
            ),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
