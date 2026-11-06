import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Row,
  Sheet,
  Status,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { fetchMembers } from "../../../core/web/app/features/project-members/services/memberService";
import type { Project } from "../../../core/web/app/features/projects/services/types";

export function ProjectPeople({
  project,
  onClose,
  onManage,
}: {
  project: Project;
  onClose: () => void;
  onManage: () => void;
}) {
  const { profile } = useAuth();
  const facts = useFacts(`project-people:${profile?.id}:${project.id}`, () =>
    fetchMembers(project.id),
  );
  return (
    <Sheet open title="Project people" onClose={onClose}>
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !facts.data ? (
        <Loading label="Loading project people" layout="people" />
      ) : facts.data.members.length ? (
        facts.data.members.map((member) => (
          <Row key={member.user_id + ":" + member.office}>
            <Text style={{ flex: 1 }}>
              {member.name} · {member.office_name || "Project member"} ·{" "}
              {member.engagement}
            </Text>
            <Status value={member.state} />
          </Row>
        ))
      ) : (
        <Empty kind="workspace" compact title="No project people to show" />
      )}
      {profile?.role === "head" && (
        <Button variant="outline" onPress={onManage}>
          Manage people on eFlow Web
        </Button>
      )}
    </Sheet>
  );
}
