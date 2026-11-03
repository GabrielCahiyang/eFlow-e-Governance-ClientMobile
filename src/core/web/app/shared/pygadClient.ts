/**
 * EflowWeb client for PyGAD Proposal Optimization API.
 *
 * Calls the Ollama AI server endpoint:
 *   POST /controlpanelEflow/api/optimization/optimize-proposal
 *
 * All AI/optimization logic runs on the server (Laptop A).
 * This client only sends task/employee data and receives optimized results.
 */

import type { ProposalDecompositionTask } from "../features/proposal-import/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OptimizationProfile = "balanced" | "fast_track" | "low_risk";

export interface OptimizationEmployee {
  id: string;
  name: string;
  role?: string;
  workload?: number;
  skills?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

export interface OptimizationMetrics {
  skill_match_score: number;
  workload_variance: number;
  makespan_days: number;
  total_budget?: number;
}

export interface OptimizationResult {
  tasks: ProposalDecompositionTask[];
  fitness_score: number;
  generation_history: number[];
  duration_ms: number;
  profile_used: OptimizationProfile;
  metrics: OptimizationMetrics;
}

export interface OptimizeProposalRequest {
  tasks: ProposalDecompositionTask[];
  employees: OptimizationEmployee[];
  profile?: OptimizationProfile;
  budget_cap?: number;
  num_generations?: number;
}

// ── Client ────────────────────────────────────────────────────────────────────

/**
 * Calls the PyGAD optimizer on the AI server and returns GA-optimized
 * task assignments, schedule, and fitness metrics.
 *
 * Requires a valid control panel base URL resolved via resolveAiControlPanelBase().
 */
export async function optimizeProposal(
  baseUrl: string,
  authToken: string,
  request: OptimizeProposalRequest,
): Promise<OptimizationResult> {
  const url = `${baseUrl.replace(/\/api$/, "")}/api/optimization/optimize-proposal`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      tasks: request.tasks,
      employees: request.employees,
      profile: request.profile ?? "balanced",
      budget_cap: request.budget_cap ?? null,
      num_generations: request.num_generations ?? 40,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(
      `Optimization request failed (${response.status}): ${text}`,
    );
  }

  const data = await response.json() as OptimizationResult;
  return data;
}
