export type NativeEntryLink = {
  kind: "activation" | "invitation" | "project-invitation" | "project-share";
  token: string;
};
/** Accept app links or the configured eFlow web origin; never arbitrary hosts. */
export function parseNativeEntryLink(
  raw: string,
  webOrigin = "",
): NativeEntryLink | null {
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    let path: string;
    if (url.protocol === "eflow:")
      path =
        "/" +
        [url.hostname, url.pathname]
          .join("/")
          .replace(/^\/+|\/+$/g, "")
          .replace(/\/+/g, "/");
    else {
      if (
        !webOrigin ||
        url.protocol !== "https:" ||
        url.origin !== new URL(webOrigin).origin
      )
        return null;
      path = url.pathname;
    }
    const kind =
      path === "/project-share"
        ? "project-share"
        : path === "/activate-account"
          ? "activation"
          : path === "/accept-invite"
            ? "invitation"
            : path === "/accept-project-invite"
              ? "project-invitation"
              : null;
    const tokens = url.searchParams.getAll(
      kind === "project-share" ? "grant" : "token",
    );
    if (
      kind === "project-share" &&
      (tokens.length !== 1 ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          tokens[0],
        ))
    )
      return null;
    return kind &&
      tokens.length === 1 &&
      tokens[0].length >= 16 &&
      tokens[0].length <= 4096 &&
      !/[\s\x00-\x1f]/.test(tokens[0])
      ? { kind, token: tokens[0] }
      : null;
  } catch {
    return null;
  }
}
