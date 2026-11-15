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
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { formDraftKey, useRetainedDraft } from "../../shared/formDraftMemory";
import { useAction } from "../../shared/useAction";
import { useToast } from "../../components/ui/Toast";
import {
  PublicMessageError,
  isDeterministicRejection,
} from "../../shared/userMessages";
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
  const { profile } = useAuth();
  const { toast } = useToast();
  const [locked, setLocked] = useState(false),
    request = useRef(crypto.randomUUID()),
    action = useAction();
  const [draft, updateDraft, clearDraft] = useRetainedDraft(
    formDraftKey(
      profile?.id,
      "member-terms:" + project + ":" + member.user_id + ":" + member.office,
    ),
    true,
    () => ({
      engagement: member.engagement,
      end: accessEndDate(member.access_end, timezone),
      until: member.until_close,
    }),
  );
  const { engagement, end, until } = draft;
  const close = () => {
    if (action.busy) return;
    action.clear();
    onClose();
  };
  return (
    <Sheet
      actionError={action.error}
      open
      title={"Access terms · " + member.name}
      busy={action.busy}
      onClose={close}
    >
      <Choice
        label="Engagement"
        value={engagement}
        disabled={locked}
        onChange={(value) => updateDraft({ engagement: value as Engagement })}
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
        onChange={(value) => updateDraft({ until: value === "close" })}
      />
      {!until && (
        <DateField
          label="Last access date"
          value={end}
          disabled={locked}
          onChange={(next) => updateDraft({ end: next })}
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
            if (!until && !end)
              throw new PublicMessageError("Choose an access end date.");
            const timestamp = until ? null : accessEnd(end, timezone);
            setLocked(true);
            try {
              await saveMemberTerms(
                project,
                member,
                engagement,
                timestamp,
                until,
                request.current,
              );
            } catch (error) {
              if (isDeterministicRejection(error)) setLocked(false);
              throw error;
            }
            clearDraft();
            toast("Member access terms saved.", "success");
            await onSaved();
            onClose();
          })
        }
      >
        Save access terms
      </Button>
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
