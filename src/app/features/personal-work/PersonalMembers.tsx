import { useState } from "react";
import { Button, Card, Choice, ErrorState, Notice } from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { MemberRemoval } from "../projects";
import { fetchPersonalCandidates } from "../../../core/web/app/features/workspaces/services/workspaceService";
import type {
  PersonalCommand,
  PersonalSnapshot,
} from "../../../core/web/app/features/workspaces/types";
export function PersonalMembers({
  data,
  busy,
  run,
  officeWorkspace,
  onSaved,
}: {
  data: PersonalSnapshot;
  busy: boolean;
  run: (
    command: PersonalCommand,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  officeWorkspace?: string;
  onSaved: () => Promise<unknown>;
}) {
  const facts = useFacts("personal-candidates:" + data.project.id, () =>
      fetchPersonalCandidates(data.project.id),
    ),
    [person, setPerson] = useState(""),
    [access, setAccess] = useState("member");
  return (
    <Card title="Manage personal project membership">
      <Choice
        label="Person"
        value={person}
        options={(facts.data || []).map((p) => ({
          value: p.id,
          label: p.name,
        }))}
        onChange={setPerson}
      />
      <Choice
        label="Access"
        value={access}
        options={[
          { value: "member", label: "Member" },
          { value: "viewer", label: "Viewer" },
        ]}
        onChange={setAccess}
      />
      <Button
        disabled={busy || !person || facts.loading || !!facts.error}
        onPress={() =>
          void run("set_member", {
            user_id: person,
            access,
            state: "active",
          }).then((ok) => {
            if (ok) setPerson("");
          })
        }
      >
        Save project member
      </Button>
      {data.members
        .filter((m) => m.user_id !== data.owner && m.state === "active")
        .map((member) => (
          <MemberRemoval
            key={member.user_id}
            project={data.project.id}
            person={member.user_id}
            name={member.name}
            busy={busy}
            onSaved={onSaved}
          />
        ))}
      {!!officeWorkspace && (
        <>
          <Notice>
            An Office shortcut is visible only to existing members. It grants no
            Office-wide access.
          </Notice>
          <Button
            variant="outline"
            disabled={busy}
            onPress={() =>
              void run("shortcut", {
                office_workspace_id: officeWorkspace,
                enabled: !data.shortcuts.includes(officeWorkspace),
              })
            }
          >
            {data.shortcuts.includes(officeWorkspace)
              ? "Remove Office shortcut"
              : "Show shortcut in my Office workspace"}
          </Button>
        </>
      )}
      {!!facts.error && <ErrorState error={facts.error} />}
    </Card>
  );
}
