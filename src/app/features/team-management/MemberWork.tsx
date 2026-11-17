import { statusLabel } from "../../shared/statusLabels";
import ExternalLink from "lucide-react-native/icons/external-link";
import { useTheme } from "../../components/ui/Appearance";
import { useWorkStatus } from "../../shared/workStatusPresentation";
import {
  Button,
  Card,
  Empty,
  LabelValue,
  dateLabel,
} from "../../components/ui";
import type { Navigate } from "../../shared/routes";
import type { Task } from "../../../core/web/app/features/tasks";
import type { TeamWorkflowFacts } from "../../../core/web/app/features/team-management/types";
import { taskParticipantIds } from "../../../core/web/app/features/team-management/selectors/analyticsHelpers";
export function MemberWork({
  employee,
  tasks,
  facts,
  navigate,
}: {
  employee: string;
  tasks: Task[];
  facts: TeamWorkflowFacts;
  navigate: Navigate;
}) {
  const resolveStatus = useWorkStatus();
  const palette = useTheme();
  const work = tasks.filter((task) =>
      taskParticipantIds(task).includes(employee),
    ),
    nested = facts.subtasks.filter((item) =>
      item.assignedToIds.includes(employee),
    ),
    activity = [
      ...facts.progress
        .filter((item) => item.authorId === employee)
        .map((item) => ({
          id: "p" + item.id,
          taskId: item.taskId,
          title: item.note || item.nextStep || "Progress recorded",
          at: item.createdAt,
        })),
      ...facts.submissions
        .filter(
          (item) =>
            item.submitterId === employee || item.decisionAuthorId === employee,
        )
        .map((item) => ({
          id: "s" + item.id,
          taskId: item.taskId,
          title: `${statusLabel(item.status)} · version ${item.version}`,
          at: item.decidedAt || item.submittedAt,
        })),
    ].sort((a, b) => b.at - a.at);
  return (
    <>
      <Card title="Task participation">
        {!work.length ? (
          <Empty compact kind="tasks" title="No recorded task participation" />
        ) : (
          work.map((task) => (
            <Card key={task.id} title={task.title}>
              <LabelValue label="Status" value={resolveStatus(task.status, task.customStatusId).label} />
              <LabelValue
                label="Responsibility"
                value={
                  task.assigneeId === employee ? "Task lead" : "Contributor"
                }
              />
              <Button
                variant="outline"
                icon={<ExternalLink size={16} color={palette.primary} />}
                onPress={() =>
                  navigate({
                    name: "task",
                    id: task.id,
                    projectId: task.projectId,
                  })
                }
              >
                Open task and staffing
              </Button>
            </Card>
          ))
        )}
      </Card>
      <Card title="Delegated subtasks">
        {!nested.length ? (
          <Empty compact kind="projects" title="No delegated subtasks" />
        ) : (
          nested.map((item) => (
            <Card key={item.id} title={item.title}>
              <LabelValue label="Status" value={resolveStatus(item.status).label} />
              <LabelValue label="Progress" value={`${item.percentComplete}%`} />
              <Button
                variant="outline"
                icon={<ExternalLink size={16} color={palette.primary} />}
                onPress={() =>
                  navigate({
                    name: "task",
                    id: item.taskId,
                    view: "subitems",
                    nodeId: item.id,
                  })
                }
              >
                Open subtask
              </Button>
            </Card>
          ))
        )}
      </Card>
      <Card title="Source activity">
        {!activity.length ? (
          <Empty compact kind="files" title="No recorded activity" />
        ) : (
          activity.map((item) => (
            <Card key={item.id} title={item.title}>
              <LabelValue label="Recorded" value={dateLabel(item.at)} />
              <Button
                variant="outline"
                icon={<ExternalLink size={16} color={palette.primary} />}
                onPress={() =>
                  navigate({ name: "task", id: item.taskId, view: "activity" })
                }
              >
                Inspect source task
              </Button>
            </Card>
          ))
        )}
      </Card>
    </>
  );
}
