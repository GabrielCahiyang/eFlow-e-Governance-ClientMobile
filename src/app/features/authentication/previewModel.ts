import { loginPreviewCards } from "./loginPreviewCards";
export type Column = "todo" | "in_progress" | "done";
export type PreviewCard = {
  id: string;
  title: string;
  columnId: Column;
  progress: number;
  avatars: readonly string[];
  statusLabel: string;
  statusColor: string;
  borderColor: string;
};
export const previewColumns: { id: Column; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];
export const initialPreview = (): PreviewCard[] =>
  loginPreviewCards.map((card) => ({ ...card }));
export function movePreview(
  cards: PreviewCard[],
  id: string,
  columnId: Column,
): PreviewCard[] {
  const config =
    columnId === "todo"
      ? { progress: 0.2, statusLabel: "Queued", statusColor: "#0073ea" }
      : columnId === "in_progress"
        ? { progress: 0.65, statusLabel: "In Progress", statusColor: "#fdab3d" }
        : { progress: 1, statusLabel: "Completed", statusColor: "#00c875" };
  return cards.map((card) =>
    card.id === id
      ? { ...card, columnId, ...config, borderColor: config.statusColor }
      : card,
  );
}
export function cyclePreview(
  cards: PreviewCard[],
  step: number,
  picks: Record<Column, number>,
): { cards: PreviewCard[]; step: number; picks: Record<Column, number> } {
  const groups = Object.fromEntries(
    previewColumns.map((col) => [
      col.id,
      cards.filter((card) => card.columnId === col.id),
    ]),
  ) as Record<Column, PreviewCard[]>;
  const pick = (from: Column, to: Column, advance: boolean) => {
    const source = groups[from];
    const chosen = source[picks[from] % source.length];
    return {
      cards: movePreview(cards, chosen.id, to),
      step: advance ? step + 1 : step,
      picks: { ...picks, [from]: (picks[from] + 1) % source.length },
    };
  };
  if (
    !groups.in_progress.length &&
    (groups.todo.length > 1 || groups.done.length > 1)
  )
    return pick(groups.todo.length > 1 ? "todo" : "done", "in_progress", false);
  const phase = step % 3;
  if (phase === 0 && groups.in_progress.length > 1)
    return pick("in_progress", "done", true);
  if (phase === 1 && groups.done.length > 1) return pick("done", "todo", true);
  if (phase === 2 && groups.todo.length > 1)
    return pick("todo", "in_progress", true);
  if (groups.in_progress.length > 1) return pick("in_progress", "done", false);
  if (groups.todo.length > 1) return pick("todo", "in_progress", false);
  if (groups.done.length > 1) return pick("done", "in_progress", false);
  return { cards, step, picks };
}
