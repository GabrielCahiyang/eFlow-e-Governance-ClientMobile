const UUID_PATTERN =
  /^(?:GUEST-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true when a display string is a raw UUID or guest ID that should not be shown to users. */
export function isRawEntityId(value?: string | null): boolean {
  const trimmed = value?.trim();
  return !!trimmed && UUID_PATTERN.test(trimmed);
}
