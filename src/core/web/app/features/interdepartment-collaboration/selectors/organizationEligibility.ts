import type { Employee } from "../../../services/employeeService";
import type { Organization } from "../../../types";
import type { CollaborationOrganizationSelection, CollaborationParticipant } from "../types";

export function getCollaborationCandidateEmployees(
  employees: Employee[],
  selections: CollaborationOrganizationSelection[],
): Employee[] {
  const staffingOrgIds = new Set(
    selections.filter((selection) => selection.staffingEnabled).map((selection) => selection.orgId),
  );
  return employees.filter((employee) => Boolean(employee.department && staffingOrgIds.has(employee.department)));
}

export function detectMentionedOrganizations(text: string, organizations: Organization[]) {
  const haystack = text.toLocaleUpperCase();
  return organizations.filter((organization) => {
    const name = organization.name.trim().toLocaleUpperCase();
    const slug = organization.slug.trim().toLocaleUpperCase();
    if ((name.length >= 3 && haystack.includes(name)) || (slug.length >= 2 && haystack.includes(slug))) return true;
    const acronym = organization.name.split(/\s+/).filter(Boolean).map((word) => word[0]).join("").toLocaleUpperCase();
    return acronym.length >= 2 && haystack.includes(acronym);
  });
}

export function defaultParticipationRole(org: Organization): CollaborationOrganizationSelection["participationRole"] {
  return org.org_type === "board" || org.org_type === "committee" ? "governance" : "participant";
}

export function isExternalReviewParticipant(participant: CollaborationParticipant) {
  return participant.participationRole === "participant" || participant.participationRole === "governance";
}
