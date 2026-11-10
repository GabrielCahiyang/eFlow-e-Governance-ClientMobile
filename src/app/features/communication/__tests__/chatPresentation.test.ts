import { expect, test } from "@jest/globals";
import {
  buildThreadItems,
  conversationGroup,
  filterConversations,
  initials,
  reactionSummary,
  separatorLabel,
} from "../chatPresentation";
import type { Channel, Message } from "../services";

const msg = (id: string, sender: string, at: string): Message => ({
  id,
  sender_id: sender,
  sender_name: sender,
  content: id,
  created_at: at,
});
const now = new Date("2026-11-09T12:00:00");

test("initials fall back safely", () => {
  expect(initials("Cheryl Gallo")).toBe("CG");
  expect(initials("Andres")).toBe("A");
  expect(initials("  ")).toBe("?");
  expect(initials(null)).toBe("?");
});

test("conversation kinds map to People, Groups and Office filters", () => {
  expect(conversationGroup("direct")).toBe("people");
  expect(conversationGroup("org")).toBe("office");
  expect(conversationGroup("project")).toBe("groups");
  expect(conversationGroup("task")).toBe("groups");
  const channels: Channel[] = [
    { id: "1", name: "Andres", kind: "direct" },
    { id: "2", name: "Seminar", kind: "project", lastMessage: "hello" },
    { id: "3", name: "Main Office", kind: "org" },
  ];
  expect(filterConversations(channels, "all", "").length).toBe(3);
  expect(filterConversations(channels, "people", "").map((c) => c.id)).toEqual([
    "1",
  ]);
  expect(
    filterConversations(channels, "groups", "HELLO").map((c) => c.id),
  ).toEqual(["2"]);
  expect(filterConversations(channels, "office", "andres")).toEqual([]);
});

test("runs group by sender, time gap and day without altering messages", () => {
  const rows = [
    msg("a", "me", "2026-11-09T09:00:00"),
    msg("b", "me", "2026-11-09T09:01:00"),
    msg("c", "other", "2026-11-09T09:02:00"),
    msg("d", "other", "2026-11-09T09:30:00"),
    msg("e", "other", "2026-11-09T11:00:00"),
  ];
  const items = buildThreadItems(rows, "me", now);
  expect(items.map((i) => i.message.id)).toEqual(["a", "b", "c", "d", "e"]);
  expect(items.map((i) => i.first)).toEqual([true, false, true, true, true]);
  expect(items.map((i) => i.last)).toEqual([false, true, true, true, true]);
  expect(items.map((i) => i.mine)).toEqual([true, true, false, false, false]);
  expect(items[0].separator).toMatch(/^Today/);
  expect(items[1].separator).toBeUndefined();
  expect(items[3].separator).toBeUndefined();
  expect(items[4].separator).toMatch(/^Today/);
});

test("day change produces a dated separator", () => {
  expect(separatorLabel("2026-11-08T20:00:00", now)).toMatch(/^Yesterday/);
  expect(separatorLabel("2026-10-01T20:00:00", now)).toMatch(/Oct/);
  expect(separatorLabel("not a date", now)).toBe("");
});

test("reaction summary marks the actor's own reactions", () => {
  const m = {
    ...msg("a", "x", "2026-11-09T09:00:00"),
    reaction_users: { "👍": { me: "Me", you: "You" }, "❤️": {} },
  };
  expect(reactionSummary(m, "me")).toEqual([
    { emoji: "👍", count: 2, mine: true },
  ]);
});
