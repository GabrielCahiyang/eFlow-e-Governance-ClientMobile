export function completionPercent(
  completed: number,
  total: number,
  status?: string,
) {
  return total > 0
    ? Math.round((completed * 100) / total)
    : status === "completed" || status === "done"
      ? 100
      : 0;
}
