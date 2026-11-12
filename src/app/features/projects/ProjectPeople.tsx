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
import { fetchProjectOffices } from "../../../core/web/app/features/project-offices/services/projectOfficeService";
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
  const facts = useFacts(`project-people:${profile?.id}:${project.id}`, async () => {
    const [snapshot, roster] = await Promise.all([
      fetchMembers(project.id),
      fetchProjectOffices(project.id),
    ]);
    const teams = new Set(roster.offices.filter(office =>
      office.invitation_status === "joined" &&
      ["lead", "collaborating"].includes(office.relationship_type)).map(office => office.id));
    const editors = new Set(roster.members.filter(member =>
      member.can_edit && teams.has(member.project_office_id)).map(member =>
      `${member.project_office_id}:${member.user_id}`));
    return { ...snapshot, editors };
  });
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
            {member.eligible && !member.access_ended_at && facts.data?.editors.has(
              `${member.project_office_id}:${member.user_id}`,
            ) && <Text>Can edit</Text>}
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
