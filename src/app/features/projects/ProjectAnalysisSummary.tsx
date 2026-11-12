import { useEffect } from "react";
import {
  Card,
  Button,
  LabelValue,
  Loading,
  ErrorState,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
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
  onOpenWeb,
}: {
  project: Project;
  onOpenWeb: () => void;
}) {
  const { profile } = useAuth();
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
        <Card style={{ gap: 12 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 18, fontWeight: "700" }}
          >
            {analysis.schedule}
          </Text>
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
          <LabelValue label="Awaiting review" value={String(waiting)} />
          <LabelValue
            label="Typical review time"
            value={review === null ? "No review time recorded" : hours(review)}
          />
        </Card>
      )}
      <Button variant="outline" onPress={onOpenWeb}>
        Open full analysis on eFlow Web
      </Button>
    </>
  );
}
