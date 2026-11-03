import { supabase } from "../../../../lib/supabase";
import type { SubtaskReviewerIdentity } from "../types";

export async function fetchSubtaskReviewerDirectory(
  reviewerIds: string[],
): Promise<Record<string, SubtaskReviewerIdentity>> {
  const ids = Array.from(new Set(reviewerIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,org_id")
    .in("id", ids);
  if (error) throw new Error(error.message);

  const organizationIds = Array.from(new Set(
    (profiles || []).map((profile) => profile.org_id as string).filter(Boolean),
  ));
  const { data: organizations } = organizationIds.length
    ? await supabase.from("organizations").select("id,name").in("id", organizationIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const organizationNames = new Map(
    (organizations || []).map((organization) => [organization.id as string, organization.name as string]),
  );

  return Object.fromEntries((profiles || []).map((profile) => [
    profile.id as string,
    {
      id: profile.id as string,
      name: (profile.full_name as string) || "Assigned reviewer",
      role: (profile.role as string) || "reviewer",
      organizationName: organizationNames.get(profile.org_id as string),
    },
  ]));
}
