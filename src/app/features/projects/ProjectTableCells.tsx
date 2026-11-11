import { statusLabel } from "../../shared/statusLabels";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { statusColors } from "../../components/ui/Status";
import { dateLabel, peso } from "../../components/ui/theme";
import {
  SkeletonBlock,
  SkeletonPulse,
} from "../../components/ui/loading/Skeleton";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";

const taskColumns = [
  { label: "Task", width: 178 },
  { label: "Status", width: 132 },
  { label: "Owner", width: 148 },
  { label: "Start date", width: 120 },
  { label: "Due date", width: 120 },
  { label: "Budget", width: 130 },
  { label: "Actual expense", width: 144 },
];
const directoryColumns = ["Project", "Status", "Type"];
export const projectDirectoryWidths = (viewport: number) => {
  const status = Math.floor(viewport * 0.3);
  if (viewport < 380) return [viewport - status - rail, status];
  const type = Math.floor(viewport * 0.22);
  return [viewport - status - type - rail, status, type];
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

export function ProjectTableCells({
  widths,
  accent,
  task,
  financial,
  onOpen,
  pinStyle,
  skeleton = false,
  header = !task,
}: {
  widths: number[];
  accent: string;
  task?: Task;
  financial?: { budget?: number; expense?: number };
  onOpen?: () => void;
  pinStyle?: ComponentProps<typeof Animated.View>["style"];
  skeleton?: boolean;
  header?: boolean;
}) {
  const due = task?.deadline || task?.dueDate;
  const values = task
    ? [
        task.title,
        statusLabel(task.status),
        task.assigneeName || "Unassigned",
        task.startDate ? dateLabel(task.startDate + "T12:00:00") : "—",
        due ? dateLabel(due) : "—",
        financial?.budget == null ? "—" : peso(financial.budget),
        financial?.expense == null ? "—" : peso(financial.expense),
      ]
    : undefined;
  return (
    <WorkTableRow
      columns={taskColumns.map(({ label }) => label)}
      values={values}
      status={task?.status}
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
  const type = project?.kind === "personal" ? "Personal" : "Office";
  const compact = widths.length === 2;
  const detail = type + (project?.shortcut ? " shortcut" : "");
  const values = project
    ? [project.title, statusLabel(project.status), ...(compact ? [] : [detail])]
    : undefined;
  return (
    <WorkTableRow
      columns={compact ? directoryColumns.slice(0, 2) : directoryColumns}
      titleDetail={compact && project ? detail : undefined}
      values={values}
      status={project?.status}
      widths={widths}
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
  onOpen?: () => void;
  pinStyle?: ComponentProps<typeof Animated.View>["style"];
  skeleton?: boolean;
  header?: boolean;
}) {
  const palette = useTheme();
  const tone = status ? statusColors(status, palette) : undefined;
  const content = values || columns;
  const cell = (value: string, index: number) => (
    <View
      key={columns[index]}
      style={[
        styles.cell,
        {
          width: widths[index],
          borderColor: palette.border,
          backgroundColor: index === 1 ? tone?.background : undefined,
        },
      ]}
    >
      {skeleton ? (
        <SkeletonBlock style={{ width: "72%", height: 12 }} />
      ) : (
        <>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              accessibilityRole={header ? "header" : undefined}
              style={{
                fontSize: values ? 13 : 12,
                fontWeight:
                  index === 0 || index === 1 || !values ? "600" : "400",
                color:
                  index === 1 && tone
                    ? tone.foreground
                    : !values || index > 1
                      ? palette.mutedLabel
                      : palette.text,
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
            padding: 10,
            gap: 8,
            borderRadius: 12,
            backgroundColor: palette.surface,
          }}
        >
          <SkeletonBlock style={{ width: 82, height: 24 }} />
          <SkeletonBlock style={{ width: "65%", height: 16 }} />
          <SkeletonBlock style={{ height: 6 }} />
        </View>
        <SkeletonBlock style={{ width: 140, height: 44 }} />
        <SkeletonBlock style={{ height: 36 }} />
        <SkeletonBlock style={{ height: 44 }} />
        <SkeletonBlock style={{ width: 146, height: 18, marginTop: 12 }} />
        <View style={{ overflow: "hidden" }}>
          <ProjectTableCells
            widths={widths}
            accent={palette.primary}
            skeleton
          />
          {[0, 1, 2].map((index) => (
            <ProjectTableCells
              key={index}
              widths={widths}
              accent={palette.primary}
              skeleton
              header={false}
            />
          ))}
        </View>
      </SkeletonPulse>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    minHeight: 48,
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
