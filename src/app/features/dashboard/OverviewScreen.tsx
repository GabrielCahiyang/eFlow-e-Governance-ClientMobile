import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { Button, ErrorState, Loading, Screen } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { space } from "../../components/ui/theme";
import { completionPercent } from "../../shared/completion";
import { useFacts } from "../../shared/useFacts";
import type { Navigate } from "../../shared/routes";
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
    ...signals.attention.filter((row) => !reviewed.has(row.key)),
    ...(!cash.error && !cash.loading ? (cash.data ?? []) : []),
    ...(!reviews.error && !reviews.loading ? (reviews.data ?? []) : []),
  ]
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.sort - b.sort ||
        a.key.localeCompare(b.key),
    )
    .slice(0, 5);
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
  return (
    <Screen
      compact
      title="Office Overview"
      description={scope?.workspace.name}
      onRefresh={refresh}
    >
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
          <HomeSection title="Needs Your Attention">
            {attention.map((row) => (
              <HomeLink key={row.key} row={row} navigate={navigate} />
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
                  <HomeMessage>
                    No Office work needs your attention right now.
                  </HomeMessage>
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
              <HomeSection title="Office Health">
                <HomeLink
                  row={{
                    title: `${currentProjects.length} current ${currentProjects.length === 1 ? "project" : "projects"}`,
                    description:
                      "Office projects in this workspace, including projects on hold",
                    route: { name: "projects" },
                  }}
                  navigate={navigate}
                />
                {showAnalytics && (
                  <HomeLink
                    row={{
                      title:
                        rows &&
                        !work.data?.issues?.length &&
                        !work.data?.unavailable?.length
                          ? `${signals.overdueOrBlocked} overdue or blocked`
                          : "Overdue or blocked work",
                      description:
                        "Visible open Tasks and Subtasks with a reported blocker or past due date",
                      route: { name: "reports", view: "risks" },
                    }}
                    navigate={navigate}
                  />
                )}
              </HomeSection>
              <HomeSection title="Project Progress">
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
                <HomeLink
                  row={{
                    title: "View all projects",
                    route: { name: "projects" },
                  }}
                  navigate={navigate}
                />
              </HomeSection>
            </>
          )}
          {showAnalytics && (
            <HomeLink
              row={{
                title: "Office Analytics",
                description:
                  "Delivery, workload, reviews and financial reporting",
                route: { name: "reports" },
              }}
              navigate={navigate}
            />
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
  const rows =
    showWork && scope && !feed.error && !feed.stale
      ? feed.data?.rows
      : undefined;
  const data =
    scope && rows ? memberHome(rows, profile?.id || "", scope.id) : undefined;
  const incomplete = !!(
    feed.error ||
    feed.data?.issues?.length ||
    feed.data?.unavailable?.length
  );
  const refresh = async () => {
    await Promise.all([workspace.refresh(), feed.refresh()]);
  };
  return (
    <Screen compact description={scope?.name} onRefresh={refresh}>
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
          <HomeSection title="My Priorities">
            {data?.priorities.map((row) => (
              <HomeLink key={row.key} row={row} navigate={navigate} />
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
          {data && !incomplete && (
            <HomeSection title="My Work Summary">
              <HomeMessage>
                {data.overdue} overdue · {data.today} due today ·{" "}
                {data.awaiting} awaiting review
              </HomeMessage>
              <HomeMessage>
                Due counts cover assignments you can act on.
              </HomeMessage>
            </HomeSection>
          )}
          {!!data?.waiting.length && (
            <HomeSection title="Waiting on Others">
              {data.waiting.map((row) => (
                <HomeLink key={row.key} row={row} navigate={navigate} />
              ))}
            </HomeSection>
          )}
          <HomeLink
            row={{ title: "View My Work", route: { name: "personal_work" } }}
            navigate={navigate}
          />
        </>
      )}
    </Screen>
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
        minHeight: 56,
        gap: space.xs,
        paddingVertical: space.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: palette.border,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
        paddingHorizontal: space.lg,
      })}
    >
      <Text style={{ fontWeight: "600" }}>{title}</Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: space.sm,
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{ color: palette.mutedLabel, fontSize: 13, flexShrink: 1 }}
        >
          {summary}
        </Text>
        {percent != null && (
          <Text style={{ fontWeight: "600" }}>{percent}%</Text>
        )}
      </View>
      {percent != null && (
        <View
          accessible={false}
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: palette.border,
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: 4,
              borderRadius: 2,
              backgroundColor: palette.primary,
            }}
          />
        </View>
      )}
      {!!risk?.size && (
        <Text style={{ fontSize: 13, color: palette.warning }}>
          {[...risk].join(" · ")}
        </Text>
      )}
    </Pressable>
  );
}
