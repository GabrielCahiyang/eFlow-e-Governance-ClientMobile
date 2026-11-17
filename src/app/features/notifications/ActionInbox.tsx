import { inboxReadEvent } from "./useInboxIndicator";
import { FilterChip } from "../../components/ui/FilterChip";
import { SearchField } from "../../components/ui/Fields";
import { SelectionSheet } from "../../components/ui/SelectionSheet";
import { confirmAction } from "../../shared/confirm";
import { InboxUpdateCard } from "./InboxUpdateCard";
import { markAllInboxUpdatesRead } from "./inboxUpdates";
import { DisplayUpdateNotice } from "../../components/ui/DisplayUpdateNotice";
import { createLiveRefreshController } from "../../shared/liveUpdates";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, View } from "react-native";
import CheckCheck from "lucide-react-native/icons/check-check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigationHeader } from "../navigation/navigationHeaderContext";
import { useIsTabRoot } from "../navigation/tabRootContext";
import { Button, Empty, ErrorState, PageHeader } from "../../components/ui";
import {
  ReviewsFilterBar,
  ReviewsHeader,
  ReviewsQueueCard,
  ReviewsSummaryHero,
  reviewKinds,
  type DecisionItem,
  type ReviewKind,
} from "./ReviewsBoard";
import { useTheme } from "../../components/ui/Appearance";
import {
  FolderPullArea,
  RefreshSectionList,
} from "../../components/ui/FolderRefresh";
import { Text } from "../../components/ui/Typography";
import { space } from "../../components/ui/theme";
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
import { assignedSubtaskReviewRoute, fetchAssignedSubtaskReviews } from "../tasks/assignedSubtaskReviews";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import { useAction } from "../../shared/useAction";
import { PublicMessageError } from "../../shared/userMessages";
import { nativeWindow } from "../../../platform/webRuntime";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import {
  markRecentNotificationRead,
  type Notification,
} from "../../../core/web/app/services/notificationService";
import { normalizeWorkUpdateNotification } from "../../../core/web/app/shared/notificationWorkCopy";
import { inboxUpdateRoute } from "./inboxDestinations";
import { inboxDestinationLabel, inboxUpdateMessage, workUpdateTitle } from "./inboxPresentation";
import { useInboxUpdatePages } from "./useInboxUpdatePages";
import { useInboxCounts } from "./useInboxCounts";
import {
  inboxCategories,
  inboxCategoryLabels,
  inboxCategoryNoun,
  normalizeInboxSearch,
  type InboxCategory,
} from "./inboxCategories";
import { getActionableSettlementEscalations } from "../budget";
import type { AppRoute, Navigate } from "../../shared/routes";

type Decision = DecisionItem & {
  route: AppRoute;
  verifyRoute?: () => Promise<AppRoute>;
};
type Entry =
  { key: string; decision: Decision } | { key: string; update: Notification };
type Filter = "all" | "unread" | "read";
const filterLabels: Record<Filter, string> = {
  all: "All updates",
  unread: "Unread",
  read: "Read",
};

export function updateViewTitle(filter: Filter, category: InboxCategory) {
  if (category === "all")
    return filter === "all"
      ? "All updates"
      : `${filter === "unread" ? "Unread" : "Read"} updates`;
  const label = inboxCategoryLabels[category];
  return filter === "all"
    ? `${label} updates`
    : `${filter === "unread" ? "Unread" : "Read"} ${label.toLowerCase()} updates`;
}

export function emptyUpdatesDescription(
  filter: Filter,
  category: InboxCategory,
) {
  if (category === "all")
    return filter === "all"
      ? "Your work updates will appear here."
      : `No ${filter} updates`;
  const noun = inboxCategoryNoun[category];
  return filter === "all"
    ? `No ${noun} updates yet`
    : `No ${filter} ${noun} updates`;
}

export function ActionInbox({
  navigate,
  initialView,
}: {
  navigate: Navigate;
  initialView?: string;
}) {
  const { profile } = useAuth();
  const assertAccess = useAccountActionAccess();
  const openDecision = useAction({ requireAccess: false });
  const actor = profile!.id;
  const palette = useTheme();
  const tabRoot = useIsTabRoot(),
    inset = useSafeAreaInsets(),
    navHeader = useNavigationHeader();
  const reviews = initialView === "decisions";
  const work = useMobileWorkFeed();
  const tasks = useTaskFacts("inbox-decisions", reviews);
  const subtaskReviews = useFacts(
    "inbox-subtask-reviews:" + actor,
    fetchAssignedSubtaskReviews,
    reviews,
  );
  const finance = useFacts(
    "inbox-independent-reviews:" + actor,
    () => getAssignedIndependentReviews(actor),
    reviews,
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<InboxCategory>("all");
  const [reviewKind, setReviewKind] = useState<ReviewKind>("all");
  const [reviewSearch, setReviewSearch] = useState("");
  // The unfiltered feed stays loaded for staffing alerts and the default
  // view; any narrower view reads its own server-filtered pages.
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  useEffect(() => {
    // Wait for a pause in typing before asking the server.
    const next = normalizeInboxSearch(searchText);
    if (next === search) return;
    const timer = setTimeout(() => setSearch(next), 300);
    return () => clearTimeout(timer);
  }, [searchText, search]);
  const narrowed = filter !== "all" || category !== "all" || !!search;
  // The unfiltered feed loads only while it is on screen, or on Reviews for a
  // Head's settlement alerts; a filtered view never fetches both lists.
  const updates = useInboxUpdatePages(
    actor,
    false,
    reviews ? profile?.role === "head" : !narrowed,
  );
  const filteredUpdates = useInboxUpdatePages(
    actor,
    filter === "unread",
    !reviews && narrowed,
    { category, search, readOnly: filter === "read" },
  );
  const feed = narrowed ? filteredUpdates : updates;
  // Shared with the tab badge; the navigator keeps it live.
  const counts = useInboxCounts();
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
      subtaskReviews.refresh(),
      finance.refresh(),
      escalations.refresh(),
      updates.refresh(),
      filteredUpdates.refresh(),
      counts.refresh(),
      ...(reviews ? [work.refresh()] : []),
    ]);
  const pull = usePullRefresh(async () => {
    updates.discardHistory();
    filteredUpdates.discardHistory();
    await refresh();
  });

  useEffect(() => {
    const refreshInbox = (force = true) => {
      if (AppState.currentState === "active")
        void Promise.all([
          tasks.refresh(),
          subtaskReviews.refresh(),
          finance.refresh(),
          escalations.refresh(),
          force ? updates.refresh() : updates.refreshIfStale(),
          force ? filteredUpdates.refresh() : filteredUpdates.refreshIfStale(),
        ]);
    };
    const live = createLiveRefreshController({
      onRefresh: () => refreshInbox(false),
      hasRealtime: true,
    });
    // Notifications and work updates often arrive in bursts; reload once per
    // burst instead of once per event.
    const changes = createLiveRefreshController({
      onRefresh: () => refreshInbox(true),
      debounceMs: 500,
      maxWaitMs: 3_000,
      hasRealtime: true,
      pollIntervalMs: 0,
    });
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
          changes.schedule();
        },
      )
      .subscribe(live.onChannelStatus);
    const workChanged = () => changes.schedule();
    nativeWindow.addEventListener("eflow:work-updated", workChanged);
    return () => {
      live.dispose();
      changes.dispose();
      nativeWindow.removeEventListener("eflow:work-updated", workChanged);
      void supabase.removeChannel(channel);
    };
  }, [
    actor,
    tasks.refresh,
    subtaskReviews.refresh,
    finance.refresh,
    escalations.refresh,
    updates.refresh,
    updates.refreshIfStale,
    filteredUpdates.refresh,
    filteredUpdates.refreshIfStale,
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
    kind: item.entityId ? "subtask" : "task",
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
          kind: "personal",
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
          kind: "personal",
          title: row.title,
          context: "Personal review · " + row.projectTitle,
          route: workDestination(row),
        });
      }
    }
  }
  for (const review of subtaskReviews.error ? [] : subtaskReviews.data ?? []) {
    decisions.push({
      key: "subtask-proposal:" + review.id,
      kind: "subtask",
      title: review.subtask_title,
      context: review.cash_blocked
        ? `${review.task_title} · Waiting for cash settlement`
        : `${review.task_title} · ${review.kind === "completion" ? "Completion" : "Progress"} review`,
      cashBlocked: Boolean(review.cash_blocked),
      route: assignedSubtaskReviewRoute(review),
      verifyRoute: async () => {
        const tree = await fetchWorkTree(review.root_id);
        if (tree.root.kind !== "office" || !tree.nodes.some((item) =>
          item.id === review.node_id && item.task_id === review.root_id))
          throw new PublicMessageError(
            "This Subtask is no longer available. Refresh reviews.",
          );
        return assignedSubtaskReviewRoute(review, tree.root.project || undefined);
      },
    });
  }
  for (const pack of finance.error ? [] : finance.data || []) {
    if (
      pack.context.current &&
      pack.context.canReview &&
      pack.context.review?.status === "pending"
    )
      decisions.push({
        key: "financial-review:" + pack.liquidation.id,
        kind: "financial",
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
        kind: "financial",
        title: "Escalated settlement",
        context: "Review and record the Head decision",
        route,
      });
    }
  }
  const allAssigned = [
    ...new Map(decisions.map((item) => [item.key, item])).values(),
  ];
  const reviewQuery = reviewSearch.trim().toLowerCase();
  const assigned = allAssigned.filter((item) => {
    if (reviewKind !== "all" && item.kind !== reviewKind) return false;
    if (!reviewQuery) return true;
    return `${item.title} ${item.context}`.toLowerCase().includes(reviewQuery);
  });
  const updatesTitle = updateViewTitle(filter, category);
  const updatesForView = feed.items
    .map((item) =>
      confirmedRead.has(item.id) ? { ...item, read: true } : item,
    )
    .filter(
      (item) =>
        filter === "all" || (filter === "unread" ? !item.read : item.read),
    );
  const sections: { key: string; title: string; data: Entry[] }[] = [];
  if (!reviews && updatesForView.length)
    sections.push({
      key: `${filter}:${category}`,
      title: updatesTitle,
      data: updatesForView.map((update) => ({
        key: "update:" + update.id,
        update,
      })),
    });

  const sources = reviews ? [tasks, finance, work, subtaskReviews] : [feed];
  const initial = sources.some((source) => source.loading && !source.data);
  const issues = (
    reviews
      ? [
          tasks.error && "Task reviews could not load.",
          subtaskReviews.error && "Assigned Subtask reviews could not load.",
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
  const markRead = async (item: Notification, quiet = false) => {
    if (pending.current || item.read || markingAll) return;
    pending.current = item.id;
    setMarking(item.id);
    if (!quiet) setMarkError(undefined);
    try {
      assertAccess(actor);
      await markRecentNotificationRead(actor, item.id);
      setConfirmedRead((previous) => new Set(previous).add(item.id));
      nativeWindow.dispatchEvent({ type: inboxReadEvent });
      // The read event refreshes the shared unread counts.
      await Promise.all([updates.refresh(), filteredUpdates.refresh()]);
    } catch (error) {
      // Opening a card marks it read in the background; only an explicit
      // "Mark as read" reports a failure. The dot stays until confirmed.
      if (!quiet)
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
  const hasUnread =
    (counts.data?.all ?? 0) > 0 || updatesForView.some((item) => !item.read);
  const markAll = async () => {
    if (markingAll || pending.current) return;
    const confirmed = await confirmAction(
      "Mark all as read?",
      "Every unread update in your Inbox will be marked as read, including ones not shown by the current filter.",
      "Mark all read",
    );
    if (!confirmed) return;
    setMarkingAll(true);
    setMarkError(undefined);
    try {
      assertAccess(actor);
      await markAllInboxUpdatesRead(actor);
      setConfirmedRead(
        (previous) =>
          new Set([...previous, ...feed.items.map((item) => item.id)]),
      );
      nativeWindow.dispatchEvent({ type: inboxReadEvent });
      // The read event refreshes the shared unread counts.
      await Promise.all([updates.refresh(), filteredUpdates.refresh()]);
    } catch (error) {
      setMarkError(
        error instanceof Error
          ? error
          : new Error("Could not mark your updates read."),
      );
    } finally {
      setMarkingAll(false);
    }
  };
  const resetFilters = () => {
    setFilter("all");
    setCategory("all");
    setSearchText("");
    setSearch("");
  };

  const openDecisionRoute = (decision: Decision) => {
    const { verifyRoute, route } = decision;
    if (!verifyRoute) navigate(route);
    else void openDecision.run(async () => navigate(await verifyRoute()));
  };

  const list = (
    <RefreshSectionList
      style={{ backgroundColor: palette.background }}
      sections={sections}
      keyExtractor={(item) => item.key}
      contentContainerStyle={{
        flexGrow: 1,
        padding: space.lg,
        paddingBottom: space.lg + (navHeader?.bottomInset ?? 0),
        gap: space.sm,
      }}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View
          style={{
            gap: space.md,
            marginBottom: space.xs,
            paddingTop: navHeader?.topInset ?? (tabRoot ? inset.top : 0),
          }}
        >
          {!reviews && (
            <PageHeader
              title="Inbox"
              subtitle={
                filter === "unread"
                  ? "Unread updates across your work"
                  : "Task, project & workflow activity"
              }
              onBack={
                navHeader?.onBack ??
                (tabRoot ? () => navigate({ name: "overview" }) : undefined)
              }
              backHint={
                navHeader?.backHint ??
                (tabRoot ? "Returns to Home" : undefined)
              }
            />
          )}
          {reviews && (
            <ReviewsHeader
              totalCount={allAssigned.length}
              showBack={tabRoot || !!navHeader?.onBack}
              onBack={navHeader?.onBack ?? (() => navigate({ name: "overview" }))}
            />
          )}
          {!!pull.error && (
            <ErrorState error={pull.error} retry={() => void pull.refresh()} />
          )}
          <DisplayUpdateNotice
            visible={
              !reviews &&
              !!feed.data &&
              feed.stale &&
              !feed.error &&
              !feed.loading
            }
            loading={feed.loading}
          />
          {!reviews && (
            <View style={{ gap: 8 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={{ flex: 1 }}>
                  <SearchField
                    value={searchText}
                    onChange={setSearchText}
                    placeholder="Search updates"
                  />
                </View>
                <Button
                  variant="outline"
                  busy={markingAll}
                  disabled={!hasUnread || markingAll || !!marking}
                  icon={<CheckCheck size={15} color={palette.primary} />}
                  onPress={() => void markAll()}
                  style={{ minHeight: 48 }}
                >
                  Mark all read
                </Button>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingRight: space.sm,
                }}
              >
                <FilterChip
                  label={filterLabels[filter]}
                  icon
                  selected={filter !== "all"}
                  onPress={() => setStatusOpen(true)}
                  accessibilityLabel={`Show: ${filterLabels[filter]}`}
                />
                <View
                  importantForAccessibility="no"
                  style={{
                    width: 1,
                    height: 24,
                    backgroundColor: palette.border,
                    marginHorizontal: 2,
                  }}
                />
                {inboxCategories.map((value) => (
                  <FilterChip
                    key={value}
                    label={inboxCategoryLabels[value]}
                    accessibilityLabel={
                      (value === "all"
                        ? "All notification types"
                        : `${inboxCategoryLabels[value]} notifications`) +
                      (counts.data?.[value]
                        ? `, ${counts.data[value]} unread`
                        : "")
                    }
                    selected={category === value}
                    count={counts.data?.[value]}
                    onPress={() => setCategory(value)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
          {reviews && !initial && <ReviewsSummaryHero items={allAssigned} />}
          {reviews && (allAssigned.length > 0 || reviewKind !== "all" || !!reviewSearch) && (
            <ReviewsFilterBar
              items={allAssigned}
              reviewKind={reviewKind}
              onSelectKind={setReviewKind}
              searchText={reviewSearch}
              onChangeSearch={setReviewSearch}
            />
          )}

          {!!issues.length && (
            <ErrorState
              error={issues.join("\n")}
              retry={() => void refresh()}
            />
          )}
          {!!markError && <ErrorState error={markError} />}
          {!!openDecision.error && <ErrorState error={openDecision.error} />}
          {reviews && assigned.length > 0 && (
            <ReviewsQueueCard items={assigned} onOpen={openDecisionRoute} />
          )}
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
              fontSize: 17,
              color: palette.text,
            }}
          >
            {section.title}
          </Text>
          <View
            style={{
              backgroundColor: palette.primarySoft,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: palette.primary,
              }}
            >
              {section.data.length}
            </Text>
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      renderItem={({ item }) => {
        if ("decision" in item) return null;
        const update = item.update;
        const copy = normalizeWorkUpdateNotification({ ...update, title: workUpdateTitle(update.title) });
        const target = inboxUpdateRoute(update, profile!.role);
        const message = inboxUpdateMessage(copy.message, update.reason);
        return (
          <InboxUpdateCard
            update={update}
            title={copy.title}
            message={message}
            destinationLabel={inboxDestinationLabel(target)}
            onOpen={
              target
                ? () => {
                    // Opening counts as reading; the write is confirmed in
                    // the background and never blocks navigation.
                    if (!update.read) void markRead(update, true);
                    navigate(target);
                  }
                : undefined
            }
            onMarkRead={() => void markRead(update)}
            marking={marking === update.id}
            markDisabled={!!marking || markingAll}
          />
        );
      }}
      ListEmptyComponent={
        reviews && assigned.length > 0 ? undefined : initial ||
          (!reviews && feed.hasMore && !feed.moreError) ? (
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
            kind={
              (!reviews && search) || (reviews && !!reviewQuery)
                ? "search"
                : reviews || filter === "unread"
                  ? "complete"
                  : "inbox"
            }
            title={
              (!reviews && search) || (reviews && !!reviewQuery)
                ? !reviews
                  ? "No matching updates"
                  : "No matching reviews"
                : "You're all caught up"
            }
            description={
              reviews
                ? reviewQuery
                  ? `No reviews match "${reviewSearch.trim()}". Try other words or clear filters.`
                  : reviewKind === "all"
                    ? "No reviews assigned to you"
                    : `No ${reviewKinds
                        .find((item) => item.kind === reviewKind)!
                        .label.toLowerCase()} reviews assigned to you`
                : search
                  ? `No updates match "${search}". Try other words or clear your filters.`
                  : emptyUpdatesDescription(filter, category)
            }
            action={
              !reviews && narrowed ? (
                <Button
                  variant="outline"
                  icon={<RotateCcw size={15} color={palette.primary} />}
                  onPress={resetFilters}
                >
                  Clear search and filters
                </Button>
              ) : reviews && (!!reviewQuery || reviewKind !== "all") ? (
                <Button
                  variant="outline"
                  icon={<RotateCcw size={15} color={palette.primary} />}
                  onPress={() => {
                    setReviewSearch("");
                    setReviewKind("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
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
            ) : (
              <Button
                variant="outline"
                busy={feed.loadingMore}
                disabled={feed.loadingMore}
                icon={<ChevronDown size={15} color={palette.primary} />}
                onPress={() => void feed.loadMore()}
              >
                {feed.loadingMore ? "Loading more updates…" : "View more"}
              </Button>
            )}
          </View>
        ) : undefined
      }
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <FolderPullArea pull={pull}>{list}</FolderPullArea>
      {!reviews && (
        <SelectionSheet
          open={statusOpen}
          title="Show updates"
          value={filter}
          options={[
            { id: "all", title: "All updates", description: "Read and unread" },
            { id: "read", title: "Read", description: "Updates you have already read" },
            {
              id: "unread",
              title: "Unread",
              description: counts.data
                ? `${counts.data.all} unread update${counts.data.all === 1 ? "" : "s"}`
                : "Updates you have not read yet",
            },
          ]}
          onSelect={(value) => {
            setFilter(value as Filter);
            setStatusOpen(false);
          }}
          onClose={() => setStatusOpen(false)}
        />
      )}
    </View>
  );
}
