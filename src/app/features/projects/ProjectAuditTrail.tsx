import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  Loading,
  Row,
  SearchField,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { useFacts } from "../../shared/useFacts";
import { nativeWindow } from "../../../platform/webRuntime";
import { ACCESS_CHANGED_EVENT } from "../../../core/web/app/features/project-access/services/accessService";
import { fetchActivityPage } from "../../../core/web/app/features/projects/activity/activityService";
import {
  DEFAULT_ACTIVITY_FILTERS,
  type ActivityFilters,
} from "../../../core/web/app/features/projects/activity/types";
import { netProjectUpdates } from "./subscriptions";

const categories = [
  { value: "all", label: "All activity" },
  { value: "project", label: "Project changes" },
  { value: "status", label: "Status changes" },
  { value: "progress", label: "Work updates" },
  { value: "submission", label: "Submissions" },
];
const firstPage = { index: 0, snapshot: undefined as string | undefined };

export function ProjectAuditTrail({
  actor,
  project,
  timezone,
}: {
  actor: string;
  project: string;
  timezone: string;
}) {
  const palette = useTheme();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_ACTIVITY_FILTERS);
  const [page, setPage] = useState(firstPage);
  const facts = useFacts(
    JSON.stringify(["project-audit", actor, project, timezone, filters, page]),
    () =>
      fetchActivityPage(
        project,
        { ...filters, timezone },
        25,
        page.index,
        page.snapshot,
      ),
    !!actor,
  );
  useEffect(() => {
    const update = () => {
      if (page.snapshot) setPage(firstPage);
      else void facts.refresh();
    };
    const stop = netProjectUpdates(project, () => {
      if (!page.snapshot) void facts.refresh();
    });
    nativeWindow.addEventListener(ACCESS_CHANGED_EVENT, update);
    const timer = setInterval(update, 60_000);
    return () => {
      stop();
      clearInterval(timer);
      nativeWindow.removeEventListener(ACCESS_CHANGED_EVENT, update);
    };
  }, [project, page.snapshot, facts.refresh]);

  const history = facts.error ? undefined : facts.data;
  const time = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  });
  return (
    <Card title="Audit Trail">
      <Text>
        Project and task changes, with the person and time recorded for each
        event.
      </Text>
      <Choice
        label="Activity type"
        value={filters.kind}
        options={categories}
        onChange={(kind) => {
          setPage(firstPage);
          setFilters((current) => ({
            ...current,
            kind: kind as ActivityFilters["kind"],
          }));
        }}
      />
      <SearchField
        placeholder="Search changes or people"
        value={search}
        onChange={setSearch}
      />
      <Button
        variant="outline"
        onPress={() => {
          setPage(firstPage);
          setFilters((current) => ({ ...current, search: search.trim() }));
        }}
      >
        Search activity
      </Button>
      {facts.error ? (
        <ErrorState
          error={facts.error}
          retry={() =>
            page.snapshot ? setPage(firstPage) : void facts.refresh()
          }
        />
      ) : !history ? (
        <Loading label="Loading Audit Trail" layout="activity" />
      ) : history.events.length ? (
        <>
          {history.events.map((event) => (
            <Card key={event.id} title={event.title}>
              <Text style={{ color: palette.mutedLabel }}>
                {event.actorName || "System"} · {time.format(event.occurredAt)}
              </Text>
              {!!event.detail && (
                <Text style={{ color: palette.text }}>{event.detail}</Text>
              )}
            </Card>
          ))}
          <Text style={{ color: palette.mutedLabel }}>
            {history.page * history.size + 1}–
            {history.page * history.size + history.events.length} of{" "}
            {history.total}
          </Text>
          <Row>
            <Button
              variant="outline"
              disabled={facts.loading || page.index === 0}
              onPress={() =>
                setPage({ index: page.index - 1, snapshot: history.snapshot })
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={facts.loading || !history.more}
              onPress={() =>
                setPage({ index: page.index + 1, snapshot: history.snapshot })
              }
            >
              Next
            </Button>
          </Row>
        </>
      ) : (
        <Empty kind="activity" title="No matching activity" />
      )}
    </Card>
  );
}
