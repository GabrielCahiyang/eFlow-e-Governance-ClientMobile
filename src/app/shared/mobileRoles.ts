export const mobileRoles = ["head", "member", "accounting_staff"] as const;
export function isMobileRole(role: unknown) {
  return (
    typeof role === "string" &&
    (mobileRoles as readonly string[]).includes(role)
  );
}
