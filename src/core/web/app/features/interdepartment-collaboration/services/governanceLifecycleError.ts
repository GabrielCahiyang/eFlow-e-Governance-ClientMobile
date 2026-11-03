export const GOVERNANCE_LIFECYCLE_MIGRATION =
  "20260822000002_governance_delivery_lifecycle.sql";

type GovernanceLifecycleError = {
  code?: string | null;
  message: string;
};

export function isGovernanceLifecycleSchemaMissing(
  error: GovernanceLifecycleError,
): boolean {
  return (
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /schema cache/i.test(error.message) ||
    /could not find (the )?function public\.(request_proposal_closeout|decide_proposal_closeout|complete_proposal_delivery|archive_proposal_delivery)/i.test(
      error.message,
    ) ||
    /relation .*proposal_(governance|delivery_closeout)/i.test(error.message)
  );
}

export function getGovernanceLifecycleErrorMessage(
  error: GovernanceLifecycleError,
): string {
  if (isGovernanceLifecycleSchemaMissing(error)) {
    return `Governance closeout is not installed in the live Supabase project. Apply ${GOVERNANCE_LIFECYCLE_MIGRATION}, reload the Supabase schema, then try again.`;
  }
  return error.message;
}
