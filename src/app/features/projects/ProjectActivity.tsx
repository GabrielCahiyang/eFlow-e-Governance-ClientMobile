import {
  Card,
  ErrorState,
  Loading,
  dateLabel,
  Empty,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useFacts } from "../../shared/useFacts";
import { fetchProjectAuditActivity } from "../../../core/web/app/features/projects/services/projectActivityService";
export function ProjectActivity({ ids }: { ids: string[] }) {
  const facts = useFacts("project-history:" + ids.join(":"), () =>
    fetchProjectAuditActivity(ids),
  );
  return (
    <>
      {facts.loading && !facts.data ? (
        <Loading />
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void facts.refresh()} />
      ) : facts.data?.length ? (
        facts.data.map((item) => (
          <Card key={item.id} title={item.title}>
            <Text>
              {item.actorName} · {dateLabel(item.occurredAt)}
            </Text>
            <Text>{item.detail}</Text>
          </Card>
        ))
      ) : (
        <Empty title="No recorded activity" />
      )}
    </>
  );
}
