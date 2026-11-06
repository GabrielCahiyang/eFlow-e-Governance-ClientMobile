import { supabase } from "../../../platform/supabase";
import type { AnnouncementForUser } from "../../../core/web/app/services/announcementService";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";

type PublishedRow = {
  id: string;
  title: string | null;
  body: string | null;
  audience: AnnouncementForUser["audience"];
  status: AnnouncementForUser["status"];
  org_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  published_at: string | null;
};
type RecipientRow = {
  announcement_id: string;
  read_at: string | null;
  announcement: PublishedRow | null;
};
type PublishedAnnouncement = AnnouncementForUser & { canMarkRead: boolean };
const columns =
  "id,title,body,audience,status,org_id,created_by,created_at,updated_at,expires_at,published_at";

export class AnnouncementPolicyUnavailable extends Error {
  constructor() {
    super(
      "Announcement access is unavailable. The service must be restored before notices can load.",
    );
  }
}

function checkPolicy<T extends { error: { code?: string } | null }>(
  result: T,
): T {
  if (result.error?.code === "42P17") throw new AnnouncementPolicyUnavailable();
  return result;
}

async function verifyActor(actor: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== actor)
    throw new Error("Sign in again.");
}

export function publishedAnnouncements(
  actor: string,
  recipients: RecipientRow[],
  authored: PublishedRow[],
  now = Date.now(),
): PublishedAnnouncement[] {
  const records = new Map<
    string,
    { row: PublishedRow; readAt?: string | null }
  >();
  for (const row of authored) {
    if (row.created_by === actor) records.set(row.id, { row });
  }
  for (const recipient of recipients) {
    if (recipient.announcement?.id === recipient.announcement_id)
      records.set(recipient.announcement_id, {
        row: recipient.announcement,
        readAt: recipient.read_at,
      });
  }
  return [...records.values()]
    .filter(
      ({ row }) =>
        row.status === "published" &&
        (!row.expires_at || Date.parse(row.expires_at) > now),
    )
    .map(({ row, readAt }) => ({
      id: row.id,
      title: row.title || "",
      body: row.body || "",
      audience: row.audience,
      status: row.status,
      orgId: row.org_id || undefined,
      createdBy: row.created_by,
      createdAt: Date.parse(row.created_at),
      updatedAt: Date.parse(row.updated_at),
      expiresAt: row.expires_at ? Date.parse(row.expires_at) : undefined,
      publishedAt: row.published_at ? Date.parse(row.published_at) : undefined,
      canMarkRead: readAt !== undefined,
      readAt: readAt ? Date.parse(readAt) : undefined,
    }))
    .sort(
      (a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt),
    );
}

export async function loadAnnouncements(
  actor: string,
): Promise<PublishedAnnouncement[]> {
  await verifyActor(actor);
  const [recipients, authored] = await Promise.all([
    readAllRows<RecipientRow>(async (from, to) =>
      checkPolicy(
        await supabase
          .from("announcement_recipients")
          .select(
            `announcement_id,read_at,announcement:announcements(${columns})`,
            { count: "exact" },
          )
          .eq("user_id", actor)
          .order("announcement_id")
          .range(from, to)
          .returns<RecipientRow[]>(),
      ),
    ),
    readAllRows<PublishedRow>(async (from, to) =>
      checkPolicy(
        await supabase
          .from("announcements")
          .select(columns, { count: "exact" })
          .eq("created_by", actor)
          .eq("status", "published")
          .order("id")
          .range(from, to)
          .returns<PublishedRow[]>(),
      ),
    ),
  ]);
  return publishedAnnouncements(actor, recipients, authored);
}

export async function confirmAnnouncementRead(actor: string, id: string) {
  await verifyActor(actor);
  const columns = "user_id,announcement_id,read_at";
  const update = checkPolicy(
    await supabase
      .from("announcement_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", actor)
      .eq("announcement_id", id)
      .is("read_at", null)
      .select(columns)
      .maybeSingle(),
  );
  const current = update.data
    ? update
    : checkPolicy(
        await supabase
          .from("announcement_recipients")
          .select(columns)
          .eq("user_id", actor)
          .eq("announcement_id", id)
          .maybeSingle(),
      );
  const data = current.data;
  if (
    current.error ||
    data?.user_id !== actor ||
    data?.announcement_id !== id ||
    !data.read_at
  )
    throw new Error(
      update.error?.message ||
        current.error?.message ||
        "The read marker could not be confirmed.",
    );
}
