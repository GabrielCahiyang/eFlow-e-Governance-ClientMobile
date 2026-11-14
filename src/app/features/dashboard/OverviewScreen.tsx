import AlertCircle from "lucide-react-native/icons/circle-alert";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import ArrowUpRight from "lucide-react-native/icons/arrow-up-right";
import Banknote from "lucide-react-native/icons/banknote";
import Bell from "lucide-react-native/icons/bell";
import Calendar from "lucide-react-native/icons/calendar";
import ChartBar from "lucide-react-native/icons/chart-bar";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleCheck from "lucide-react-native/icons/circle-check-big";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Clock from "lucide-react-native/icons/clock";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import {
  Button,
  EditorialMetadataStrip,
  ErrorState,
  Loading,
  Screen,
} from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { radius, space } from "../../components/ui/theme";
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
import { HomeLink, HomeMessage, HomeSection } from "./HomeSections";
import { AccountingHome } from "./AccountingHome";
import { currentOfficeProjects, memberHome, officeHomeWork } from "./homeWork";
import { assignedFinanceReviews, headCashDecisions } from "./homeFinance";
import { fetchInboxUpdatePage } from "../notifications/inboxUpdates";
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
  const rows =
    showWork && scope && !work.stale && !work.error
      ? work.data?.rows
      : undefined;
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
    ...(!cash.error && !cash.loading ? (cash.data ?? []) : []),
    ...(!reviews.error && !reviews.loading ? (reviews.data ?? []) : []),
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
    (showWork && !rows && work.loading) || cash.loading || reviews.loading;
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
    <Screen compact onRefresh={refresh}>
      {workspace.error ? (
        <ErrorState error={workspace.error} retry={() => void refresh()} />
      ) : !scope && workspace.loading ? (
        <Loading label="Loading Office overview" layout="summary" />
      ) : !scope ? (
        <HomeMessage>
          Switch to an Office workspace to see Office work.
        </HomeMessage>
      ) : (
        <>
          <OfficeCommandOverview
            officeName={scope.workspace.name}
            projectCount={currentProjects.length}
            attentionCount={attention.length}
            atRiskCount={signals.overdueOrBlocked}
            onPressRisks={
              showAnalytics
                ? () => navigate({ name: "reports", view: "risks" })
                : undefined
            }
          />

          <HomeSection
            title="Needs Your Decision"
            badge={attention.length ? String(attention.length) : undefined}
          >
            {attention.map((row) => (
              <HeadAttentionCardItem
                key={row.key}
                row={row}
                navigate={navigate}
              />
            ))}
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
                  <View
                    style={{
                      padding: space.md,
                      borderRadius: radius.surface,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.md,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: palette.successSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CircleCheck size={18} color={palette.success} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: palette.mutedLabel,
                      }}
                    >
                      No Office work needs your attention right now.
                    </Text>
                  </View>
                )
              ))}
            {incomplete && (
              <ErrorState
                error="Some Office attention records are unavailable."
                retry={() => void refresh()}
              />
            )}
          </HomeSection>
          {showProjects && (
            <>
              {signals.riskItems && signals.riskItems.length > 0 && (
                <HomeSection
                  title="Office Risks"
                  badge={String(signals.overdueOrBlocked)}
                  onAction={
                    showAnalytics
                      ? () => navigate({ name: "reports", view: "risks" })
                      : undefined
                  }
                  actionAccessibilityLabel="See all office risks in Office Analytics"
                >
                  {signals.riskItems.slice(0, 3).map((item) => (
                    <HeadRiskCardItem
                      key={item.key}
                      item={item}
                      navigate={navigate}
                    />
                  ))}
                </HomeSection>
              )}
              <HomeSection
                title="Current Projects"
                badge={projects.length ? String(projects.length) : undefined}
                onAction={() => navigate({ name: "projects" })}
                actionAccessibilityLabel="See all projects"
              >
                {!projects.length && (
                  <HomeMessage>No current Office projects.</HomeMessage>
                )}
                {projects.map((project) => (
                  <ProjectProgressRow
                    key={project.id}
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
                    onPress={() => void progress.refresh()}
                  >
                    Retry project progress
                  </Button>
                )}
              </HomeSection>
            </>
          )}
          {showAnalytics && (
            <Button
              variant="outline"
              accessibilityLabel="Office Analytics"
              onPress={() => navigate({ name: "reports" })}
            >
              Office Analytics
            </Button>
          )}
        </>
      )}
    </Screen>
  );
}

function MemberHome({ navigate }: { navigate: Navigate }) {
  const { profile, can } = useAuth();
  const workspace = useWorkspace();
  const feed = useMobileWorkFeed();
  const scope = workspace.error ? undefined : workspace.selected?.workspace;
  const showWork = can("navigation.tasks");
  const actor = profile?.id || "";
  const rows =
    showWork && scope && !feed.error && !feed.stale
      ? feed.data?.rows
      : undefined;
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
    <Screen compact onRefresh={refresh}>
      {workspace.error ? (
        <ErrorState error={workspace.error} retry={() => void refresh()} />
      ) : !scope ? (
        workspace.loading ? (
          <Loading label="Loading your workspace" layout="summary" />
        ) : (
          <HomeMessage>Choose a workspace to see your assignments.</HomeMessage>
        )
      ) : !showWork ? (
        <HomeMessage>
          Work assignments are unavailable to this account.
        </HomeMessage>
      ) : (
        <>
          {/* Personal Work Overview */}
          {data && !incomplete && (
            <MemberWorkOverview
              name={profile?.full_name?.split(" ")[0] || "Member"}
              workspaceName={scope.name}
              overdue={data.overdue}
              today={data.today}
              awaiting={data.awaiting}
              navigate={navigate}
            />
          )}

          {/* Section B — Needs Your Action */}
          <HomeSection
            title="Needs Your Action"
            badge={
              data?.priorities.length
                ? String(data.priorities.length)
                : undefined
            }
            onAction={() => navigate({ name: "personal_work" })}
            actionAccessibilityLabel="See all assigned work"
          >
            {data?.priorities.map((item) => (
              <MemberActionCardItem
                key={item.key}
                item={item}
                navigate={navigate}
              />
            ))}
            {!data && feed.loading && (
              <Loading
                label="Loading your priorities"
                layout="summary"
                rows={2}
              />
            )}
            {data && !data.priorities.length && !incomplete && (
              <HomeMessage>
                No assignments need your action right now.
              </HomeMessage>
            )}
            {incomplete || (!data && !feed.loading) ? (
              <ErrorState
                error="Some assignments could not be verified."
                retry={() => void refresh()}
              />
            ) : null}
          </HomeSection>

          {/* Section C — Coming Up */}
          {data && !incomplete && (
            <HomeSection
              title="Coming Up"
              badge={
                data.comingUp.length
                  ? String(data.comingUp.length)
                  : undefined
              }
              onAction={() =>
                navigate({ name: "personal_work", view: "deadlines" })
              }
              actionAccessibilityLabel="See all upcoming schedule"
            >
              {data.comingUp.map((item) => (
                <MemberComingUpItem
                  key={item.key}
                  item={item}
                  navigate={navigate}
                />
              ))}
              {!data.comingUp.length && (
                <HomeMessage>
                  No upcoming deadlines in the next 7 days.
                </HomeMessage>
              )}
            </HomeSection>
          )}

          {/* Section D — Latest Updates */}
          <HomeSection
            title="Latest Updates"
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
            {recentUpdates.map((item) => (
              <MemberUpdateItem
                key={item.id}
                item={item}
                navigate={navigate}
              />
            ))}
            {updates.error ? (
              <HomeMessage>
                Recent updates are currently unavailable.
              </HomeMessage>
            ) : (
              !updates.loading &&
              !recentUpdates.length && (
                <HomeMessage>No recent updates.</HomeMessage>
              )
            )}
          </HomeSection>

          {/* Section E — Waiting on Others (hidden when empty) */}
          {!!data?.waiting.length && (
            <HomeSection
              title="Waiting on Others"
              badge={String(data.waiting.length)}
              onAction={() =>
                navigate({ name: "personal_work", view: "awaiting" })
              }
              actionAccessibilityLabel="See all waiting work"
            >
              {data.waiting.map((item) => (
                <MemberWaitingItemCard
                  key={item.key}
                  item={item}
                  navigate={navigate}
                />
              ))}
            </HomeSection>
          )}
        </>
      )}
    </Screen>
  );
}

function MemberSummaryTiles({
  overdue,
  today,
  awaiting,
  navigate,
}: {
  overdue: number;
  today: number;
  awaiting: number;
  navigate: Navigate;
}) {
  const palette = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: space.sm,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${overdue} Overdue, Action required`}
        accessibilityHint="Navigates to overdue work in My Work"
        onPress={() => navigate({ name: "personal_work", view: "overdue" })}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: radius.surface,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: overdue > 0 ? palette.danger : palette.border,
          padding: space.sm,
          gap: 2,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: overdue > 0 ? palette.danger : palette.mutedLabel,
            }}
            numberOfLines={1}
          >
            Overdue
          </Text>
          <AlertCircle
            size={14}
            color={overdue > 0 ? palette.danger : palette.mutedLabel}
          />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: overdue > 0 ? palette.danger : palette.text,
          }}
        >
          {overdue}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: palette.mutedLabel,
          }}
          numberOfLines={1}
        >
          Action required
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${today} Due Today, Due by end of day`}
        accessibilityHint="Navigates to today's work in My Work"
        onPress={() => navigate({ name: "personal_work", view: "today" })}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: radius.surface,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: today > 0 ? palette.warning : palette.border,
          padding: space.sm,
          gap: 2,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: today > 0 ? palette.warning : palette.mutedLabel,
            }}
            numberOfLines={1}
          >
            Due Today
          </Text>
          <Clock
            size={14}
            color={today > 0 ? palette.warning : palette.mutedLabel}
          />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: today > 0 ? palette.warning : palette.text,
          }}
        >
          {today}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: palette.mutedLabel,
          }}
          numberOfLines={1}
        >
          Due today
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${awaiting} Awaiting Review, Under review`}
        accessibilityHint="Navigates to awaiting review work in My Work"
        onPress={() => navigate({ name: "personal_work", view: "awaiting" })}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: radius.surface,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: awaiting > 0 ? palette.review : palette.border,
          padding: space.sm,
          gap: 2,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: awaiting > 0 ? palette.review : palette.mutedLabel,
            }}
            numberOfLines={1}
          >
            Awaiting
          </Text>
          <ClipboardCheck
            size={14}
            color={awaiting > 0 ? palette.review : palette.mutedLabel}
          />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: awaiting > 0 ? palette.review : palette.text,
          }}
        >
          {awaiting}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: palette.mutedLabel,
          }}
          numberOfLines={1}
        >
          Under review
        </Text>
      </Pressable>
    </View>
  );
}

function MemberActionCardItem({
  item,
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
    actionable: boolean;
    actionLabel: string;
    blocker?: string | null;
    route: AppRoute;
  };
  navigate: Navigate;
}) {
  const palette = useTheme();

  const isChangesRequested = item.status === "changes_requested";
  const statusColor = isChangesRequested
    ? palette.danger
    : item.isOverdue
      ? palette.danger
      : item.isToday
        ? palette.warning
        : item.blocker
          ? palette.warning
          : item.status === "in_progress"
            ? palette.primary
            : palette.mutedLabel;

  const statusBg = isChangesRequested
    ? palette.dangerSoft
    : item.isOverdue
      ? palette.dangerSoft
      : item.isToday
        ? palette.warningSoft
        : item.blocker
          ? palette.warningSoft
          : item.status === "in_progress"
            ? palette.primarySoft
            : palette.surface;

  const statusText = isChangesRequested
    ? "Changes requested"
    : item.isOverdue
      ? "Overdue"
      : item.isToday
        ? "Due today"
        : item.blocker
          ? "Blocker reported"
          : item.status === "in_progress"
            ? "In progress"
            : "To do";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${statusText}, ${item.relation}`}
      accessibilityHint={item.actionLabel}
      onPress={() => navigate(item.route)}
      style={({ pressed }) => ({
        borderRadius: radius.surface,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        padding: space.md,
        gap: space.sm,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <EditorialMetadataStrip
        variant="flush"
        items={[
          {
            label: "Status",
            value: statusText,
            accent: statusColor,
          },
          {
            label: "Role",
            value: item.relation || (item.isLead ? "Lead" : "Contributor"),
            accent: item.isLead ? (palette.primaryDark ?? palette.primary) : palette.text,
          },
        ]}
      />

      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: palette.text,
            lineHeight: 20,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: palette.mutedLabel,
          }}
          numberOfLines={1}
        >
          {[
            item.projectTitle || item.workspaceName,
            item.dueLabel ? `Due ${item.dueLabel}` : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {item.blocker ? (
          <Text
            style={{
              fontSize: 12,
              color: palette.warning,
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            Blocker: {item.blocker}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: space.xs,
          borderTopWidth: 1,
          borderTopColor: palette.border,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: item.actionable ? palette.primary : palette.text,
          }}
        >
          {item.actionLabel}
        </Text>
        <ArrowRight
          size={16}
          color={item.actionable ? palette.primary : palette.mutedLabel}
        />
      </View>
    </Pressable>
  );
}

function MemberComingUpItem({
  item,
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, Due ${daysText}`}
      onPress={() => navigate(item.route)}
      style={({ pressed }) => ({
        borderRadius: radius.surface,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        padding: space.md,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: palette.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Calendar size={18} color={palette.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
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
          paddingHorizontal: space.sm,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: palette.primarySoft,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: palette.primary,
          }}
        >
          {daysText}
        </Text>
      </View>
      <ChevronRight size={18} color={palette.mutedLabel} />
    </Pressable>
  );
}

function MemberUpdateItem({
  item,
  navigate,
}: {
  item: Notification;
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.message}`}
      onPress={() => navigate(route)}
      style={({ pressed }) => ({
        borderRadius: radius.surface,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        padding: space.md,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: !item.read
            ? palette.primarySoft
            : palette.surface,
          borderWidth: !item.read ? 0 : 1,
          borderColor: palette.border,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <Bell
          size={18}
          color={!item.read ? palette.primary : palette.mutedLabel}
        />
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
      {!item.read && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: palette.primary,
            alignSelf: "center",
          }}
        />
      )}
    </Pressable>
  );
}

function MemberWaitingItemCard({
  item,
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
  navigate: Navigate;
}) {
  const palette = useTheme();
  const isAwaiting = ["for_review", "submitted"].includes(item.status);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.reason}`}
      onPress={() => navigate(item.route)}
      style={({ pressed }) => ({
        borderRadius: radius.surface,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        padding: space.md,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isAwaiting ? palette.reviewSoft : palette.warningSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ClipboardCheck
          size={18}
          color={isAwaiting ? palette.review : palette.warning}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
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
          {item.projectTitle || item.workspaceName}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: isAwaiting ? palette.review : palette.warning,
          }}
          numberOfLines={1}
        >
          {item.reason}
        </Text>
      </View>
      <ChevronRight size={18} color={palette.mutedLabel} />
    </Pressable>
  );
}

function OfficeCommandOverview({
  officeName,
  projectCount,
  attentionCount,
  atRiskCount,
  onPressRisks,
}: {
  officeName: string;
  projectCount: number;
  attentionCount: number;
  atRiskCount: number;
  onPressRisks?: () => void;
}) {
  const palette = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        padding: space.md,
        gap: space.sm,
        marginBottom: space.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: attentionCount > 0 ? palette.warning : palette.primary,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: palette.primary,
            }}
          >
            Office Command Overview
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: palette.mutedLabel,
            fontWeight: "500",
          }}
        >
          {officeName} · {projectCount} {projectCount === 1 ? "project" : "projects"}
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: palette.text,
            letterSpacing: -0.2,
          }}
        >
          {attentionCount > 0
            ? `${attentionCount} ${attentionCount === 1 ? "decision awaiting" : "decisions awaiting"} your action`
            : "All decisions up to date"}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: atRiskCount > 0 ? palette.danger : palette.mutedLabel,
            fontWeight: atRiskCount > 0 ? "600" : "400",
          }}
        >
          {atRiskCount > 0
            ? `${atRiskCount} work ${atRiskCount === 1 ? "item" : "items"} at risk`
            : "All office work on schedule"}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          paddingTop: space.xs,
          borderTopWidth: 1,
          borderTopColor: palette.border,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 6,
            paddingHorizontal: space.sm,
            borderRadius: radius.surface,
            backgroundColor:
              attentionCount > 0
                ? palette.primarySoft
                : palette.background,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: attentionCount > 0 ? palette.primary : palette.mutedLabel,
            }}
          >
            Decisions
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: attentionCount > 0 ? palette.primary : palette.text,
            }}
          >
            {attentionCount}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${atRiskCount} work items at risk`}
          onPress={onPressRisks}
          disabled={!onPressRisks}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 6,
            paddingHorizontal: space.sm,
            borderRadius: radius.surface,
            backgroundColor: pressed
              ? palette.dangerSoft
              : atRiskCount > 0
                ? palette.dangerSoft
                : palette.background,
          })}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: atRiskCount > 0 ? palette.danger : palette.mutedLabel,
            }}
          >
            At Risk
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: atRiskCount > 0 ? palette.danger : palette.text,
            }}
          >
            {atRiskCount}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function HeadRiskCardItem({
  item,
  navigate,
}: {
  item: {
    key: string;
    id: string;
    title: string;
    projectTitle: string;
    status: string;
    reason: string;
    route: AppRoute;
  };
  navigate: Navigate;
}) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.reason}`}
      onPress={() => navigate(item.route)}
      style={({ pressed }) => ({
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
        marginBottom: space.xs,
        gap: space.xs,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AlertCircle size={14} color={palette.danger} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: palette.danger,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {item.reason}
          </Text>
        </View>
        <ChevronRight size={18} color={palette.mutedLabel} />
      </View>
      <Text
        style={{
          fontWeight: "700",
          fontSize: 15,
          color: palette.text,
        }}
        numberOfLines={2}
      >
        {item.title}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: palette.mutedLabel,
        }}
        numberOfLines={1}
      >
        {item.projectTitle}
      </Text>
    </Pressable>
  );
}

function MemberWorkOverview({
  name,
  workspaceName,
  overdue,
  today,
  awaiting,
  navigate,
}: {
  name: string;
  workspaceName: string;
  overdue: number;
  today: number;
  awaiting: number;
  navigate: Navigate;
}) {
  const palette = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        padding: space.md,
        gap: space.sm,
        marginBottom: space.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: overdue > 0 ? palette.danger : palette.primary,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: palette.primary,
            }}
          >
            Personal Work Overview
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: palette.mutedLabel,
            fontWeight: "500",
          }}
        >
          {workspaceName}
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: palette.text,
            letterSpacing: -0.2,
          }}
        >
          Good day, {name}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: palette.mutedLabel,
          }}
        >
          {overdue > 0 || today > 0 || awaiting > 0
            ? `${overdue} overdue · ${today} due today · ${awaiting} awaiting review`
            : "All assigned work is up to date"}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: space.xs,
          paddingTop: space.xs,
          borderTopWidth: 1,
          borderTopColor: palette.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${overdue} Overdue, Action required`}
          onPress={() => navigate({ name: "personal_work", view: "overdue" })}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: radius.surface,
            backgroundColor: pressed ? palette.primarySoft : palette.background,
            borderWidth: 1,
            borderColor: overdue > 0 ? palette.danger : palette.border,
            padding: space.sm,
            gap: 2,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: overdue > 0 ? palette.danger : palette.mutedLabel,
                textTransform: "uppercase",
              }}
            >
              Overdue
            </Text>
            <AlertCircle
              size={12}
              color={overdue > 0 ? palette.danger : palette.mutedLabel}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: overdue > 0 ? palette.danger : palette.text,
            }}
          >
            {overdue}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${today} Due Today, Due by end of day`}
          onPress={() => navigate({ name: "personal_work", view: "today" })}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: radius.surface,
            backgroundColor: pressed ? palette.primarySoft : palette.background,
            borderWidth: 1,
            borderColor: today > 0 ? palette.warning : palette.border,
            padding: space.sm,
            gap: 2,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: today > 0 ? palette.warning : palette.mutedLabel,
                textTransform: "uppercase",
              }}
            >
              Due Today
            </Text>
            <Clock
              size={12}
              color={today > 0 ? palette.warning : palette.mutedLabel}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: today > 0 ? palette.warning : palette.text,
            }}
          >
            {today}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${awaiting} Awaiting, Submitted work`}
          onPress={() => navigate({ name: "personal_work", view: "awaiting" })}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: radius.surface,
            backgroundColor: pressed ? palette.primarySoft : palette.background,
            borderWidth: 1,
            borderColor: awaiting > 0 ? palette.review : palette.border,
            padding: space.sm,
            gap: 2,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: awaiting > 0 ? palette.review : palette.mutedLabel,
                textTransform: "uppercase",
              }}
            >
              Awaiting
            </Text>
            <ClipboardCheck
              size={12}
              color={awaiting > 0 ? palette.review : palette.mutedLabel}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: awaiting > 0 ? palette.review : palette.text,
            }}
          >
            {awaiting}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function HeadAttentionCardItem({
  row,
  navigate,
}: {
  row: {
    key: string;
    title: string;
    description: string;
    route: AppRoute;
  };
  navigate: Navigate;
}) {
  const palette = useTheme();
  const isReview =
    row.key.startsWith("review:") ||
    row.key.startsWith("finance-review:") ||
    row.description.toLowerCase().includes("review");
  const isCash =
    row.key.startsWith("cash:") ||
    row.description.toLowerCase().includes("voucher") ||
    row.description.toLowerCase().includes("cash");
  const isAlert =
    row.description.toLowerCase().includes("overdue") ||
    row.description.toLowerCase().includes("blocked");

  const categoryLabel = isReview
    ? "Review required"
    : isCash
      ? "Cash approval"
      : isAlert
        ? "Action required"
        : "Action required";

  const iconColor = isReview
    ? palette.review
    : isCash
      ? palette.warning
      : isAlert
        ? palette.danger
        : palette.primary;

  const iconBg = isReview
    ? palette.reviewSoft
    : isCash
      ? palette.warningSoft
      : isAlert
        ? palette.dangerSoft
        : palette.primarySoft;

  const IconComponent = isReview
    ? ClipboardCheck
    : isCash
      ? Banknote
      : isAlert
        ? AlertCircle
        : ArrowRight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title}
      accessibilityHint={row.description}
      onPress={() => navigate(row.route)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
        marginBottom: space.xs,
        gap: space.md,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: iconColor,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {categoryLabel}
        </Text>
        <Text
          style={{
            fontWeight: "700",
            fontSize: 15,
            color: palette.text,
          }}
          numberOfLines={2}
        >
          {row.title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: palette.mutedLabel,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {row.description}
        </Text>
      </View>
      <ChevronRight size={18} color={palette.mutedLabel} />
    </Pressable>
  );
}

function AnalyticsCard({ navigate }: { navigate: Navigate }) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Office Analytics"
      accessibilityHint="Delivery, workload, reviews and financial reporting"
      onPress={() => navigate({ name: "reports" })}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
        gap: space.md,
        minHeight: 64,
        marginTop: space.xs,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: palette.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChartBar size={20} color={palette.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontWeight: "700",
            fontSize: 15,
            color: palette.text,
          }}
        >
          Office Analytics
        </Text>
        <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
          Delivery, workload, reviews and financial reporting
        </Text>
      </View>
      <ArrowRight size={18} color={palette.mutedLabel} />
    </Pressable>
  );
}

function ProjectProgressRow({
  title,
  totals,
  risk,
  loading,
  onPress,
}: {
  title: string;
  totals?: { required: number; completed: number };
  risk?: ReadonlySet<string>;
  loading: boolean;
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
        minHeight: 76,
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
        marginBottom: space.sm,
        gap: space.sm,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.sm,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 15,
            color: palette.text,
            flex: 1,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        {percent != null ? (
          <View
            style={{
              paddingHorizontal: space.sm,
              paddingVertical: 2,
              borderRadius: radius.pill,
              backgroundColor: palette.primarySoft,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                fontSize: 13,
                color: palette.primaryDark ?? palette.primary,
              }}
            >
              {percent}%
            </Text>
          </View>
        ) : (
          <ChevronRight size={18} color={palette.mutedLabel} />
        )}
      </View>

      {percent != null && (
        <View
          accessible={false}
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: palette.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.min(100, Math.max(0, percent))}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: palette.primary,
            }}
          />
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.sm,
        }}
      >
        <Text
          style={{ color: palette.mutedLabel, fontSize: 13, flexShrink: 1 }}
        >
          {summary}
        </Text>
        {percent != null && (
          <ChevronRight size={16} color={palette.mutedLabel} />
        )}
      </View>

      {!!risk?.size && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 2,
            paddingTop: 6,
            borderTopWidth: 0.5,
            borderTopColor: palette.border,
          }}
        >
          <AlertCircle size={14} color={palette.warning} />
          <Text style={{ fontSize: 13, color: palette.warning, flex: 1 }}>
            {[...risk].join(" · ")}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function HealthIndicator({
  value,
  label,
  accent,
  onPress,
}: {
  value: string;
  label: string;
  accent?: "danger" | "primary" | "warning";
  onPress?: () => void;
}) {
  const palette = useTheme();
  const valueColor =
    accent === "danger"
      ? palette.danger
      : accent === "warning"
        ? palette.warning
        : palette.text;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={value + " " + label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: 140,
        minHeight: 76,
        padding: space.md,
        borderRadius: radius.surface,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor:
          pressed && onPress ? palette.primarySoft : palette.surface,
        justifyContent: "space-between",
        gap: space.xs,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: palette.mutedLabel,
          }}
        >
          {label}
        </Text>
        {onPress ? <ArrowUpRight size={16} color={palette.mutedLabel} /> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text style={{ fontWeight: "800", fontSize: 24, color: valueColor }}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}
