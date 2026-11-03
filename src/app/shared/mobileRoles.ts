export const mobileRoles = ["head", "member", "accounting_staff"] as const;
export function isMobileRole(role: unknown) {
  return (
    typeof role === "string" &&
    (mobileRoles as readonly string[]).includes(role)
  );
}
export const MOBILE_ROLE_NOTICE =
  "Admin access is available in eFlow Web only. The mobile app supports Head, Member and Accounting Staff accounts.";
