import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import CalendarCheck from "lucide-react-native/icons/calendar-check";
import ChartColumn from "lucide-react-native/icons/chart-column";
import Clock from "lucide-react-native/icons/clock";
import Timer from "lucide-react-native/icons/timer";
import {
  Card,
  DetailGroup,
  ErrorState,
  LabelValue,
  Loading,
  MetricPair,
  withOpacity,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { analyzeProject } from "../../../core/web/app/features/analytics/selectors/projectAnalysis";
import { median } from "../../../core/web/app/features/analytics/selectors/deliveryAnalytics";
import { workDateLabel } from "../../../core/web/app/shared/workCalendar";
import { fetchTeamWorkflowFacts } from "../../../core/web/app/features/team-management/services/teamWorkflowFactsService";
import type { Project } from "../../../core/web/app/features/projects/services/types";
import { fetchProjectAnalysisTasks } from "./services";
import { netProjectUpdates } from "./subscriptions";

const hours = (value: number) =>
  value < 1 ? `${Math.round(value * 60)} min` : `${value.toFixed(1)} hr`;

export function ProjectAnalysisSummary({
  project,
}: {
  project: Project;
  onOpenWeb?: () => void;
}) {
  const { profile } = useAuth();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const history = useFacts(
    `project-analysis:${profile?.id}:${project.id}`,
    async () => {
      const tasks = await fetchProjectAnalysisTasks(project.id);
      const facts = await fetchTeamWorkflowFacts(tasks.map((task) => task.id));
      return { tasks, facts };
    },
    !!profile?.id,
  );
  useEffect(
    () => netProjectUpdates(project.id, () => void history.refresh()),
    [project.id, history.refresh],
  );

  const analysis =
    !history.error && history.data
      ? analyzeProject(project, {
          ...history.data,
          projects: [project],
          people: [],
        })
      : undefined;
  const comparable = analysis?.rows.filter((row) => row.late !== null) ?? [];
  const late = comparable.filter((row) => row.late).length;
  const review = median(
    analysis?.rows.flatMap((row) =>
      row.reviewHours === null ? [] : [row.reviewHours],
    ) ?? [],
  );
  const waiting =
    analysis?.rows.filter((row) => row.task.status === "for_review").length ??
    0;
  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";

  return (
    <>
      {history.error ? (
        <ErrorState
          error={history.error}
          retry={() => void history.refresh()}
        />
      ) : !analysis ? (
        <Loading label="Loading project analysis" layout="summary" />
      ) : (
        <Card
          title="Delivery analysis"
          icon={<ChartColumn size={16} color={palette.primary} />}
          badge={analysis.closed ? "Closed" : "Open"}
          badgeTone={analysis.closed ? "neutral" : "success"}
          style={{ gap: 14 }}
        >
          <View
            style={[
              styles.scheduleBanner,
              {
                backgroundColor: insetSurface,
                borderColor: palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.scheduleIcon,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <CalendarCheck size={16} color={palette.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text
                style={[styles.scheduleCaption, { color: palette.mutedLabel }]}
              >
                Schedule status
              </Text>
              <Text
                accessibilityRole="header"
                style={[styles.scheduleHeadline, { color: palette.text }]}
              >
                {analysis.schedule}
              </Text>
            </View>
          </View>

          <MetricPair
            items={[
              {
                key: "waiting",
                label: "Awaiting review",
                value: String(waiting),
                tone: waiting > 0 ? "warning" : "neutral",
                icon: (
                  <Clock
                    size={16}
                    color={waiting > 0 ? palette.warning : palette.primary}
                  />
                ),
              },
              {
                key: "review",
                label: "Typical review time",
                value:
                  review === null ? "No review time recorded" : hours(review),
                tone: "info",
                icon: <Timer size={16} color={palette.blue} />,
              },
            ]}
          />

          <DetailGroup>
            <LabelValue
              label="Target date"
              value={
                project.targetDate
                  ? workDateLabel(project.targetDate, "Asia/Manila")
                  : "No target date recorded"
              }
            />
            <LabelValue
              label="Actual completion"
              value={
                project.completedAt
                  ? workDateLabel(project.completedAt, "Asia/Manila")
                  : analysis.closed
                    ? "No completion date recorded"
                    : "Project open"
              }
            />
            <LabelValue
              label="Late submissions"
              value={
                comparable.length
                  ? `${late} of ${comparable.length} with comparable dates`
                  : "No comparable dates"
              }
            />
          </DetailGroup>
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scheduleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  scheduleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scheduleCaption: {
    fontSize: 11.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scheduleHeadline: {
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: "700",
  },
});
