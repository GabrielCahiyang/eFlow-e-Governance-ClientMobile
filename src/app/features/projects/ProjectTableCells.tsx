import { useWorkStatus } from "../../shared/workStatusPresentation";
import { workDisplayStatus } from "../../shared/statusLabels";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Calendar from "lucide-react-native/icons/calendar";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import User from "lucide-react-native/icons/user";
import Wallet from "lucide-react-native/icons/wallet";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Status } from "../../components/ui/Status";
import { dateLabel, peso, withOpacity } from "../../components/ui/theme";
import { taskDateLabel } from "../tasks/taskDates";
import {
  SkeletonBlock,
  SkeletonPulse,
} from "../../components/ui/loading/Skeleton";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";

const taskColumns = [
  { label: "Task", width: 178 },
  { label: "Status", width: 144 },
  { label: "Owner", width: 148 },
  { label: "Start date", width: 120 },
  { label: "Due date", width: 120 },
  { label: "Budget", width: 130 },
  { label: "Actual expense", width: 144 },
];
const directoryColumns = ["Project", "Status"];
export const projectDirectoryWidths = (viewport: number) => {
  const status = Math.floor(viewport * 0.3);
  return [viewport - status - rail, status];
};
const rail = 4;
export const projectTableWidths = (viewport: number, fontScale: number) => {
  const widths = taskColumns.map(({ width }) =>
    Math.round(width * Math.min(1.5, Math.max(1, fontScale))),
  );
  // Leave room to read the other columns on narrow screens and with large text.
  widths[0] = Math.min(
    widths[0],
    Math.max(72, Math.floor(viewport * 0.54) - rail),
  );
  const total = widths.reduce((sum, width) => sum + width, rail);
  widths[widths.length - 1] += Math.max(0, viewport - total);
  return widths;
};
export const projectTableWidth = (widths: number[]) =>
  widths.reduce((sum, width) => sum + width, rail);

export function ProjectTaskCard({
  accent,
  task,
  blocker,
  financial,
  onOpen,
}: {
  accent: string;
  task: Task;
  blocker?: string | null;
  financial?: { budget?: number; expense?: number };
  onOpen?: () => void;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const due = task.deadline || task.dueDate;
  const visualStatus = workDisplayStatus(task.status, blocker);
  const startText = task.startDate
    ? dateLabel(task.startDate + "T12:00:00")
    : undefined;
  const dueText = taskDateLabel(due);
  const hasFinance =
    financial?.budget != null || financial?.expense != null;
  const insetSurface = isDark
    ? withOpacity(palette.background, 0.72)
    : "#f7f9fd";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={task.title}
      accessibilityHint={[
        `Owner: ${task.assigneeName || "Unassigned"}`,
        dueText !== "—" ? `Due: ${dueText}` : undefined,
        financial?.budget != null ? `Budget: ${peso(financial.budget)}` : undefined,
        financial?.expense != null
          ? `Actual expense: ${peso(financial.expense)}`
          : undefined,
      ]
        .filter(Boolean)
        .join(". ")}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.taskCard,
        {
          backgroundColor: pressed ? palette.primarySoft : palette.surface,
          borderColor: palette.border,
        },
        !isDark && styles.taskCardShadow,
      ]}
    >
      <View style={[styles.taskCardRail, { backgroundColor: accent }]} />
      <View style={styles.taskCardBody}>
        <View style={styles.taskCardTop}>
          <Text style={[styles.taskCardTitle, { color: palette.text }]}>
            {task.title}
          </Text>
          <ChevronRight size={16} color={palette.mutedLabel} />
        </View>

        <View style={styles.taskCardPills}>
          <Status
            value={visualStatus}
            customId={task.customStatusId}
            variant="pill"
            work
          />
          {!!blocker && (
            <View
              style={[
                styles.blockerChip,
                {
                  backgroundColor: palette.warningSoft,
                  borderColor: withOpacity(palette.warning, 0.24),
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.blockerText, { color: palette.warning }]}
              >
                Blocker: {blocker}
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.taskMetaBox,
            { backgroundColor: insetSurface, borderColor: palette.border },
          ]}
        >
          <View style={styles.taskMetaRow}>
            <View style={styles.taskMetaItem}>
              <User size={13} color={palette.mutedLabel} />
              <Text
                numberOfLines={1}
                style={[styles.taskMetaText, { color: palette.mutedLabel }]}
              >
                {task.assigneeName || "Unassigned"}
              </Text>
            </View>
            {(startText || dueText !== "—") && (
              <View style={styles.taskMetaItem}>
                <Calendar size={13} color={palette.mutedLabel} />
                <Text
                  numberOfLines={1}
                  style={[styles.taskMetaText, { color: palette.mutedLabel }]}
                >
                  {startText && dueText !== "—"
                    ? `${startText} → ${dueText}`
                    : dueText !== "—"
                      ? `Due ${dueText}`
                      : `Starts ${startText}`}
                </Text>
              </View>
            )}
          </View>

          {hasFinance && (
            <View style={styles.financeRow}>
              <View style={styles.taskMetaItem}>
                <Wallet size={13} color={palette.primary} />
                <Text
                  style={[styles.financeText, { color: palette.text }]}
                >
                  Budget{" "}
                  {financial?.budget == null ? "—" : peso(financial.budget)}
                </Text>
              </View>
              <Text style={[styles.financeSep, { color: palette.mutedLabel }]}>
                ·
              </Text>
              <Text style={[styles.financeText, { color: palette.mutedLabel }]}>
                Spent{" "}
                {financial?.expense == null ? "—" : peso(financial.expense)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function ProjectTableCells({
  widths,
  accent,
  task,
  blocker,
  financial,
  onOpen,
  pinStyle,
  skeleton = false,
  header = !task,
}: {
  widths: number[];
  accent: string;
  task?: Task;
  blocker?: string | null;
  financial?: { budget?: number; expense?: number };
  onOpen?: () => void;
  pinStyle?: ComponentProps<typeof Animated.View>["style"];
  skeleton?: boolean;
  header?: boolean;
}) {
  const due = task?.deadline || task?.dueDate;
  const resolve = useWorkStatus();
  const visualStatus = task ? workDisplayStatus(task.status, blocker) : undefined;
  const status =
    task && visualStatus !== undefined
      ? resolve(visualStatus, task.customStatusId)
      : undefined;
  const values = task
    ? [
        task.title,
        status?.label ?? "",
        task.assigneeName || "Unassigned",
        task.startDate ? dateLabel(task.startDate + "T12:00:00") : "—",
        taskDateLabel(due),
        financial?.budget == null ? "—" : peso(financial.budget),
        financial?.expense == null ? "—" : peso(financial.expense),
      ]
    : undefined;
  return (
    <WorkTableRow
      columns={taskColumns.map(({ label }) => label)}
      values={values}
      status={visualStatus}
      customStatusId={task?.customStatusId}
      widths={widths}
      accent={accent}
      onOpen={onOpen}
      pinStyle={pinStyle}
      skeleton={skeleton}
      header={header}
    />
  );
}

export function ProjectDirectoryCells({
  project,
  widths,
  onOpen,
}: {
  project?: { title: string; status: string; kind: string; shortcut?: boolean };
  widths: number[];
  onOpen?: () => void;
}) {
  const palette = useTheme();
  const resolve = useWorkStatus();
  const status = project && resolve(project.status);
  const detail = project?.shortcut ? "Shortcut" : undefined;
  const rowWidths = widths.length > 2 ? [widths[0] + widths.slice(2).reduce((sum, width) => sum + width, 0), widths[1]] : widths;
  const values = project
    ? [project.title, status?.label ?? ""]
    : undefined;
  return (
    <WorkTableRow
      columns={directoryColumns}
      titleDetail={project ? detail : undefined}
      values={values}
      status={project?.status}
      widths={rowWidths}
      accent={palette.primary}
      onOpen={onOpen}
    />
  );
}

function WorkTableRow({
  widths,
  accent,
  columns,
  values,
  status,
  customStatusId,
  onOpen,
  pinStyle,
  skeleton,
  titleDetail,
  header = !values,
}: {
  widths: number[];
  accent: string;
  columns: string[];
  values?: string[];
  titleDetail?: string;
  status?: string;
  customStatusId?: string | null;
  onOpen?: () => void;
  pinStyle?: ComponentProps<typeof Animated.View>["style"];
  skeleton?: boolean;
  header?: boolean;
}) {
  const palette = useTheme();
  const content = values || columns;
  const cell = (value: string, index: number) => (
    <View
      key={columns[index]}
      style={[
        styles.cell,
        {
          width: widths[index],
          borderColor: palette.border,
          justifyContent: index === 1 && values ? "center" : "flex-start",
        },
      ]}
    >
      {skeleton ? (
        <SkeletonBlock style={{ width: "72%", height: 12 }} />
      ) : index === 1 && values && status ? (
        <Status
          value={status}
          label={value || undefined}
          customId={customStatusId}
          variant="pill"
          work
        />
      ) : (
        <>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              accessibilityRole={header ? "header" : undefined}
              style={{
                fontSize: values ? 13 : 12,
                fontWeight:
                  index === 0 || !values ? "600" : "400",
                color:
                  !values || index > 1 ? palette.mutedLabel : palette.text,
                textAlign: index === 1 ? "center" : "left",
              }}
            >
              {value}
            </Text>
            {index === 0 && titleDetail && (
              <Text style={{ fontSize: 12, color: palette.mutedLabel }}>
                {titleDetail}
              </Text>
            )}
          </View>
          {values && index === 0 && (
            <ChevronRight size={14} color={palette.mutedLabel} />
          )}
        </>
      )}
    </View>
  );
  const frame = {
    borderColor: palette.border,
    backgroundColor: values ? palette.surface : palette.background,
  };
  const row = (pressed = false) => (
    <>
      <Animated.View
        style={[
          styles.frozen,
          {
            backgroundColor: pressed
              ? palette.primarySoft
              : frame.backgroundColor,
          },
          pinStyle,
        ]}
      >
        <View style={{ width: rail, backgroundColor: accent }} />
        {cell(content[0], 0)}
      </Animated.View>
      {content.slice(1).map((value, index) => cell(value, index + 1))}
    </>
  );
  return values ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={values[0]}
      accessibilityHint={values
        .slice(1)
        .map((value, index) => `${columns[index + 1]}: ${value}`)
        .concat(titleDetail ? [titleDetail] : [])
        .join(". ")}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        frame,
        pressed && { backgroundColor: palette.primarySoft },
      ]}
    >
      {({ pressed }) => row(pressed)}
    </Pressable>
  ) : (
    <View style={[styles.row, frame, header && styles.header]}>{row()}</View>
  );
}

export function ProjectTableLoading({ widths }: { widths: number[] }) {
  const palette = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading project"
      accessibilityState={{ busy: true }}
    >
      <SkeletonPulse style={{ gap: 12 }}>
        <SkeletonBlock style={{ width: "72%", height: 30 }} />
        <View
          style={{
            padding: 14,
            gap: 10,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
        >
          <SkeletonBlock style={{ width: 96, height: 24, borderRadius: 12 }} />
          <SkeletonBlock style={{ width: "65%", height: 16 }} />
          <SkeletonBlock style={{ height: 8, borderRadius: 4 }} />
        </View>
        <SkeletonBlock style={{ width: 140, height: 44, borderRadius: 14 }} />
        <SkeletonBlock style={{ height: 36, borderRadius: 12 }} />
        <SkeletonBlock style={{ height: 44, borderRadius: 14 }} />
        <SkeletonBlock style={{ width: 146, height: 18, marginTop: 8 }} />
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={{
              padding: 14,
              gap: 10,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
          >
            <SkeletonBlock style={{ width: "78%", height: 18 }} />
            <SkeletonBlock style={{ width: 100, height: 22, borderRadius: 11 }} />
            <SkeletonBlock style={{ width: "58%", height: 14 }} />
          </View>
        ))}
      </SkeletonPulse>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  taskCardShadow: {
    shadowColor: "#00004f",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  taskCardRail: {
    width: 4,
  },
  taskCardBody: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    gap: 10,
  },
  taskCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  taskCardTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  taskCardPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  blockerChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
  },
  blockerText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "600",
  },
  taskMetaBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  taskMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  taskMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
  },
  taskMetaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    flexShrink: 1,
  },
  financeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  financeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  financeSep: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    minHeight: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  frozen: {
    flexDirection: "row",
    zIndex: 1,
  },
  cell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
