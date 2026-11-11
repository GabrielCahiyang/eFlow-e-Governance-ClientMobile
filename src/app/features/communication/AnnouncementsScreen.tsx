import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Screen,
  Tabs,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { supabase } from "../../../platform/supabase";
import { createPostgresChannel } from "../../shared/postgresChannel";
import {
  loadAnnouncements,
  confirmAnnouncementRead,
  AnnouncementPolicyUnavailable,
} from "./announcementReads";

export function AnnouncementsScreen() {
  const { profile } = useAuth();
  const actor = profile!.id;
  const [tab, setTab] = useState("all");
  const [read, setRead] = useState<Set<string>>(new Set());
  const action = useAction();
  const facts = useFacts("announcements:" + actor + ":" + profile?.org_id, () =>
    loadAnnouncements(actor),
  );
  useEffect(() => {
    const refresh = () => void facts.refresh();
    const live = createPostgresChannel("native-announcements:" + actor)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcement_recipients",
          filter: "user_id=eq." + actor,
        },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(live);
    };
  }, [actor, facts.refresh]);
  const rows = (facts.data || []).filter(
    (item) =>
      tab === "all" ||
      (item.canMarkRead && !(item.readAt || read.has(item.id))),
  );
  return (
    <Screen
      title="Announcements"
      description="Official updates addressed to you."
      onRefresh={() => facts.refresh()}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread" },
        ]}
      />
      {facts.error ? (
        <ErrorState
          error={
            facts.error instanceof AnnouncementPolicyUnavailable
              ? facts.error
              : "Announcements could not load. Check your connection and retry."
          }
          retry={() => void facts.refresh()}
        />
      ) : !facts.data ? (
        <Loading label="Loading announcements" layout="announcements" />
      ) : !rows.length ? (
        <Empty
          kind="inbox"
          action={
            <Button variant="outline" onPress={() => void facts.refresh()}>
              Refresh announcements
            </Button>
          }
          title={
            tab === "unread"
              ? "No unread announcements"
              : "No announcements yet"
          }
        />
      ) : (
        rows.map((item) => (
          <Card key={item.id} title={item.title}>
            <LabelValue
              label="Published"
              value={dateLabel(item.publishedAt || item.createdAt)}
            />
            <Text selectable>{item.body}</Text>
            {item.readAt || read.has(item.id) ? (
              <Notice>Read</Notice>
            ) : item.canMarkRead ? (
              <Button
                variant="outline"
                disabled={facts.loading || action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await confirmAnnouncementRead(actor, item.id);
                    setRead((previous) => new Set(previous).add(item.id));
                    await facts.refresh();
                  })
                }
              >
                Mark as read
              </Button>
            ) : null}
          </Card>
        ))
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Screen>
  );
}
