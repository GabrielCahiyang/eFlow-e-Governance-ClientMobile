import { normalizeWorkUpdateNotification } from "../../../core/web/app/shared/notificationWorkCopy";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Notice,
  Row,
  Screen,
  SearchField,
  Status,
  Tabs,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import {
  fetchRecentNotifications,
  markRecentNotificationRead,
} from "../../../core/web/app/services/notificationService";
import { supabase } from "../../../platform/supabase";
import type { Navigate } from "../../shared/routes";
export function InboxScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth(),
    facts = useFacts("inbox:" + profile?.id, () =>
      fetchRecentNotifications(profile!.id),
    ),
    action = useAction(),
    [tab, setTab] = useState("all"),
    [search, setSearch] = useState("");
  useEffect(() => {
    if (!profile) return;
    const channel = createPostgresChannel("native-inbox:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + profile.id,
        },
        () => void facts.refresh(),
      )
      .subscribe();
    const timer = setInterval(() => void facts.refresh(), 15000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);
  const shown = (facts.data || []).filter(
    (n) =>
      (tab !== "unread" || !n.read) &&
      `${n.title} ${n.message}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Screen
      title="Inbox"
      description="Your updates and work that needs attention."
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "All updates" },
          {
            id: "unread",
            label: `Unread (${facts.data?.filter((n) => !n.read).length || 0})`,
          },
        ]}
      />
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search updates"
      />
      <Notice>
        This feed shows the latest 50 updates available to your account.
      </Notice>
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.loading && !facts.data ? (
        <Loading />
      ) : shown.length ? (
        shown.map((item) => (
          <Card
            key={item.id}
            title={normalizeWorkUpdateNotification(item).title}
          >
            <Row>
              <Status value={item.read ? "Read" : "Unread"} />
              <Text>{dateLabel(item.createdAt)}</Text>
            </Row>
            <Text>{normalizeWorkUpdateNotification(item).message}</Text>
            {!!item.reason && <Notice>{item.reason}</Notice>}
            <Row>
              {!!(item.taskId || item.projectId) && (
                <Button
                  variant="outline"
                  onPress={() => {
                    if (item.taskId)
                      navigate({
                        name: "task",
                        id: item.taskId,
                        nodeId: item.workNodeId,
                        view: item.financialRecordId ? "budget" : undefined,
                      });
                    else if (item.projectId)
                      navigate({ name: "project", id: item.projectId });
                  }}
                >
                  Open related work
                </Button>
              )}
              {!item.read && (
                <Button
                  variant="ghost"
                  busy={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await markRecentNotificationRead(profile!.id, item.id);
                      await facts.refresh();
                    })
                  }
                >
                  Mark read
                </Button>
              )}
            </Row>
          </Card>
        ))
      ) : (
        <Empty title="You're all caught up" />
      )}
      {!!action.error && <ErrorState error={action.error} />}
    </Screen>
  );
}
