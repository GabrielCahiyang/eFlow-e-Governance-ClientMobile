import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Clock from "lucide-react-native/icons/clock";
import RotateCcwClock from "lucide-react-native/icons/rotate-ccw-clock";
import Search from "lucide-react-native/icons/search";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Row,
  SearchField,
  withOpacity,
} from "../../components/ui";
import { FilterChip } from "../../components/ui/FilterChip";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { useFacts } from "../../shared/useFacts";
import { nativeWindow } from "../../../platform/webRuntime";
import { ACCESS_CHANGED_EVENT } from "../../../core/web/app/features/project-access/services/accessService";
import { fetchActivityPage } from "../../../core/web/app/features/projects/activity/activityService";
import {
  DEFAULT_ACTIVITY_FILTERS,
  type ActivityFilters,
} from "../../../core/web/app/features/projects/activity/types";
import { netProjectUpdates } from "./subscriptions";

const categories: { value: ActivityFilters["kind"]; label: string }[] = [
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
  const { isDark } = useAppearance();
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
    return () => {
      stop();
      nativeWindow.removeEventListener(ACCESS_CHANGED_EVENT, update);
    };
  }, [project, page.snapshot, facts.refresh]);

  const history = facts.error ? undefined : facts.data;
  const time = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  });
  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";

  return (
    <Card
      title="Audit Trail"
      icon={<RotateCcwClock size={16} color={palette.primary} />}
      badge={
        history
          ? `${history.total} ${history.total === 1 ? "event" : "events"}`
          : undefined
      }
      style={{ gap: 12 }}
    >
      <Text style={[styles.subtitle, { color: palette.mutedLabel }]}>
        Project and task changes, with the person and time recorded for each
        event.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {categories.map((category) => {
          const active = filters.kind === category.value;
          return (
            <FilterChip
              key={category.value}
              label={category.label}
              active={active}
              tone={active ? "tinted" : "default"}
              onPress={() => {
                setPage(firstPage);
                setFilters((current) => ({
                  ...current,
                  kind: category.value,
                }));
              }}
            />
          );
        })}
      </ScrollView>

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchField
            placeholder="Search changes or people"
            value={search}
            onChange={setSearch}
          />
        </View>
        <Button
          variant="outline"
          icon={<Search size={15} color={palette.primary} />}
          onPress={() => {
            setPage(firstPage);
            setFilters((current) => ({ ...current, search: search.trim() }));
          }}
        >
          Search activity
        </Button>
      </View>

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
        <View style={styles.eventsList}>
          {history.events.map((event) => (
            <View
              key={event.id}
              style={[
                styles.eventCard,
                {
                  backgroundColor: insetSurface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.eventTop}>
                <View
                  style={[
                    styles.eventDot,
                    { backgroundColor: palette.primary },
                  ]}
                />
                <Text style={[styles.eventTitle, { color: palette.text }]}>
                  {event.title}
                </Text>
              </View>
              <View style={styles.eventMetaRow}>
                <Clock size={12.5} color={palette.mutedLabel} />
                <Text
                  style={[styles.eventMetaText, { color: palette.mutedLabel }]}
                >
                  {event.actorName || "System"} · {time.format(event.occurredAt)}
                </Text>
              </View>
              {!!event.detail && (
                <Text style={[styles.eventDetail, { color: palette.text }]}>
                  {event.detail}
                </Text>
              )}
            </View>
          ))}

          <View
            style={[styles.pagerFooter, { borderTopColor: palette.border }]}
          >
            <Text style={[styles.pagerCount, { color: palette.mutedLabel }]}>
              {history.page * history.size + 1}–
              {history.page * history.size + history.events.length} of{" "}
              {history.total}
            </Text>
            <Row>
              <Button
                variant="outline"
                disabled={facts.loading || page.index === 0}
                icon={<ChevronLeft size={16} color={palette.primary} />}
                onPress={() =>
                  setPage({ index: page.index - 1, snapshot: history.snapshot })
                }
              >
                Previous page
              </Button>
              <Button
                variant="outline"
                disabled={facts.loading || !history.more}
                icon={<ChevronRight size={16} color={palette.primary} />}
                onPress={() =>
                  setPage({ index: page.index + 1, snapshot: history.snapshot })
                }
              >
                Next page
              </Button>
            </Row>
          </View>
        </View>
      ) : (
        <Empty kind="search" compact title="No matching activity" />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  searchRow: {
    gap: 8,
  },
  eventsList: {
    gap: 8,
  },
  eventCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  eventTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 15,
  },
  eventMetaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  eventDetail: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 15,
  },
  pagerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
    gap: 8,
  },
  pagerCount: {
    fontSize: 12.5,
    fontWeight: "600",
  },
});
