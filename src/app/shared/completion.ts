export function completionPercent(
  completed: number,
  total: number,
  status?: string,
) {
  return total > 0
    ? completed >= total
      ? 100
      : Math.min(99, Math.round((completed * 100) / total))
    : status === "completed" || status === "done"
      ? 100
      : 0;
}
