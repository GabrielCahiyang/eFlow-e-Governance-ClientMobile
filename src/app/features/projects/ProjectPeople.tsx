import { Text } from "../../components/ui/Typography";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  Sheet,
  Status,
  colors,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import {
  fetchAllProfiles,
  fetchAllOrgs,
} from "../../../core/web/lib/supabaseService";
import {
  fetchProjectOffices,
  selectProjectOfficeMembersChecked,
} from "../../../core/web/app/features/project-offices/services/projectOfficeService";
import { readStaffingAuthority } from "../../../core/web/app/features/project-offices/services/staffingAuthority";
import {
  previewSelection,
  saveSelection,
} from "../../../core/web/app/features/project-access/services/accessService";
import { canStaffProjectOffice } from "../../../core/web/app/features/project-offices/selectors";
import { fetchMembers } from "../../../core/web/app/features/project-members/services/memberService";
import type { Project } from "../../../core/web/app/features/projects/services/types";
export function ProjectPeople({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { profile } = useAuth(),
    action = useAction();
  const facts = useFacts(
    "project-people:" + project.id + ":" + profile?.id,
    async () => {
      const [participation, people, organizations, members] = await Promise.all(
        [
          fetchProjectOffices(project.id),
          fetchAllProfiles(),
          fetchAllOrgs(),
          fetchMembers(project.id),
        ],
      );
      return { participation, people, organizations, members };
    },
  );
  const [selected, setSelected] = useState<string[]>([]);
  const dirty = useRef(false);
  const request = useRef<
    | { id: string; users: string[]; expected: string[]; fingerprint?: string }
    | undefined
  >(undefined);
  const data = facts.data,
    office = data?.participation.offices.find(
      (o) => o.office_id === profile?.org_id,
    );
  const allowed =
    !!data &&
    !facts.error &&
    !["completed", "archived"].includes(project.status) &&
    !project.sourceCollaborationDraftId &&
    canStaffProjectOffice(office, profile, data.organizations);
  const baseline =
    data?.participation.members
      .filter((m) => m.project_office_id === office?.id)
      .map((m) => m.user_id) || [];
  useEffect(() => {
    if (!dirty.current && !action.busy) setSelected(baseline);
  }, [baseline.slice().sort().join(","), action.busy]);
  const save = () =>
    action.run(async () => {
      if (!allowed || !office || !profile)
        throw new Error("Current appointed Office Head access is required.");
      if (
        !request.current ||
        request.current.users.slice().sort().join(",") !==
          selected.slice().sort().join(",")
      ) {
        const expected = await readStaffingAuthority(
            project.id,
            office.id,
            profile.id,
          ),
          impact = await previewSelection(office.id, selected);
        if (
          impact?.removed.length &&
          !(await confirmAction(
            "Review member removal",
            `${impact.removed.length} selected people will lose access through this Office. Existing work responsibilities are checked before removal.`,
            "Save project team",
          ))
        )
          return;
        request.current = {
          id: crypto.randomUUID(),
          users: [...selected],
          expected,
          fingerprint: impact?.fingerprint,
        };
      }
      const current = request.current;
      await readStaffingAuthority(project.id, office.id, profile.id);
      if (current.fingerprint)
        await saveSelection(
          office.id,
          current.users,
          current.fingerprint,
          current.id,
        );
      else
        await selectProjectOfficeMembersChecked(
          office.id,
          current.users,
          current.expected,
          current.id,
        );
      request.current = undefined;
      dirty.current = false;
      await facts.refresh();
      await onSaved();
    }, "Project team saved.");
  return (
    <Sheet
      open
      title="Add people"
      description={project.title}
      onClose={() =>
        void (async () => {
          if (
            !dirty.current ||
            (await confirmAction(
              "Discard team changes?",
              "Your unsaved selection will be discarded.",
              "Discard",
              true,
            ))
          )
            onClose();
        })()
      }
      busy={action.busy}
      footer={
        allowed ? (
          <Row>
            <Button variant="outline" disabled={action.busy} onPress={onClose}>
              Cancel
            </Button>
            <Button busy={action.busy} onPress={() => void save()}>
              Save project team
            </Button>
          </Row>
        ) : undefined
      }
    >
      {facts.loading && !data ? (
        <Loading />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        data && (
          <>
            <Notice>
              Selected people can access this project. AI auto assign also adds
              its chosen people here.
            </Notice>
            {allowed ? (
              <Choice
                label="Choose people from your Office"
                multiple
                value={selected}
                disabled={action.busy}
                onChange={(ids: string[]) => {
                  dirty.current = true;
                  setSelected(ids);
                }}
                options={data.people
                  .filter(
                    (p) =>
                      p.is_active &&
                      p.org_id === profile?.org_id &&
                      p.role !== "admin",
                  )
                  .map((p) => ({
                    value: p.id,
                    label: p.full_name,
                    description: p.email,
                  }))}
              />
            ) : (
              <Notice>
                This project's team is read-only, or current appointed Office
                Head access is required.
              </Notice>
            )}
            {data.members.members.map((member) => (
              <Card key={member.user_id + ":" + member.office}>
                <Text style={{ fontWeight: "600", color: colors.text }}>
                  {member.name}
                </Text>
                <LabelValue
                  label="Office"
                  value={member.office_name || "Project member"}
                />
                <LabelValue label="Engagement" value={member.engagement} />
                <Status value={member.state} />
              </Card>
            ))}
          </>
        )
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {!!action.notice && (
        <Text style={{ color: colors.success }}>{action.notice}</Text>
      )}
    </Sheet>
  );
}
