/** Mobile presentation only. Keep authoritative names and record IDs intact. */
export function officeLabel(name?: string | null, fallback = "Office"): string {
  if (!name) return fallback;
  if (!/\bledipo\b/i.test(name)) return name;
  return (
    name
      .replace(/\bledipo\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || fallback
  );
}

/** Optional context copy: avoid redundant project/workspace type placeholders. */
export function officeContextLabel(name?: string | null): string {
  const label = officeLabel(name, "");
  return /^(?:office(?: workspace)?|personal(?: workspace)?)$/i.test(
    label.trim(),
  )
    ? ""
    : label;
}
