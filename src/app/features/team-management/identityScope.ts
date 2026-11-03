import type { UserProfile } from "../../../core/web/app/types";
export const exactOfficePeople = (
  profiles: UserProfile[],
  office: string | undefined,
) =>
  office
    ? profiles.filter(
        (person) =>
          person.org_id === office &&
          person.is_active &&
          !["admin", "super_admin"].includes(person.role),
      )
    : [];
export function accountingAssignmentAllowed(
  actor: UserProfile,
  head: string | null | undefined,
  target: UserProfile,
) {
  return (
    actor.role === "head" &&
    actor.id === head &&
    actor.org_id === target.org_id &&
    target.is_active &&
    ["member", "accounting_staff"].includes(target.role)
  );
}
