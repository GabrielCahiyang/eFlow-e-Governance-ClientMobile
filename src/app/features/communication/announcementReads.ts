import { supabase } from "../../../platform/supabase";
import {
  fetchAllOrgs,
  getAncestorOrgIds,
} from "../../../core/web/lib/supabaseService";
import type { AnnouncementForUser } from "../../../core/web/app/services/announcementService";
import { readAllRows } from "../../../core/web/app/shared/readAllRows";
export async function loadAnnouncements(
  actor: string,
  office: string | null | undefined,
  manage: boolean,
): Promise<AnnouncementForUser[]> {
  const [rows, reads, orgs] = await Promise.all([
    readAllRows<Record<string, any>>((from, to) =>
      supabase
        .from("announcements")
        .select("*", { count: "exact" })
        .order("id")
        .range(from, to),
    ),
    readAllRows<Record<string, any>>((from, to) =>
      supabase
        .from("announcement_recipients")
        .select("announcement_id,read_at", { count: "exact" })
        .eq("user_id", actor)
        .order("announcement_id")
        .range(from, to),
    ),
    office ? fetchAllOrgs() : Promise.resolve([]),
  ]);
  const ancestors = new Set(getAncestorOrgIds(orgs, office)),
    recipients = new Map(
      reads.map((row) => [row.announcement_id, row.read_at]),
    );
  return rows
    .filter(
      (row) =>
        manage ||
        (row.status === "published" &&
          (!row.expires_at || Date.parse(row.expires_at) > Date.now()) &&
          (recipients.has(row.id) ||
            row.audience === "all" ||
            (row.audience === "org" && ancestors.has(row.org_id)))),
    )
    .map((row) => ({
      id: row.id,
      title: row.title || "",
      body: row.body || "",
      audience: row.audience,
      status: row.status,
      orgId: row.org_id,
      createdBy: row.created_by,
      createdAt: Date.parse(row.created_at),
      updatedAt: Date.parse(row.updated_at),
      expiresAt: row.expires_at ? Date.parse(row.expires_at) : undefined,
      publishedAt: row.published_at ? Date.parse(row.published_at) : undefined,
      readAt: recipients.get(row.id)
        ? Date.parse(recipients.get(row.id))
        : undefined,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
