import { useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Calendar from "lucide-react-native/icons/calendar";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ExternalLink from "lucide-react-native/icons/external-link";
import ListIcon from "lucide-react-native/icons/list";
import TableIcon from "lucide-react-native/icons/table";
import { Pressable, View } from "../../components/ui/Primitives";
import {
  Button,
  Card,
  DataTable,
  DetailGroup,
  Empty,
  LabelValue,
  Notice,
  Sheet,
} from "../../components/ui";
import { Status } from "../../components/ui/Status";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import type { AppRoute, Navigate } from "../../shared/routes";
import { statusLabel } from "../../shared/statusLabels";
import type { DepartmentReportRow } from "../../../core/web/app/features/reports/types";
import { activityTime } from "../tasks/activityPresentation";
import { reportRecordRoute } from "./reportRecordRoute";
import { reportValue } from "./exportData";

function normalizeStatusCode(raw: string): string {
  const code = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (code === "to_do") return "todo";
  if (code === "blocked") return "stuck";
  if (code === "awaiting_approval" || code === "awaiting_review")
    return "for_review";
  return code;
}

function rowStatusSpec(raw: string): { code: string; label: string } {
  const clean = raw.trim();
  if (!clean) return { code: "", label: "Unavailable" };
  const code = normalizeStatusCode(clean);
  const lower = clean.toLowerCase();
  if (lower === "blocked") return { code, label: "Blocked" };
  if (lower === "stalled") return { code, label: "Stalled" };
  if (lower === "attached") return { code, label: "Attached" };
  return { code, label: statusLabel(code) };
}

function ReportStatus({ status }: { status: string }) {
  const { code, label } = rowStatusSpec(status);
  return <Status value={code} label={label} variant="pill" />;
}

export function ReportRows({
  rows,
  navigate,
  destination = reportRecordRoute,
}: {
  rows: DepartmentReportRow[];
  navigate: Navigate;
  destination?: (row: DepartmentReportRow) => AppRoute | undefined;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const [selected, setSelected] = useState<DepartmentReportRow>();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [limit, setLimit] = useState(30);

  const visibleRows = rows.slice(0, limit);
  const target = selected ? destination(selected) : undefined;
  const insetSurface = isDark ? "#0f1733" : palette.background;

  return (
    <View style={s.wrap}>
      <View style={s.sectionBar}>
        <Text style={[s.sectionHeading, { color: palette.mutedLabel }]}>
          RECORDS · {rows.length}
        </Text>
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Records view mode"
          style={[
            s.segmentWrap,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Cards view"
            accessibilityState={{ selected: viewMode === "cards" }}
            onPress={() => setViewMode("cards")}
            style={[
              s.segmentBtn,
              viewMode === "cards" && { backgroundColor: palette.primarySoft },
            ]}
          >
            <ListIcon
              size={14}
              color={
                viewMode === "cards" ? palette.primaryDark : palette.mutedLabel
              }
            />
            <Text
              style={[
                s.segmentText,
                {
                  color:
                    viewMode === "cards"
                      ? palette.primaryDark
                      : palette.mutedLabel,
                },
              ]}
            >
              Cards
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Table view"
            accessibilityState={{ selected: viewMode === "table" }}
            onPress={() => setViewMode("table")}
            style={[
              s.segmentBtn,
              viewMode === "table" && { backgroundColor: palette.primarySoft },
            ]}
          >
            <TableIcon
              size={14}
              color={
                viewMode === "table" ? palette.primaryDark : palette.mutedLabel
              }
            />
            <Text
              style={[
                s.segmentText,
                {
                  color:
                    viewMode === "table"
                      ? palette.primaryDark
                      : palette.mutedLabel,
                },
              ]}
            >
              Table
            </Text>
          </Pressable>
        </View>
      </View>

      {viewMode === "table" ? (
        <DataTable
          rows={visibleRows}
          rowKey={(row) => row.id}
          empty="No records match these filters."
          emptyKind="search"
          hint="Swipe horizontally to view all 7 columns"
          columns={[
            {
              id: "work",
              title: "Work item",
              width: 260,
              render: (row) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Inspect ${row.title}`}
                  onPress={() => setSelected(row)}
                  style={{ gap: 2 }}
                >
                  <Text
                    style={{
                      color: palette.primary,
                      fontWeight: "700",
                      lineHeight: 20,
                    }}
                  >
                    {row.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: palette.muted }}>
                    {row.parent}
                  </Text>
                </Pressable>
              ),
            },
            {
              id: "person",
              title: "Person / role",
              width: 190,
              render: (row) => (
                <>
                  <Text style={{ color: palette.text, fontWeight: "500" }}>
                    {row.person}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>
                    {row.role}
                  </Text>
                </>
              ),
            },
            {
              id: "project",
              title: "Project",
              width: 200,
              render: (row) => (
                <Text style={{ color: palette.text }}>{row.project}</Text>
              ),
            },
            {
              id: "status",
              title: "Status / priority",
              width: 170,
              render: (row) => (
                <View style={{ gap: 4 }}>
                  <ReportStatus status={row.status} />
                  <Text style={{ color: palette.muted, fontSize: 12 }}>
                    {row.priority}
                  </Text>
                </View>
              ),
            },
            {
              id: "metric",
              title: "Progress / signal",
              width: 210,
              render: (row) => (
                <>
                  <Text
                    style={{
                      color: palette.text,
                      fontWeight: "600",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {typeof row.progress === "number" ? `${row.progress}%` : "—"}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>
                    {row.metric}
                  </Text>
                </>
              ),
            },
            {
              id: "date",
              title: "Event / due date",
              width: 170,
              render: (row) => (
                <>
                  <Text style={{ color: palette.text, fontSize: 12 }}>
                    {row.eventAt ? activityTime(row.eventAt) : "—"}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>
                    Due {reportValue(row, "dueAt")}
                  </Text>
                </>
              ),
            },
            {
              id: "detail",
              title: "Detail",
              width: 280,
              render: (row) => (
                <Text style={{ lineHeight: 20, color: palette.text }}>
                  {row.detail}
                </Text>
              ),
            },
          ]}
        />
      ) : visibleRows.length === 0 ? (
        <Card>
          <Empty
            compact
            kind="search"
            title="No records match these filters."
          />
        </Card>
      ) : (
        <View style={s.cardList}>
          {visibleRows.map((row) => {
            const normalized = normalizeStatusCode(row.status);
            const hasProgress = typeof row.progress === "number";
            const clampedPct = hasProgress
              ? Math.max(0, Math.min(100, row.progress!))
              : 0;
            const barFill =
              normalized === "completed" || normalized === "approved"
                ? palette.success
                : normalized === "changes_requested" ||
                    normalized === "overdue" ||
                    normalized === "stuck"
                  ? palette.danger
                  : normalized === "for_review"
                    ? palette.review
                    : palette.primary;

            return (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`Inspect ${row.title}, ${rowStatusSpec(row.status).label}`}
                onPress={() => setSelected(row)}
                style={({ pressed }) => [
                  s.recordCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View style={s.recordTop}>
                  <View style={s.recordCopy}>
                    <Text
                      style={[s.recordTitle, { color: palette.primary }]}
                    >
                      {row.title}
                    </Text>
                    <Text
                      numberOfLines={fontScale > 1.35 ? 3 : 2}
                      style={[s.recordSub, { color: palette.muted }]}
                    >
                      {row.project} · {row.parent}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={palette.mutedLabel} />
                </View>

                <View style={s.badgeRow}>
                  <ReportStatus status={row.status} />
                  {!!row.priority && (
                    <View
                      style={[
                        s.priorityPill,
                        {
                          backgroundColor: insetSurface,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <Text style={[s.priorityText, { color: palette.muted }]}>
                        {row.priority}
                      </Text>
                    </View>
                  )}
                  {row.dueAt != null && (
                    <View style={s.dueTag}>
                      <Calendar size={12} color={palette.mutedLabel} />
                      <Text
                        style={[s.dueText, { color: palette.mutedLabel }]}
                      >
                        Due {reportValue(row, "dueAt")}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={s.recordFooter}>
                  <View
                    style={[
                      s.footerLine,
                      fontScale > 1.35 && {
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.footerPerson,
                        { color: palette.muted },
                        fontScale <= 1.35 && { flexShrink: 1 },
                      ]}
                    >
                      {row.person} · {row.role}
                    </Text>
                    <Text
                      style={[s.footerMetric, { color: palette.text }]}
                    >
                      {hasProgress
                        ? `${clampedPct}% · ${row.metric}`
                        : row.metric}
                    </Text>
                  </View>
                  {hasProgress && (
                    <View
                      style={[
                        s.progressTrack,
                        { backgroundColor: palette.primarySoft },
                      ]}
                    >
                      <View
                        style={[
                          s.progressFill,
                          {
                            width: `${clampedPct}%`,
                            backgroundColor: barFill,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {rows.length > limit && (
        <Button
          variant="outline"
          icon={<ChevronDown size={16} color={palette.primary} />}
          onPress={() => setLimit((value) => value + 30)}
        >
          Show more records
        </Button>
      )}

      <Sheet
        open={!!selected}
        title={selected?.title || "Report record"}
        onClose={() => setSelected(undefined)}
        presentation="inspector"
      >
        {!!selected && (
          <View style={s.sheetBody}>
            <View style={s.sheetMetaHead}>
              <ReportStatus status={selected.status} />
              {!!selected.priority && (
                <View
                  style={[
                    s.priorityPill,
                    {
                      backgroundColor: insetSurface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[s.priorityText, { color: palette.muted }]}>
                    {selected.priority}
                  </Text>
                </View>
              )}
            </View>
            <DetailGroup>
              <LabelValue
                label="Parent / transition"
                value={selected.parent}
              />
              <LabelValue label="Person" value={selected.person} />
              <LabelValue label="Role" value={selected.role} />
              <LabelValue label="Project" value={selected.project} />
              <LabelValue label="Signal" value={selected.metric} />
              {selected.eventAt != null && (
                <LabelValue
                  label="Recorded"
                  value={activityTime(selected.eventAt)}
                />
              )}
              {selected.dueAt != null && (
                <LabelValue
                  label="Due date"
                  value={reportValue(selected, "dueAt")}
                />
              )}
              {!!selected.assignedReviewer && (
                <LabelValue
                  label="Assigned reviewer"
                  value={selected.assignedReviewer}
                />
              )}
              {!!selected.decisionAuthor && (
                <LabelValue
                  label="Decision author"
                  value={selected.decisionAuthor}
                />
              )}
            </DetailGroup>
            {!!selected.detail?.trim() && (
              <Notice tone="neutral">
                {selected.detail}
              </Notice>
            )}
            {!!target && (
              <Button
                icon={<ExternalLink size={16} color={palette.onPrimary} />}
                trailing={<ChevronRight size={16} color={palette.onPrimary} />}
                onPress={() => {
                  setSelected(undefined);
                  navigate(target);
                }}
              >
                Open work record
              </Button>
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  sectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    paddingTop: 4,
  },
  sectionHeading: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  segmentWrap: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minHeight: 32,
  },
  segmentText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  cardList: {
    gap: 10,
  },
  recordCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  recordTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  recordCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  recordTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  recordSub: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  priorityPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  dueTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  dueText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontVariant: ["tabular-nums"],
  },
  recordFooter: {
    gap: 6,
  },
  footerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  footerPerson: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerMetric: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  sheetBody: {
    gap: 12,
  },
  sheetMetaHead: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
});
