export const backendConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  publicKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "",
  gateway: process.env.EXPO_PUBLIC_EFLOW_GATEWAY_URL || "",
  webOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN || "",
};
export const configurationError =
  !backendConfig.url || !backendConfig.publicKey
    ? "Configure the eFlow connection before signing in."
    : !/^https:\/\/ixnfphgjyelhckjwjkdv\.supabase\.co\/?$/.test(
          backendConfig.url,
        )
      ? "This build is configured for an unexpected eFlow database."
      : "";
