import { archiveProposalDelivery, completeProposalDelivery } from "../../interdepartment-collaboration/services/governanceService";

export async function markProposalProjectsCompleted(draftId: string): Promise<void> {
  await completeProposalDelivery(draftId, "All approved proposal work is complete");
}

export async function archiveProposalProjects(draftId: string): Promise<void> {
  await archiveProposalDelivery(draftId, "All approved work in the proposal delivery is complete");
}
