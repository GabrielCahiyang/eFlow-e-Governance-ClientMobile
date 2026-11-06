/** Bound waiting in read-only views. No retry and no write is performed here. */
export async function readWithTimeout<T>(
  load: () => Promise<T>,
  milliseconds = 25_000,
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
