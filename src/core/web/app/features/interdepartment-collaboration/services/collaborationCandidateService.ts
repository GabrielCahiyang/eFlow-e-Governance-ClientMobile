import { controlPanelFetch } from "../../../shared/controlPanelClient";

export interface CollaborationCandidateRecommendation {
  taskKey: string;
  employeeId: string;
  recommendationScore: number;
  fitReason: string;
  workload: number;
  recommendedRole: "lead" | "support";
  organizationId: string;
}

export async function recommendCollaborationAssignments(draftId: string, taskKeys?: string[]) {
  const response = await controlPanelFetch(
    `/collaboration/drafts/${encodeURIComponent(draftId)}/recommend-assignments`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task_keys: taskKeys || [] }) },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Could not generate collaboration staffing recommendations.");
  }
  return response.json() as Promise<{ recommendations: CollaborationCandidateRecommendation[] }>;
}
