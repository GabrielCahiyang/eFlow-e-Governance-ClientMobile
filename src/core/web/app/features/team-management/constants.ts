export const TEAM_WORKLOAD_ELEVATED_THRESHOLD = 55;
export const TEAM_WORKLOAD_HIGH_THRESHOLD = 80;

export type TeamWorkloadBand = "available" | "elevated" | "high";

export function getTeamWorkloadBand(signal: number): TeamWorkloadBand {
  if (signal >= TEAM_WORKLOAD_HIGH_THRESHOLD) return "high";
  if (signal >= TEAM_WORKLOAD_ELEVATED_THRESHOLD) return "elevated";
  return "available";
}
