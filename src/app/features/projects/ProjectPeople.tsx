import { StyleSheet, View } from "react-native";
import {
  Empty,
  ErrorState,
  Loading,
  Sheet,
  Status,
  withOpacity,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { AvatarBadge } from "../tasks/TaskBentoComponents";
import { useFacts } from "../../shared/useFacts";
import { useAuth } from "../authentication";
import { fetchProjectOffices } from "../../../core/web/app/features/project-offices/services/projectOfficeService";
import { fetchMembers } from "../../../core/web/app/features/project-members/services/memberService";
import type { Project } from "../../../core/web/app/features/projects/services/types";

export function ProjectPeople({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
  onManage: () => void;
}) {
  const { profile } = useAuth();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const facts = useFacts(
    `project-people:${profile?.id}:${project.id}`,
    async () => {
      const [snapshot, roster] = await Promise.all([
        fetchMembers(project.id),
        fetchProjectOffices(project.id),
      ]);
      const teams = new Set(
        roster.offices
          .filter(
            (office) =>
              office.invitation_status === "joined" &&
              ["lead", "collaborating"].includes(office.relationship_type),
          )
          .map((office) => office.id),
      );
      const editors = new Set(
        roster.members
          .filter((member) => member.can_edit && teams.has(member.project_office_id))
          .map((member) => `${member.project_office_id}:${member.user_id}`),
      );
      return { ...snapshot, editors };
    },
  );
  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";

  return (
    <Sheet open title="Project people" onClose={onClose}>
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : !facts.data ? (
        <Loading label="Loading project people" layout="people" />
      ) : facts.data.members.length ? (
        <View style={styles.list}>
          {facts.data.members.map((member) => {
            const canEdit =
              member.eligible &&
              !member.access_ended_at &&
              facts.data?.editors.has(
                `${member.project_office_id}:${member.user_id}`,
              );
            return (
              <View
                key={member.user_id + ":" + member.office}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: insetSurface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <AvatarBadge name={member.name || "Member"} size={36} />
                <View style={styles.memberBody}>
                  <Text style={[styles.memberName, { color: palette.text }]}>
                    {member.name}
                  </Text>
                  <Text
                    style={[styles.memberSub, { color: palette.mutedLabel }]}
                  >
                    {member.office_name || "Project member"} ·{" "}
                    {member.engagement}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Status value={member.state} variant="pill" />
                    {canEdit && (
                      <View
                        style={[
                          styles.editBadge,
                          {
                            backgroundColor: palette.primarySoft,
                            borderColor: withOpacity(palette.primary, 0.24),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.editBadgeText,
                            { color: palette.primaryDark },
                          ]}
                        >
                          Can edit
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Empty kind="workspace" compact title="No project people to show" />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  memberName: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "700",
  },
  memberSub: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  editBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  editBadgeText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "700",
  },
});
