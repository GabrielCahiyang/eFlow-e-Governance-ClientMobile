import { useState } from "react";
import { Button, ErrorState, Notice, Sheet } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAction } from "../../shared/useAction";
import {
  previewRemoval,
  removePerson,
} from "../../../core/web/app/features/project-access/services/accessService";
import type { RemovalImpact } from "../../../core/web/app/features/project-access/types";
export function MemberRemoval({
  project,
  person,
  name,
  busy,
  onSaved,
  office = null,
}: {
  project: string;
  person: string;
  name: string;
  busy: boolean;
  onSaved: () => Promise<unknown>;
  office?: string | null;
}) {
  const action = useAction(),
    [preview, setPreview] = useState<{
      impact: RemovalImpact;
      request: string;
    }>();
  return (
    <>
      <Button
        variant="danger"
        disabled={busy}
        busy={action.busy}
        onPress={() =>
          void action.run(async () =>
            setPreview({
              impact: await previewRemoval(project, person, office),
              request: crypto.randomUUID(),
            }),
          )
        }
      >
        Review removal of {name}
      </Button>
      <Sheet
        open={!!preview}
        title={"Remove " + name}
        busy={action.busy}
        onClose={() => setPreview(undefined)}
      >
        <Notice>
          The server checks the current responsibility list before removing this
          membership. It may clear staffing on the listed work.
        </Notice>
        {preview?.impact.tasks.map((t) => (
          <Text key={t.id}>
            {t.title} · {t.status}
          </Text>
        ))}
        {preview?.impact.nodes.map((n) => (
          <Text key={n.id}>
            {n.title} · {n.status}
          </Text>
        ))}
        <Button
          variant="danger"
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              await removePerson(preview!.impact, preview!.request);
              setPreview(undefined);
              await onSaved();
            })
          }
        >
          Confirm reviewed removal
        </Button>
        {!!action.error && <ErrorState error={action.error} />}
      </Sheet>
      {!preview && !!action.error && <ErrorState error={action.error} />}
    </>
  );
}
