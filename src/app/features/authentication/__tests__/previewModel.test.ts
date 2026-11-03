import { test, describe, expect } from "@jest/globals";
import {
  cyclePreview,
  initialPreview,
  movePreview,
  previewColumns,
  type Column,
} from "../previewModel";
describe("The existing interactive login board", () => {
  test("retains all demonstration cards and keeps all three stages populated through long automatic playback", () => {
    let cards = initialPreview(),
      step = 0,
      picks: Record<Column, number> = { todo: 0, in_progress: 0, done: 0 };
    const ids = cards.map((card) => card.id).sort();
    for (let tick = 0; tick < 200; tick++) {
      const result = cyclePreview(cards, step, picks);
      cards = result.cards;
      step = result.step;
      picks = result.picks;
      expect(cards.map((card) => card.id).sort()).toEqual(ids);
      for (const column of previewColumns)
        expect(cards.some((card) => card.columnId === column.id)).toBe(true);
    }
  });
  test("dragging one card updates only that card and represents completed work at 100%", () => {
    const before = initialPreview(),
      target = before.find((card) => card.columnId === "todo")!;
    const after = movePreview(before, target.id, "done");
    expect(after.find((card) => card.id === target.id)).toMatchObject({
      columnId: "done",
      progress: 1,
      statusLabel: "Completed",
    });
    expect(after.filter((card) => card.id !== target.id)).toEqual(
      before.filter((card) => card.id !== target.id),
    );
    expect(before.find((card) => card.id === target.id)?.columnId).toBe("todo");
  });
  test("recovers a populated middle stage after manual moves clear it", () => {
    const moved = initialPreview().map((card) => ({
      ...card,
      columnId: "todo" as Column,
    }));
    const next = cyclePreview(moved, 0, { todo: 0, in_progress: 0, done: 0 });
    expect(next.cards.some((card) => card.columnId === "in_progress")).toBe(
      true,
    );
    expect(next.cards).toHaveLength(moved.length);
  });
});
