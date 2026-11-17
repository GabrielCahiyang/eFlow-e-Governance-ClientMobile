import AlertCircle from "lucide-react-native/icons/circle-alert";
import Banknote from "lucide-react-native/icons/banknote";
import Bell from "lucide-react-native/icons/bell";
import Calendar from "lucide-react-native/icons/calendar";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Clock from "lucide-react-native/icons/clock";
import ChartColumn from "lucide-react-native/icons/chart-column";
import FolderKanban from "lucide-react-native/icons/folder-kanban";
import PiggyBank from "lucide-react-native/icons/piggy-bank";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Screen,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { space, type, withOpacity } from "../../components/ui/theme";
import { completionPercent } from "../../shared/completion";
import { useFacts } from "../../shared/useFacts";
import type { AppRoute, Navigate } from "../../shared/routes";
import { nativeWindow } from "../../../platform/webRuntime";
import { useAuth } from "../authentication";
import { useMobileWorkFeed } from "../personal-work/WorkFeedProvider";
import { fetchProjectCompletion } from "../projects/services";
import { netProjectUpdates } from "../projects/subscriptions";
import { useWorkspace } from "../workspaces";
import { workDestination } from "../personal-work/workDestination";
import { canUserReviewTask } from "../../../core/web/app/features/reviews/selectors";
import { isAppointedOfficeHead } from "../../../core/web/app/shared/officeAuthority";
import { getCurrentFiscalYear } from "../../../core/web/app/features/budget/constants";
import {
  HomeCard,
  HomeMessage,
  HomeRow,
  HomeRowChevron,
  HomeSection,
} from "./HomeSections";
import { AccountingHome } from "./AccountingHome";
import { CircularProgressRing } from "../tasks/TaskBentoComponents";
import { currentOfficeProjects, memberHome, officeHomeWork } from "./homeWork";
import { assignedFinanceReviews, headCashDecisions } from "./homeFinance";
import { fetchInboxUpdatePage } from "../notifications/inboxUpdates";
import { HomeBody, HomeHero, HomeHeroStats } from "./HomeHero";
import { HeadTodayCard } from "./HeadTodayCard";
import { inboxUpdateRoute } from "../notifications/inboxDestinations";
import type { Notification } from "../../../core/web/app/services/notificationService";

export function OverviewScreen({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth();
  if (profile?.role === "accounting_staff")
    return <AccountingHome navigate={navigate} />;
  return profile?.role === "head" ? (
    <HeadHome navigate={navigate} />
  ) : (
    <MemberHome navigate={navigate} />
  );
}

function HeadHome({ navigate }: { navigate: Navigate }) {
  const { profile, organization, can } = useAuth();
  const workspace = useWorkspace();
  const work = useMobileWorkFeed();
  const scope =
    !workspace.error && workspace.selected?.workspace.kind === "office"
      ? workspace.selected
      : undefined;
  const office = scope?.workspace.office_id;
  const actor = profile?.id || "";
  const year = getCurrentFiscalYear();
  const appointed =
    !!office &&
    office === profile?.org_id &&
    isAppointedOfficeHead(profile, organization ? [organization] : []);
  const showWork = can("navigation.tasks");
  const showProjects = can("navigation.projects");
  const showAnalytics = appointed && can("navigation.reports");
  const rows = showWork && scope && !work.error ? work.data?.rows : undefined;
  const signals = officeHomeWork(rows ?? [], scope, actor);
  const currentProjects =
    scope && showProjects
      ? currentOfficeProjects(scope, signals.risk, signals.relevantProjects)
      : [];
  const projects = currentProjects.slice(0, 3);
  const scopeKey = JSON.stringify([
    actor,
    scope?.workspace.id,
    projects.map((project) => project.id),
  ]);
  const progress = useFacts(
    "head-project-progress:" + scopeKey,
    async () => {
      const pairs = await Promise.all(
        projects.map(async (project) => {
          try {
            return [
              project.id,
              await fetchProjectCompletion(project.id, false),
            ] as const;
          } catch {
            return [project.id, undefined] as const;
          }
        }),
      );
      return new Map(pairs);
    },
    !!projects.length,
  );
  const allowedProjects =
    scope?.projects
      .filter((project) => project.kind === "office")
      .map((project) => project.id)
      .sort() ?? [];
  const cash = useFacts(
    "head-cash-decisions:" +
      JSON.stringify([
        actor,
        office,
        year,
        scope?.workspace.id,
        allowedProjects,
      ]),
    () =>
      headCashDecisions(
        office!,
        year,
        scope!.workspace.id,
        actor,
        new Set(allowedProjects),
      ),
    appointed && showWork && showProjects,
  );
  const reviews = useFacts(
    "home-assigned-finance:" + actor + ":" + office,
    () => assignedFinanceReviews(actor, office!),
    !!actor && !!office,
  );
  useEffect(() => {
    if (!office) return;
    const refresh = () => {
      void progress.refresh();
      void cash.refresh();
      void reviews.refresh();
    };
    const refreshFinance = () => {
      void cash.refresh();
      void reviews.refresh();
    };
    const cleanup = projects.map(({ id }) =>
      netProjectUpdates(id, () => void progress.refresh()),
    );
    nativeWindow.addEventListener("eflow:work-updated", refresh);
    nativeWindow.addEventListener("eflow:finance-updated", refreshFinance);
    return () => {
      cleanup.forEach((dispose) => dispose());
      nativeWindow.removeEventListener("eflow:work-updated", refresh);
      nativeWindow.removeEventListener("eflow:finance-updated", refreshFinance);
    };
  }, [office, scopeKey, progress.refresh, cash.refresh, reviews.refresh]);
  const taskReviews = (rows ?? []).flatMap((row) => {
    const task = row.task,
      submission = task?.latestSubmission;
    if (
      row.kind !== "office-task" ||
      row.workspaceId !== scope?.workspace.id ||
      !task ||
      row.history ||
      task.status !== "for_review" ||
      !submission?.submitterId ||
      submission.submitterId === actor ||
      !canUserReviewTask(task, actor, "head") ||
      (row.projectId &&
        !scope?.projects.some(
          (project) =>
            project.id === row.projectId && project.kind === "office",
        ))
    )
      return [];
    return [
      {
        key: "review:" + row.key,
        title: row.title,
        description: ["Action required · Review work", row.projectTitle]
          .filter(Boolean)
          .join(" · "),
        route: {
          ...workDestination(row),
          view: "review",
          recordId: submission.id,
        },
        priority: 1,
        sort: submission.submittedAt,
      },
    ];
  });
  const reviewed = new Set(
    taskReviews.map((row) => row.key.slice("review:".length)),
  );
  const attention = [
    ...taskReviews,
    ...signals.attention.filter(
      (row) => row.priority <= 2 && !reviewed.has(row.key),
    ),
    ...(!cash.error ? (cash.data ?? []) : []),
    ...(!reviews.error ? (reviews.data ?? []) : []),
  ]
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.sort - b.sort ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 3);
  const incomplete =
    !!(
      showWork &&
      (work.error ||
        work.data?.issues?.length ||
        work.data?.unavailable?.length)
    ) ||
    !!cash.error ||
    !!reviews.error;
  const waiting =
    (showWork && !rows && work.loading) ||
    (cash.loading && !cash.data) ||
    (reviews.loading && !reviews.data);
  const refresh = async () => {
    await Promise.all([
      workspace.refresh(),
      work.refresh(),
      progress.refresh(),
      cash.refresh(),
      reviews.refresh(),
    ]);
  };
  const palette = useTheme();
  return (
    <Screen compact edgeToEdge onRefresh={refresh} style={{ gap: 0 }}>
      <HomeHero
        navigate={navigate}
        subtitle={scope?.workspace.name}
        actions={[
          ...(scope && showAnalytics
            ? [
                {
                  key: "analytics",
                  label: "Office Analytics",
                  Icon: ChartColumn,
                  onPress: () => navigate({ name: "reports" }),
                },
              ]
            : []),
          ...(scope && showProjects
            ? [
                {
                  key: "budget",
                  label: "Office Budget",
                  Icon: PiggyBank,
                  onPress: () => navigate({ name: "budget" }),
                },
              ]
            : []),
        ]}
      >
        {!!scope && (
          <HomeHeroStats
            stats={[
              {
                key: "projects",
                label: "Current projects",
                value: currentProjects.length,
                accessibilityLabel: `${currentProjects.length} current project${currentProjects.length === 1 ? "" : "s"}`,
              },
              {
                key: "decisions",
                label: "Decisions",
                value: attention.length,
                accessibilityLabel: `${attention.length} decision${attention.length === 1 ? "" : "s"} awaiting your action`,
              },
              {
                key: "risk",
                label: "At risk",
                value: signals.overdueOrBlocked,
                accessibilityLabel: `${signals.overdueOrBlocked} work item${signals.overdueOrBlocked === 1 ? "" : "s"} at risk`,
              },
            ]}
          />
        )}
      </HomeHero>
      <HomeBody>
      {workspace.error ? (
        <ErrorState error={workspace.error} retry={() => void refresh()} />
      ) : !scope && workspace.loading ? (
        <Loading label="Loading Office overview" layout="summary" />
      ) : !scope ? (
        <HomeCard>
          <Empty
            compact
            kind="people"
            title="Office work isn't available right now"
          />
        </HomeCard>
      ) : (
        <>
          <HeadTodayCard
            attentionCount={attention.length}
            decisions={attention.map((row, index) => (
              <DecisionCard
                key={row.key}
                row={row}
                isFirst={index === 0}
                navigate={navigate}
              />
            ))}
          >
            {!attention.length &&
              (waiting ? (
                <Loading
                  label="Checking Office attention"
                  layout="summary"
                  rows={2}
                />
              ) : (
                !incomplete &&
                (rows || !showWork) && (
                  <Empty
                    compact
                    kind="complete"
                    title="All clear"
                    description="No Office work needs your attention right now."
                  />
                )
              ))}
            {incomplete && (
              <ErrorState
                error="Some Office attention records are unavailable."
                retry={() => void refresh()}
              />
            )}
          </HeadTodayCard>

          {showProjects && (
            <HomeSection
              title="Current Projects"
              tone="primary"
              icon={<FolderKanban size={15} color={palette.primary} />}
              badge={projects.length ? String(projects.length) : undefined}
              onAction={() => navigate({ name: "projects" })}
              actionAccessibilityLabel="See all projects"
            >
              {!projects.length ? (
                <HomeCard>
                  <Empty
                    compact
                    kind="projects"
                    title="No current Office projects"
                  />
                </HomeCard>
              ) : (
                <HomeCard>
                  {projects.map((project, index) => (
                    <ProjectProgressRow
                      key={project.id}
                      isFirst={index === 0}
                      title={project.title}
                      totals={
                        progress.error
                          ? undefined
                          : progress.data?.get(project.id)
                      }
                      loading={progress.loading && !progress.data}
                      risk={signals.risk.get(project.id)}
                      onPress={() =>
                        navigate({
                          name: "project",
                          id: project.id,
                          workspaceId: scope.workspace.id,
                        })
                      }
                    />
                  ))}
                  {(progress.error ||
                    (progress.data &&
                      projects.some(
                        (project) => !progress.data!.get(project.id),
                      ))) && (
                    <Button
                      variant="ghost"
                      icon={<RefreshCw size={15} color={palette.primary} />}
                      onPress={() => void progress.refresh()}
                    >
                      Retry project progress
                    </Button>
                  )}
                </HomeCard>
              )}
            </HomeSection>
          )}

        </>
      )}
      </HomeBody>
    </Screen>
  );
}

function MemberHome({ navigate }: { navigate: Navigate }) {
  const { profile, organization, can } = useAuth();
  const workspace = useWorkspace();
  const feed = useMobileWorkFeed();
  const scope = workspace.error ? undefined : workspace.selected?.workspace;
  const showWork = can("navigation.tasks");
  const actor = profile?.id || "";
  const rows = showWork && scope && !feed.error ? feed.data?.rows : undefined;
  const data =
    scope && rows ? memberHome(rows, actor, scope.id) : undefined;
  const incomplete = !!(
    feed.error ||
    feed.data?.issues?.length ||
    feed.data?.unavailable?.length
  );

  const updates = useFacts(
    "member-latest-updates:" + actor,
    () => fetchInboxUpdatePage(actor, false),
    !!actor,
  );
  const palette = useTheme();
  const hasUrgentAction = (data?.overdue ?? 0) > 0;

  const refresh = async () => {
    await Promise.all([
      workspace.refresh(),
      feed.refresh(),
      updates.refresh(),
    ]);
  };

  useEffect(() => {
    const reload = () => {
      void feed.refresh();
      void updates.refresh();
    };
    nativeWindow.addEventListener("eflow:work-updated", reload);
    nativeWindow.addEventListener("eflow:inbox-updated", reload);
    return () => {
      nativeWindow.removeEventListener("eflow:work-updated", reload);
      nativeWindow.removeEventListener("eflow:inbox-updated", reload);
    };
  }, [feed.refresh, updates.refresh]);

  const recentUpdates = (updates.data?.items ?? []).slice(0, 3);

  return (
    <Screen compact edgeToEdge onRefresh={refresh} style={{ gap: 0 }}>
      <HomeHero navigate={navigate} subtitle={organization?.name}>
        {data && scope && (
          <HomeHeroStats
            stats={[
              {
                key: "overdue",
                label: "Overdue",
                value: data.overdue,
                accessibilityLabel: `${data.overdue} overdue work item${data.overdue === 1 ? "" : "s"}`,
              },
              {
                key: "today",
                label: "Due today",
                value: data.today,
                accessibilityLabel: `${data.today} work item${data.today === 1 ? "" : "s"} due today`,
              },
              {
                key: "awaiting",
                label: "Awaiting review",
                value: data.awaiting,
                accessibilityLabel: `${data.awaiting} work item${data.awaiting === 1 ? "" : "s"} awaiting review`,
              },
            ]}
          />
        )}
      </HomeHero>
      <HomeBody>
      {workspace.error ? (
        <ErrorState error={workspace.error} retry={() => void refresh()} />
      ) : !scope ? (
        workspace.loading ? (
          <Loading label="Loading your workspace" layout="summary" />
        ) : (
          <HomeCard>
            <Empty
              compact
              kind="people"
              title="Your assignments aren't available right now"
            />
          </HomeCard>
        )
      ) : !showWork ? (
        <HomeCard>
          <Empty
            compact
            kind="people"
            title="Work assignments are unavailable to this account"
          />
        </HomeCard>
      ) : (
        <>
          <HomeSection
            title="Needs your action"
            tone={hasUrgentAction ? "danger" : "primary"}
            icon={
              <Clock
                size={15}
                color={hasUrgentAction ? palette.danger : palette.primary}
              />
            }
            badge={
              data?.priorities.length
                ? String(data.priorities.length)
                : undefined
            }
            onAction={() => navigate({ name: "personal_work" })}
            actionAccessibilityLabel="See all assigned work"
          >
            {!!data?.priorities.length && (
              <HomeCard>
                {data.priorities.map((item, index) => (
                  <MemberActionCardItem
                    key={item.key}
                    item={item}
                    isFirst={index === 0}
                    navigate={navigate}
                  />
                ))}
              </HomeCard>
            )}
            {!data && feed.loading && (
              <Loading
                label="Loading your priorities"
                layout="summary"
                rows={2}
              />
            )}
            {data && !data.priorities.length && !incomplete && (
              <HomeCard>
                <Empty
                  compact
                  kind="complete"
                  title="All caught up"
                  description="No assignments need your action right now."
                />
              </HomeCard>
            )}
            {incomplete || (!data && !feed.loading) ? (
              <ErrorState
                error="Some assignments could not be verified."
                retry={() => void refresh()}
              />
            ) : null}
          </HomeSection>

          {data && !incomplete && !!data.comingUp.length && (
            <HomeSection
              title="Coming up"
              tone="primary"
              icon={<Calendar size={15} color={palette.primary} />}
              badge={String(data.comingUp.length)}
              onAction={() =>
                navigate({ name: "personal_work", view: "deadlines" })
              }
              actionAccessibilityLabel="See all upcoming schedule"
            >
              <HomeCard>
                {data.comingUp.map((item, index) => (
                  <MemberComingUpItem
                    key={item.key}
                    item={item}
                    isFirst={index === 0}
                    navigate={navigate}
                  />
                ))}
              </HomeCard>
            </HomeSection>
          )}

          <HomeSection
            title="Latest updates"
            tone="primary"
            icon={<Bell size={15} color={palette.primary} />}
            badge={
              recentUpdates.length
                ? String(recentUpdates.length)
                : undefined
            }
            onAction={() => navigate({ name: "inbox" })}
            actionAccessibilityLabel="See all in Inbox"
          >
            {updates.loading && !updates.data && (
              <Loading
                label="Loading recent updates"
                layout="summary"
                rows={2}
              />
            )}
            {!!recentUpdates.length && (
              <HomeCard>
                {recentUpdates.map((item, index) => (
                  <MemberUpdateItem
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    navigate={navigate}
                  />
                ))}
              </HomeCard>
            )}
            {updates.error ? (
              <HomeMessage>
                Recent updates are currently unavailable.
              </HomeMessage>
            ) : (
              !updates.loading &&
              !recentUpdates.length && (
                <HomeCard>
                  <Empty
                    compact
                    kind="inbox"
                    title="No recent updates"
                    description="Assignments, reviews and mentions will appear here."
                  />
                </HomeCard>
              )
            )}
          </HomeSection>

          {!!data?.waiting.length && (
            <HomeSection
              title="Waiting on others"
              tone="review"
              icon={<ClipboardCheck size={15} color={palette.review} />}
              badge={String(data.waiting.length)}
              onAction={() =>
                navigate({ name: "personal_work", view: "awaiting" })
              }
              actionAccessibilityLabel="See all waiting work"
            >
              <HomeCard>
                {data.waiting.map((item, index) => (
                  <MemberWaitingItemCard
                    key={item.key}
                    item={item}
                    isFirst={index === 0}
                    navigate={navigate}
                  />
                ))}
              </HomeCard>
            </HomeSection>
          )}
        </>
      )}
      </HomeBody>
    </Screen>
  );
}

function MemberActionCardItem({
  item,
  isFirst = false,
  navigate,
}: {
  item: {
    key: string;
    id: string;
    title: string;
    projectTitle?: string;
    workspaceName?: string;
    status: string;
    due?: string | null;
    dueLabel?: string;
    isOverdue: boolean;
    isToday: boolean;
    relation: string;
    isLead: boolean;
    actionLabel: string;
    blocker?: string | null;
    route: AppRoute;
  };
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();

  const isChangesRequested = item.status === "changes_requested";
  const isStuck = item.status === "in_progress" && !!item.blocker?.trim();
  const statusColor = isChangesRequested
    ? palette.danger
    : item.isOverdue
      ? palette.danger
      : isStuck
        ? palette.danger
        : item.isToday
          ? palette.warning
          : item.blocker
            ? palette.warning
            : item.status === "in_progress"
              ? palette.primary
              : palette.mutedLabel;

  const statusText = isChangesRequested
    ? "Changes requested"
    : item.isOverdue
      ? "Overdue"
      : isStuck
        ? "Stuck"
        : item.isToday
          ? "Due today"
          : item.blocker
            ? "Blocker reported"
            : item.status === "in_progress"
              ? "In progress"
              : "To do";

  const statusBg = isChangesRequested || item.isOverdue || isStuck
    ? palette.dangerSoft
    : item.isToday || item.blocker
      ? palette.warningSoft
      : item.status === "in_progress"
        ? palette.primarySoft
        : palette.surface;
  const StatusIcon =
    isChangesRequested || item.isOverdue || isStuck
      ? AlertCircle
      : item.isToday || item.blocker
        ? Clock
        : CircleCheck;

  const relation = item.relation || (item.isLead ? "Lead" : "Contributor");
  const context = [
    item.projectTitle || item.workspaceName,
    item.dueLabel && statusText !== "Due today" && statusText !== "Overdue"
      ? `Due ${item.dueLabel}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const blocker = item.blocker?.trim();

  return (
    <HomeRow
      isFirst={isFirst}
      accessibilityLabel={[
        item.title,
        statusText,
        relation,
        context,
        blocker ? `Blocker: ${blocker}` : undefined,
      ]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint={item.actionLabel}
      onPress={() => navigate(item.route)}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: statusBg,
          borderWidth: 1,
          borderColor: withOpacity(statusColor, 0.2),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <StatusIcon size={16} color={statusColor} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: palette.text,
            lineHeight: 19,
          }}
        >
          {item.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: statusBg,
              borderWidth: 1,
              borderColor: withOpacity(statusColor, 0.24),
            }}
          >
            <StatusIcon size={11.5} color={statusColor} />
            <Text
              style={{
                fontSize: 11,
                lineHeight: 15,
                fontWeight: "700",
                color: statusColor,
              }}
            >
              {statusText}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              lineHeight: 16,
              color: palette.mutedLabel,
              flexShrink: 1,
            }}
          >
            {context ? `${relation} · ${context}` : relation}
          </Text>
        </View>
        {!!blocker && (
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 9,
              backgroundColor: palette.warningSoft,
              borderWidth: 1,
              borderColor: withOpacity(palette.warning, 0.22),
            }}
          >
            <Text
              style={{ fontSize: 11.5, lineHeight: 16, color: palette.warning }}
            >
              Blocker: {blocker}
            </Text>
          </View>
        )}
      </View>
      <HomeRowChevron />
    </HomeRow>
  );
}

function MemberComingUpItem({
  item,
  isFirst = false,
  navigate,
}: {
  item: {
    key: string;
    id: string;
    title: string;
    projectTitle?: string;
    status: string;
    due?: string | null;
    dueLabel?: string;
    daysUntil: number;
    route: AppRoute;
  };
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  const daysText =
    item.daysUntil === 0
      ? "Today"
      : item.daysUntil === 1
        ? "Tomorrow"
        : `In ${item.daysUntil} days`;

  return (
    <HomeRow
      isFirst={isFirst}
      accessibilityLabel={`${item.title}, Due ${daysText}`}
      onPress={() => navigate(item.route)}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: palette.primarySoft,
          borderWidth: 1,
          borderColor: withOpacity(palette.primary, 0.14),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Calendar size={16} color={palette.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: palette.text,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: palette.mutedLabel,
          }}
          numberOfLines={1}
        >
          {[
            item.projectTitle,
            item.dueLabel ? `Due ${item.dueLabel}` : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 2.5,
          borderRadius: 999,
          backgroundColor: palette.blueSoft,
          borderWidth: 1,
          borderColor: withOpacity(palette.blue, 0.24),
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: palette.blue,
          }}
        >
          {daysText}
        </Text>
      </View>
      <HomeRowChevron />
    </HomeRow>
  );
}

function MemberUpdateItem({
  item,
  isFirst = false,
  navigate,
}: {
  item: Notification;
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  const route =
    (() => {
      try {
        return item.type ? inboxUpdateRoute(item, "member") : undefined;
      } catch {
        return undefined;
      }
    })() || ({ name: "inbox" } as const);

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  };

  return (
    <HomeRow
      isFirst={isFirst}
      accessibilityLabel={`${item.title}: ${item.message}`}
      onPress={() => navigate(route)}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: !item.read ? palette.primarySoft : palette.surface,
          borderWidth: 1,
          borderColor: !item.read
            ? withOpacity(palette.primary, 0.16)
            : palette.border,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Bell
          size={16}
          color={!item.read ? palette.primary : palette.mutedLabel}
        />
        {!item.read && (
          <View
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 9,
              height: 9,
              borderRadius: 4.5,
              backgroundColor: palette.blue,
              borderWidth: 1.5,
              borderColor: palette.surface,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: !item.read ? "700" : "600",
              color: palette.text,
              flex: 1,
              marginRight: space.xs,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: palette.mutedLabel,
            }}
          >
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: palette.muted,
            lineHeight: 16,
          }}
          numberOfLines={2}
        >
          {item.message}
        </Text>
      </View>
    </HomeRow>
  );
}

function MemberWaitingItemCard({
  item,
  isFirst = false,
  navigate,
}: {
  item: {
    key: string;
    id: string;
    title: string;
    projectTitle?: string;
    workspaceName?: string;
    status: string;
    reason: string;
    route: AppRoute;
  };
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  const isAwaiting = ["for_review", "submitted"].includes(item.status);
  const fg = isAwaiting ? palette.review : palette.warning;
  const bg = isAwaiting ? palette.reviewSoft : palette.warningSoft;

  return (
    <HomeRow
      isFirst={isFirst}
      accessibilityLabel={`${item.title}, ${item.reason}`}
      onPress={() => navigate(item.route)}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: withOpacity(fg, 0.2),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <ClipboardCheck size={16} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: palette.text,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: withOpacity(fg, 0.24),
            }}
          >
            <Clock size={11.5} color={fg} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: fg,
              }}
              numberOfLines={1}
            >
              {item.reason}
            </Text>
          </View>
          {!!(item.projectTitle || item.workspaceName) && (
            <Text
              style={{
                fontSize: 12,
                color: palette.mutedLabel,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {item.projectTitle || item.workspaceName}
            </Text>
          )}
        </View>
      </View>
      <HomeRowChevron />
    </HomeRow>
  );
}

function classifyAttentionRow(row: { key: string; description: string }) {
  const lowerDescription = row.description.toLowerCase();
  const isReview =
    row.key.startsWith("review:") ||
    row.key.startsWith("finance-review:") ||
    lowerDescription.includes("review");
  if (isReview) {
    return {
      kind: "review" as const,
      categoryLabel: "Review required",
    };
  }
  const isCash =
    row.key.startsWith("cash:") ||
    lowerDescription.includes("voucher") ||
    lowerDescription.includes("cash");
  if (isCash) {
    return {
      kind: "cash" as const,
      categoryLabel: "Cash approval",
    };
  }
  return {
    kind: "action" as const,
    categoryLabel: "Action required",
  };
}

/** One decision as a compact swipeable card on the Head's Home. */
function DecisionCard({
  row,
  isFirst = false,
  navigate,
}: {
  row: { key: string; title: string; description: string; route: AppRoute };
  isFirst?: boolean;
  navigate: Navigate;
}) {
  const palette = useTheme();
  const { kind, categoryLabel } = classifyAttentionRow(row);
  const fg =
    kind === "review"
      ? palette.review
      : kind === "cash"
        ? palette.warning
        : palette.danger;
  const bg =
    kind === "review"
      ? palette.reviewSoft
      : kind === "cash"
        ? palette.warningSoft
        : palette.dangerSoft;
  const Icon =
    kind === "review" ? ClipboardCheck : kind === "cash" ? Banknote : AlertCircle;
  const detail = row.description.replace(/^Action required\s*·\s*/i, "");
  return (
    <HomeRow
      isFirst={isFirst}
      accessibilityLabel={`${categoryLabel}. ${row.title}`}
      accessibilityHint={detail}
      onPress={() => navigate(row.route)}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: withOpacity(fg, 0.2),
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: withOpacity(fg, 0.24),
          }}
        >
          <Icon size={11.5} color={fg} />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: fg,
            }}
          >
            {categoryLabel}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14.5, fontWeight: "700", color: palette.text }}
        >
          {row.title}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 12.5, color: palette.mutedLabel }}>
          {detail}
        </Text>
      </View>
      <HomeRowChevron />
    </HomeRow>
  );
}

function ProjectProgressRow({
  title,
  totals,
  risk,
  loading,
  isFirst = false,
  onPress,
}: {
  title: string;
  totals?: { required: number; completed: number };
  risk?: ReadonlySet<string>;
  loading: boolean;
  isFirst?: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const percent = totals?.required
    ? completionPercent(totals.completed, totals.required)
    : undefined;
  const summary = totals
    ? totals.required
      ? `${totals.completed} of ${totals.required} tasks completed`
      : "No tasks yet"
    : loading
      ? "Loading progress…"
      : "Progress unavailable";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={[
        summary,
        percent == null ? undefined : `${percent}%`,
        ...(risk ?? []),
      ]
        .filter(Boolean)
        .join(" · ")}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        minHeight: 56,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderTopWidth: isFirst ? 0 : 1,
        borderColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : "transparent",
        gap: 12,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontWeight: "700",
            fontSize: 14.5,
            color: palette.text,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text style={{ color: palette.mutedLabel, fontSize: 12.5 }}>
          {summary}
        </Text>
        {!!risk?.size && (
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: palette.warningSoft,
              borderWidth: 1,
              borderColor: withOpacity(palette.warning, 0.24),
              marginTop: 1,
            }}
          >
            <AlertCircle size={11.5} color={palette.warning} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: palette.warning }}>
              {[...risk].join(" · ")}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {percent != null && (
          <CircularProgressRing
            percent={percent}
            size={44}
            strokeWidth={4.5}
            accessibilityLabel={`Project completion: ${percent}%`}
          />
        )}
        <HomeRowChevron />
      </View>
    </Pressable>
  );
}
