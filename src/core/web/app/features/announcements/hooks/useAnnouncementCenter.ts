import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { markAnnouncementRead, subscribeToMyAnnouncements, type AnnouncementForUser } from '../../../services/announcementService';

export function useAnnouncementCenter() {
const { user } = useAuth();
  const [items, setItems] = useState<AnnouncementForUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementForUser | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToMyAnnouncements(user.id, (a) => {
      setItems(a);
      setLoading(false);
    });
    return unsub;
  }, [user?.id]);

  const unreadList = useMemo(() => items.filter((a) => !a.readAt), [items]);
  const readList = useMemo(() => items.filter((a) => a.readAt), [items]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (filter === "unread") list = unreadList;
    if (filter === "read") list = readList;
    if (audienceFilter !== "all") {
      list = list.filter((a) => a.audience === audienceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, unreadList, readList, audienceFilter, searchQuery]);

  const openAnnouncement = async (a: AnnouncementForUser) => {
    setSelectedAnnouncement(a);
    if (!a.readAt && user?.id) {
      await markAnnouncementRead(user.id, a.id);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    for (const a of unreadList) {
      await markAnnouncementRead(user.id, a.id);
    }
  };

  return { audienceFilter, filter, filteredItems, items, loading, markAllRead, openAnnouncement, readList, searchQuery, selectedAnnouncement, setAudienceFilter, setFilter, setSearchQuery, setSelectedAnnouncement, unreadList };
}
