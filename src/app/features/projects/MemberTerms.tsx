import { useRef, useState } from "react";
import {
  Button,
  Card,
  Choice,
  DateField,
  ErrorState,
  LabelValue,
  Notice,
  Sheet,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import {
  fetchMembers,
  saveMemberTerms,
} from "../../../core/web/app/features/project-members/services/memberService";
import {
  accessEnd,
  accessEndDate,
} from "../../../core/web/app/shared/accessTerms";
import {
  ENGAGEMENT_TYPES,
  type Engagement,
  type SelectedMember,
} from "../../../core/web/app/features/project-members/types";
function Editor({
  project,
  member,
  timezone,
  onSaved,
  onClose,
}: {
  project: string;
  member: SelectedMember;
  timezone: string;
  onSaved: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [engagement, setEngagement] = useState<Engagement>(member.engagement),
    [end, setEnd] = useState(accessEndDate(member.access_end, timezone)),
    [until, setUntil] = useState(member.until_close),
    [locked, setLocked] = useState(false),
    request = useRef(crypto.randomUUID()),
    action = useAction();
  return (
    <Sheet
      open
      title={"Access terms · " + member.name}
      busy={action.busy}
      onClose={onClose}
    >
      <Choice
        label="Engagement"
        value={engagement}
        disabled={locked}
        onChange={(value) => setEngagement(value as Engagement)}
        options={ENGAGEMENT_TYPES.map((value) => ({ value, label: value }))}
      />
      <Choice
        label="Access duration"
        value={until ? "close" : "date"}
        disabled={locked}
        options={[
          { value: "close", label: "Until project closes" },
          { value: "date", label: "Choose end date" },
        ]}
        onChange={(value) => setUntil(value === "close")}
      />
      {!until && (
        <DateField
          label="Last access date"
          value={end}
          disabled={locked}
          onChange={setEnd}
        />
      )}
      <Notice>
        These are project membership terms. They do not change the person's
        permanent system role or account.
      </Notice>
      <Button
        busy={action.busy}
        onPress={() =>
          void action.run(async () => {
            if (!until && !end) throw new Error("Choose an access end date.");
            const timestamp = until ? null : accessEnd(end, timezone);
            setLocked(true);
            await saveMemberTerms(
              project,
              member,
              engagement,
              timestamp,
              until,
              request.current,
            );
            await onSaved();
            onClose();
          })
        }
      >
        {locked ? "Retry original terms" : "Save access terms"}
      </Button>
      {locked && (
        <Notice>
          The original terms and request ID are retained for retry. If you
          close, refresh the current membership before making another change.
        </Notice>
      )}
      {!!action.error && <ErrorState error={action.error} />}
    </Sheet>
  );
}
export function MemberTerms({ project }: { project: string }) {
  const facts = useFacts("project-member-terms:" + project, () =>
      fetchMembers(project),
    ),
    [editing, setEditing] = useState<SelectedMember>();
  return (
    <Card title="Members & access terms">
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : (
        facts.data?.members.map((member) => (
          <Card key={member.user_id + ":" + member.office} title={member.name}>
            <LabelValue label="Access" value={member.access} />
            <LabelValue label="Engagement" value={member.engagement} />
            <LabelValue
              label="Ends"
              value={
                member.until_close
                  ? "When the project closes"
                  : member.access_end || "—"
              }
            />
            <LabelValue label="Current participation" value={member.state} />
            {((facts.data?.kind === "personal" && facts.data?.can_select) ||
              facts.data?.offices.some(
                (office) =>
                  office.can_select && office.office_id === member.office,
              )) && (
              <Button variant="outline" onPress={() => setEditing(member)}>
                Edit access terms
              </Button>
            )}
          </Card>
        ))
      )}
      {editing && (
        <Editor
          key={editing.user_id + ":" + editing.office}
          project={project}
          member={editing}
          timezone={facts.data?.timezone || "Asia/Manila"}
          onSaved={facts.refresh}
          onClose={() => {
            setEditing(undefined);
            void facts.refresh();
          }}
        />
      )}
    </Card>
  );
}
