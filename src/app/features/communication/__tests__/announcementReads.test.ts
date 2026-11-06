import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  AnnouncementPolicyUnavailable,
  confirmAnnouncementRead,
  loadAnnouncements,
  publishedAnnouncements,
} from "../announcementReads";

const mockRead = jest.fn<() => Promise<unknown>>();
const mockReceipt = jest.fn<() => Promise<unknown>>();
const mockScope = jest.fn();
const mockUpdate = jest.fn();
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "actor" } } },
      }),
    },
    from: () => {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          mockScope(...args);
          return query;
        },
        is: (...args: unknown[]) => {
          mockScope(...args);
          return query;
        },
        update: (...args: unknown[]) => {
          mockUpdate(...args);
          return query;
        },
        order: () => query,
        range: () => query,
        returns: () => mockRead(),
        maybeSingle: () => mockReceipt(),
      };
      return query;
    },
  },
}));
const row = (id: string, created_by = "author") => ({
  id,
  title: id,
  body: id,
  status: "published" as const,
  audience: "all" as const,
  org_id: null,
  created_by,
  created_at: "2026-11-04T00:00:00Z",
  updated_at: "2026-11-04T00:00:00Z",
  published_at: "2026-11-04T00:00:00Z",
  expires_at: null,
});
beforeEach(() => {
  jest.resetAllMocks();
});

test("the feed uses recipient and author scope and never infers access from an audience label", async () => {
  mockRead
    .mockResolvedValueOnce({
      data: [
        {
          announcement_id: "received",
          read_at: null,
          announcement: row("received"),
        },
      ],
      error: null,
      count: 1,
    })
    .mockResolvedValueOnce({
      data: [row("authored", "actor"), row("unrelated")],
      error: null,
      count: 2,
    });
  const data = await loadAnnouncements("actor");
  expect(mockScope).toHaveBeenCalledWith("user_id", "actor");
  expect(mockScope).toHaveBeenCalledWith("created_by", "actor");
  expect(data.map(({ id, canMarkRead }) => [id, canMarkRead])).toEqual([
    ["authored", false],
    ["received", true],
  ]);
});

test("drafts, expired notices and mismatched recipient records do not display", () => {
  const rows = publishedAnnouncements(
    "actor",
    [
      {
        announcement_id: "mismatch",
        read_at: null,
        announcement: row("other"),
      },
      {
        announcement_id: "draft",
        read_at: null,
        announcement: { ...row("draft"), status: "draft" },
      },
    ],
    [{ ...row("expired", "actor"), expires_at: "2026-10-01" }],
    Date.parse("2026-11-04"),
  );
  expect(rows).toEqual([]);
});

test("a policy cycle surfaces as unavailable instead of an empty feed", async () => {
  mockRead.mockResolvedValue({
    data: null,
    error: { code: "42P17", message: "Recursive policy" },
  });
  await expect(loadAnnouncements("actor")).rejects.toBeInstanceOf(
    AnnouncementPolicyUnavailable,
  );
});

test("a repeated read preserves the original timestamp and must return the exact receipt", async () => {
  mockReceipt
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({
      data: { user_id: "actor", announcement_id: "a", read_at: "2026-11-04" },
      error: null,
    });
  await confirmAnnouncementRead("actor", "a");
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockScope).toHaveBeenCalledWith("read_at", null);
  mockReceipt
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({
      data: {
        user_id: "different",
        announcement_id: "a",
        read_at: "2026-11-04",
      },
      error: null,
    });
  await expect(confirmAnnouncementRead("actor", "a")).rejects.toThrow(
    "could not be confirmed",
  );
});
