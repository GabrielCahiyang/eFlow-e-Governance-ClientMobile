import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { DisplayUpdateNotice } from "../../components/ui/DisplayUpdateNotice";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  SectionList,
  View,
} from "react-native";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import {
  Button,
  Empty,
  ErrorState,
  Row,
  Status,
  dateLabel,
} from "../../components/ui";

import { NavigationRow } from "../../components/ui/NavigationRow";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { radius, space } from "../../components/ui/theme";
import { useAuth } from "../authentication";
import { useTaskFacts } from "../tasks";
import { FeedSkeleton } from "../personal-work/FeedSkeleton";
import { useMobileWorkFeed } from "../personal-work/WorkFeedProvider";
import { workDestination } from "../personal-work/workDestination";
import { useFacts } from "../../shared/useFacts";
import { usePullRefresh } from "../../shared/usePullRefresh";
import { useAccountActionAccess } from "../../shared/AccountActionAccess";
import { createPostgresChannel } from "../../shared/postgresChannel";
import { supabase } from "../../../platform/supabase";
import { personalReviewActions } from "../../../core/web/app/features/action-center/selectors";
import { personalReviewAllowed } from "../tasks/branchInspector";
import { nativeWindow } from "../../../platform/webRuntime";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import {
  fetchRecentNotifications,
  markRecentNotificationRead,
  type Notification,
} from "../../../core/web/app/services/notificationService";
import { normalizeWorkUpdateNotification } from "../../../core/web/app/shared/notificationWorkCopy";
import { inboxUpdateRoute } from "./inboxDestinations";
import type { AppRoute, Navigate } from "../../shared/routes";

type Decision = {
  key: string;
  title: string;
  context: string;
  route: AppRoute;
};
type Entry =
  { key: string; decision: Decision } | { key: string; update: Notification };
type Filter = "all" | "decisions" | "unread";

export function ActionInbox({
  navigate,
  initialView,
}: {
  navigate: Navigate;
  initialView?: string;
}) {
  const { profile } = useAuth();
  const assertAccess = useAccountActionAccess();
  const actor = profile!.id;
  const palette = useTheme();
  const work = useMobileWorkFeed();
  const tasks = useTaskFacts("inbox-decisions");
  const finance = useFacts("inbox-independent-reviews:" + actor, () =>
    getAssignedIndependentReviews(actor),
  );
  const updates = useFacts(
    "inbox-updates:" + actor,
    () => fetchRecentNotifications(actor),
    true,
    { actor, select: (data) => data.map((item) => ({ ...item })) },
  );
  const [filter, setFilter] = useState<Filter>(
    initialView === "decisions" ? "decisions" : "all",
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirmedRead, setConfirmedRead] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string>();
  const [markError, setMarkError] = useState<Error>();
  const pending = useRef<string | undefined>(undefined);
  const refresh = () =>
    Promise.all([
      tasks.refresh(),
      finance.refresh(),
      updates.refresh(),
      work.refresh(),
    ]);
  const pull = usePullRefresh(refresh);

  useEffect(() => {
    const refreshInbox = (force = true) => {
      if (AppState.currentState === "active")
        void Promise.all([
          tasks.refresh(),
          finance.refresh(),
          force ? updates.refresh() : updates.refreshIfStale(),
        ]);
    };
    const channel = createPostgresChannel("native-inbox:" + actor)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + actor,
        },
        () => refreshInbox(),
      )
      .subscribe();
    const workChanged = () => refreshInbox();
    const poll = setInterval(() => refreshInbox(false), 30000);
    nativeWindow.addEventListener("eflow:work-updated", workChanged);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshInbox(false);
    });
    return () => {
      clearInterval(poll);
      nativeWindow.removeEventListener("eflow:work-updated", workChanged);
      foreground.remove();
      void supabase.removeChannel(channel);
    };
  }, [
    actor,
    tasks.refresh,
    finance.refresh,
    updates.refresh,
    updates.refreshIfStale,
  ]);

  const rootTasks = tasks.error
    ? []
    : (tasks.data || []).filter(
        (task) => task.latestSubmission?.submitterId !== actor,
      );
  const decisions: Decision[] = personalReviewActions(
    rootTasks,
    [],
    actor,
    profile!.role,
  ).map((item) => ({
    key: item.key,
    title: item.title,
    context:
      (item.entityId ? "Subitem review · " : "Task review · ") + item.context,
    route: {
      name: "task",
      id: item.taskId,
      nodeId: item.entityId,
      projectId: rootTasks.find((task) => task.id === item.taskId)
        ?.linkedProjectId,
      view: item.entityId ? "subitems" : "review",
      recordId: rootTasks.find((task) => task.id === item.taskId)
        ?.latestSubmission?.id,
    },
  }));
  if (!work.error) {
    for (const row of work.data?.rows || []) {
      if (
        row.kind === "personal-node" &&
        row.projectId &&
        row.tree &&
        row.actionable &&
        !row.history &&
        personalReviewAllowed(row.tree, row.id, actor)
      ) {
        decisions.push({
          key: "personal-node-review:" + row.id,
          title: row.title,
          context: "Personal subitem review · " + row.projectTitle,
          route: workDestination(row),
        });
        continue;
      }
      const task = row.personalTask;
      const personal = row.personal;
      if (
        row.kind === "personal-task" &&
        row.projectId &&
        task?.status === "submitted" &&
        task.reviewer_id === actor &&
        task.lead_id !== actor &&
        personal?.project.status === "active" &&
        (personal.owner === actor ||
          personal.members.some(
            (member) =>
              member.user_id === actor &&
              member.eligible &&
              member.state === "active",
          ))
      ) {
        decisions.push({
          key: "personal-review:" + row.rootId,
          title: row.title,
          context: "Personal review · " + row.projectTitle,
          route: workDestination(row),
        });
      }
    }
  }
  for (const pack of finance.error ? [] : finance.data || []) {
    if (
      pack.context.current &&
      pack.context.canReview &&
      pack.context.review?.status === "pending"
    )
      decisions.push({
        key: "financial-review:" + pack.liquidation.id,
        title: pack.request.purpose,
        context: "Independent financial review",
        route: { name: "financial_reviews", id: pack.liquidation.id },
      });
  }
  const assigned = [
    ...new Map(decisions.map((item) => [item.key, item])).values(),
  ];
  const recent = (updates.data || []).map((item) =>
    confirmedRead.has(item.id) ? { ...item, read: true } : item,
  );
  const unread = recent.filter((item) => !item.read);
  const sections: { title: string; data: Entry[] }[] = [];
  if (filter !== "unread" && assigned.length)
    sections.push({
      title: "Assigned decisions",
      data: assigned.map((decision) => ({ key: decision.key, decision })),
    });
  if (filter !== "decisions" && (filter === "unread" ? unread : recent).length)
    sections.push({
      title: filter === "unread" ? "Unread updates" : "Recent updates",
      data: (filter === "unread" ? unread : recent).map((update) => ({
        key: "update:" + update.id,
        update,
      })),
    });

  const sources = [tasks, finance, updates, work];
  const initial = sources.some((source) => source.loading && !source.data);
  const issues = [
    tasks.error && "Task decisions could not load.",
    finance.error &&
      "Assigned financial reviews couldn't load. Please try again.",
    updates.error && "Updates could not refresh.",
    (work.error || work.data?.issues.length || work.data?.unavailable.length) &&
      "Some assigned decisions couldn't load. Please try again.",
  ].filter(Boolean);
  const markRead = async (item: Notification) => {
    if (pending.current || item.read) return;
    pending.current = item.id;
    setMarking(item.id);
    setMarkError(undefined);
    try {
      assertAccess(actor);
      await markRecentNotificationRead(actor, item.id);
      setConfirmedRead((previous) => new Set(previous).add(item.id));
      await updates.refresh();
    } catch (error) {
      setMarkError(
        error instanceof Error
          ? error
          : new Error("Could not mark this update read."),
      );
    } finally {
      pending.current = undefined;
      setMarking(undefined);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <SectionList
        style={{ backgroundColor: palette.background }}
        sections={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{
          flexGrow: 1,
          padding: space.lg,
          gap: space.sm,
        }}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        refreshing={pull.refreshing}
        onRefresh={pull.refresh}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.xs }}>
            {!!pull.error && (
              <ErrorState
                error={pull.error}
                retry={() => void pull.refresh()}
              />
            )}
            <DisplayUpdateNotice
              visible={!!updates.data && updates.stale}
              loading={updates.loading}
            />
            {/* Monday Header (Image 3) */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 4,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: palette.text,
                }}
              >
                Notifications
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter inbox"
                onPress={() => setFilterOpen(true)}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? palette.primarySoft
                    : palette.surface,
                  borderWidth: 1,
                  borderColor: palette.border,
                })}
              >
                <SlidersHorizontal size={18} color={palette.text} />
              </Pressable>
            </View>

            {/* Horizontal Filter Pills (Monday Image 3) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="All notifications"
                onPress={() => setFilter("all")}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor:
                    filter === "all" ? palette.primary : palette.border,
                  backgroundColor:
                    filter === "all" ? palette.primarySoft : palette.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: filter === "all" ? "700" : "500",
                    color: filter === "all" ? palette.primary : palette.text,
                  }}
                >
                  All
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Unread notifications"
                onPress={() => setFilter("unread")}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor:
                    filter === "unread" ? palette.primary : palette.border,
                  backgroundColor:
                    filter === "unread" ? palette.primarySoft : palette.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: filter === "unread" ? "700" : "500",
                    color: filter === "unread" ? palette.primary : palette.text,
                  }}
                >
                  Unread
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Assigned decisions"
                onPress={() => setFilter("decisions")}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor:
                    filter === "decisions" ? palette.primary : palette.border,
                  backgroundColor:
                    filter === "decisions"
                      ? palette.primarySoft
                      : palette.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: filter === "decisions" ? "700" : "500",
                    color:
                      filter === "decisions" ? palette.primary : palette.text,
                  }}
                >
                  Decisions
                </Text>
              </Pressable>
            </ScrollView>

            {!!issues.length && (
              <ErrorState
                error={issues.join("\n")}
                retry={() => void refresh()}
              />
            )}
            {!!markError && <ErrorState error={markError} />}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingTop: space.sm,
              paddingBottom: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 16,
                borderRadius: 3,
                backgroundColor: palette.primary,
              }}
            />
            <Text
              accessibilityRole="header"
              style={{
                fontWeight: "700",
                fontSize: 16,
                color: palette.text,
              }}
            >
              {section.title}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        renderItem={({ item }) => {
          if ("decision" in item)
            return (
              <View
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                }}
              >
                <NavigationRow
                  title={item.decision.title}
                  description={item.decision.context}
                  onPress={() => navigate(item.decision.route)}
                />
              </View>
            );
          const update = item.update;
          const copy = normalizeWorkUpdateNotification(update);
          const target = inboxUpdateRoute(update, profile!.role);
          return (
            <View
              style={{
                padding: space.md,
                gap: space.xs,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: update.read ? palette.border : palette.primary,
                backgroundColor: update.read
                  ? palette.surface
                  : palette.primarySoft,
                elevation: 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
              }}
            >
              <Row>
                <Status value={update.read ? "Read" : "Unread"} />
                <Text style={{ color: palette.mutedLabel, fontSize: 13 }}>
                  {dateLabel(update.createdAt)}
                </Text>
              </Row>
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 15,
                  color: palette.text,
                }}
              >
                {copy.title}
              </Text>
              <Text style={{ color: palette.text, lineHeight: 20 }}>
                {copy.message}
              </Text>
              {!!update.reason && (
                <Text style={{ color: palette.muted }}>{update.reason}</Text>
              )}
              <Row>
                {target && (
                  <Button variant="ghost" onPress={() => navigate(target)}>
                    Open related item
                  </Button>
                )}
                {!update.read && (
                  <Button
                    variant="ghost"
                    busy={marking === update.id}
                    disabled={!!marking}
                    onPress={() => void markRead(update)}
                  >
                    Mark read
                  </Button>
                )}
              </Row>
            </View>
          );
        }}
        ListEmptyComponent={
          initial ? (
            <FeedSkeleton
              label="Loading your Inbox"
              layout={filter === "decisions" ? "navigation" : "inbox"}
            />
          ) : issues.length ? (
            <Empty
              compact
              kind="inbox"
              title="No items loaded for this view"
              description="Retry to check the unavailable sources."
            />
          ) : (
            <Empty
              kind="inbox"
              title="You're all caught up"
              description={
                filter === "decisions"
                  ? "No decisions assigned to you"
                  : filter === "unread"
                    ? "No unread updates"
                    : "Your work updates and assigned decisions will appear here."
              }
              action={
                <Button onPress={() => void refresh()}>Refresh updates</Button>
              }
            />
          )
        }
      />
      <SelectionSheet
        open={filterOpen}
        title="Filter Inbox"
        description="Unread counts cover the 50 most recent updates."
        value={filter}
        options={[
          { id: "all", title: "All" },
          {
            id: "decisions",
            title: "Decisions",
            description: String(assigned.length),
          },
          { id: "unread", title: "Unread", description: String(unread.length) },
        ]}
        onClose={() => setFilterOpen(false)}
        onSelect={(value) => {
          setFilter(value as Filter);
          setFilterOpen(false);
        }}
      />
    </View>
  );
}
