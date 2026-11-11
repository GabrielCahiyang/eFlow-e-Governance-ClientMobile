import { FilterChip } from "../../components/ui/FilterChip";
import { DisplayUpdateNotice } from "../../components/ui/DisplayUpdateNotice";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";
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
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
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
  markRecentNotificationRead,
  type Notification,
} from "../../../core/web/app/services/notificationService";
import { normalizeWorkUpdateNotification } from "../../../core/web/app/shared/notificationWorkCopy";
import { inboxUpdateRoute } from "./inboxDestinations";
import { useInboxUpdatePages } from "./useInboxUpdatePages";
import { getActionableSettlementEscalations } from "../budget";
import type { AppRoute, Navigate } from "../../shared/routes";

type Decision = {
  key: string;
  title: string;
  context: string;
  route: AppRoute;
};
type Entry =
  { key: string; decision: Decision } | { key: string; update: Notification };
type Filter = "all" | "unread";

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
  const reviews = initialView === "decisions";
  const work = useMobileWorkFeed();
  const tasks = useTaskFacts("inbox-decisions", reviews);
  const finance = useFacts(
    "inbox-independent-reviews:" + actor,
    () => getAssignedIndependentReviews(actor),
    reviews,
  );
  const [filter, setFilter] = useState<Filter>("all");
  const updates = useInboxUpdatePages(
    actor,
    false,
    !reviews || profile?.role === "head",
  );
  const unreadUpdates = useInboxUpdatePages(actor, true, filter === "unread");
  const feed = filter === "unread" ? unreadUpdates : updates;
  const staffingAlerts =
    reviews && profile?.role === "head" && !updates.error
      ? (updates.data?.items || []).filter(
          (item) =>
            item.financialRecordType === "settlement_staffing" &&
            item.financialRecordId,
        )
      : [];
  const staffingIds = [
    ...new Set(staffingAlerts.map((item) => item.financialRecordId!)),
  ].sort();
  const escalations = useFacts(
    `inbox-staffing:${actor}:${profile?.org_id}:${staffingIds.join(",")}`,
    () => getActionableSettlementEscalations(staffingIds),
    staffingIds.length > 0,
  );
  const [confirmedRead, setConfirmedRead] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string>();
  const [markError, setMarkError] = useState<Error>();
  const pending = useRef<string | undefined>(undefined);
  const refresh = () =>
    Promise.all([
      tasks.refresh(),
      finance.refresh(),
      escalations.refresh(),
      updates.refresh(),
      unreadUpdates.refresh(),
      ...(reviews ? [work.refresh()] : []),
    ]);
  const pull = usePullRefresh(async () => {
    updates.discardHistory();
    unreadUpdates.discardHistory();
    await refresh();
  });

  useEffect(() => {
    const refreshInbox = (force = true) => {
      if (AppState.currentState === "active")
        void Promise.all([
          tasks.refresh(),
          finance.refresh(),
          escalations.refresh(),
          force ? updates.refresh() : updates.refreshIfStale(),
          force ? unreadUpdates.refresh() : unreadUpdates.refreshIfStale(),
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
        (event) => {
          const row = event.new;
          if (
            "user_id" in row &&
            row.user_id === actor &&
            row.read === true &&
            typeof row.id === "string"
          ) {
            const id = row.id;
            setConfirmedRead((previous) =>
              previous.has(id) ? previous : new Set(previous).add(id),
            );
          }
          refreshInbox();
        },
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
    escalations.refresh,
    updates.refresh,
    updates.refreshIfStale,
    unreadUpdates.refresh,
    unreadUpdates.refreshIfStale,
  ]);

  const rootTasks =
    !reviews || tasks.error
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
      (item.entityId ? "Subtask review · " : "Task review · ") + item.context,
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
  if (reviews && !work.error) {
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
          context: "Personal subtask review · " + row.projectTitle,
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
  if (!escalations.error) {
    for (const item of staffingAlerts) {
      if (!escalations.data?.includes(item.financialRecordId!)) continue;
      const route = inboxUpdateRoute(item, profile!.role);
      if (!route) continue;
      decisions.push({
        key: "settlement-staffing:" + item.financialRecordId,
        title: "Escalated settlement",
        context: "Review and record the Head decision",
        route,
      });
    }
  }
  const assigned = [
    ...new Map(decisions.map((item) => [item.key, item])).values(),
  ];
  const updatesForView = feed.items
    .map((item) =>
      confirmedRead.has(item.id) ? { ...item, read: true } : item,
    )
    .filter((item) => filter !== "unread" || !item.read);
  const sections: { key: string; title: string; data: Entry[] }[] = [];
  if (reviews && assigned.length)
    sections.push({
      key: "decisions",
      title: "Awaiting your review",
      data: assigned.map((decision) => ({ key: decision.key, decision })),
    });
  if (!reviews && updatesForView.length)
    sections.push({
      key: filter === "unread" ? "unread" : "updates",
      title: filter === "unread" ? "Unread updates" : "All updates",
      data: updatesForView.map((update) => ({
        key: "update:" + update.id,
        update,
      })),
    });

  const sources = reviews ? [tasks, finance, work] : [feed];
  const initial = sources.some((source) => source.loading && !source.data);
  const issues = (
    reviews
      ? [
          tasks.error && "Task reviews could not load.",
          finance.error &&
            "Assigned financial reviews couldn't load. Please try again.",
          (work.error ||
            work.data?.issues.length ||
            work.data?.unavailable.length) &&
            "Some reviews couldn't load. Please try again.",
          (updates.error || escalations.error) &&
            "Settlement alerts could not load.",
        ]
      : [feed.error && "Updates could not refresh."]
  ).filter(Boolean);
  const markRead = async (item: Notification) => {
    if (pending.current || item.read) return;
    pending.current = item.id;
    setMarking(item.id);
    setMarkError(undefined);
    try {
      assertAccess(actor);
      await markRecentNotificationRead(actor, item.id);
      setConfirmedRead((previous) => new Set(previous).add(item.id));
      await Promise.all([updates.refresh(), unreadUpdates.refresh()]);
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

  const list = (
    <RefreshSectionList
      style={{ backgroundColor: palette.background }}
      sections={sections}
      keyExtractor={(item) => item.key}
      onEndReached={
        !reviews && feed.hasMore && !feed.moreError
          ? () => void feed.loadMore()
          : undefined
      }
      onEndReachedThreshold={0.5}
      contentContainerStyle={{
        flexGrow: 1,
        padding: space.lg,
        gap: space.sm,
      }}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.xs }}>
          {!!pull.error && (
            <ErrorState error={pull.error} retry={() => void pull.refresh()} />
          )}
          <DisplayUpdateNotice
            visible={!reviews && !!feed.data && feed.stale}
            loading={feed.loading}
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
              {reviews ? "Reviews" : "Inbox"}
            </Text>
          </View>
          {!reviews && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <FilterChip
                label="All"
                accessibilityLabel="All notifications"
                selected={filter === "all"}
                onPress={() => setFilter("all")}
              />
              <FilterChip
                label="Unread"
                accessibilityLabel="Unread notifications"
                selected={filter === "unread"}
                onPress={() => setFilter("unread")}
              />
            </View>
          )}

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
        initial || (!reviews && feed.hasMore && !feed.moreError) ? (
          <FeedSkeleton
            label="Loading your Inbox"
            layout={reviews ? "navigation" : "inbox"}
          />
        ) : issues.length || (!reviews && feed.moreError) ? (
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
              reviews
                ? "No reviews assigned to you"
                : filter === "unread"
                  ? "No unread updates"
                  : "Your work updates will appear here."
            }
            action={
              <Button onPress={() => void refresh()}>
                {reviews ? "Refresh reviews" : "Refresh updates"}
              </Button>
            }
          />
        )
      }
      ListFooterComponent={
        !reviews && feed.hasMore ? (
          <View style={{ minHeight: 44, justifyContent: "center" }}>
            {feed.moreError ? (
              <ErrorState
                error={feed.moreError}
                retry={() => void feed.loadMore(true)}
              />
            ) : feed.loadingMore ? (
              <Text
                accessibilityRole="progressbar"
                accessibilityLiveRegion="polite"
                style={{ color: palette.mutedLabel, textAlign: "center" }}
              >
                Loading more updates…
              </Text>
            ) : null}
          </View>
        ) : undefined
      }
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <FolderPullArea pull={pull}>{list}</FolderPullArea>
    </View>
  );
}
