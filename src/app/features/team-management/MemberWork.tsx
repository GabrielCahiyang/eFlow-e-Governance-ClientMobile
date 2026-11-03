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
          title: `${item.status.replace(/_/g, " ")} · version ${item.version}`,
          at: item.decidedAt || item.submittedAt,
        })),
    ].sort((a, b) => b.at - a.at);
  return (
    <>
      <Card title="Task participation">
        {!work.length ? (
          <Empty title="No recorded task participation" />
        ) : (
          work.map((task) => (
            <Card key={task.id} title={task.title}>
              <LabelValue
                label="Status"
                value={task.status.replace(/_/g, " ")}
              />
              <LabelValue
                label="Responsibility"
                value={
                  task.assigneeId === employee ? "Task lead" : "Contributor"
                }
              />
              <Button
                variant="outline"
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
      <Card title="Delegated subitems">
        {!nested.length ? (
          <Empty title="No delegated subitems" />
        ) : (
          nested.map((item) => (
            <Card key={item.id} title={item.title}>
              <LabelValue
                label="Status"
                value={item.status.replace(/_/g, " ")}
              />
              <LabelValue label="Progress" value={`${item.percentComplete}%`} />
              <Button
                variant="outline"
                onPress={() =>
                  navigate({
                    name: "task",
                    id: item.taskId,
                    view: "subitems",
                    nodeId: item.id,
                  })
                }
              >
                Open subitem
              </Button>
            </Card>
          ))
        )}
      </Card>
      <Card title="Source activity">
        {!activity.length ? (
          <Empty title="No recorded activity" />
        ) : (
          activity.map((item) => (
            <Card key={item.id} title={item.title}>
              <LabelValue label="Recorded" value={dateLabel(item.at)} />
              <Button
                variant="outline"
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
