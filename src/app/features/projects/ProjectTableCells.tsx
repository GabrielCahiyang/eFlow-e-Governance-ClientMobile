import { Pressable, StyleSheet, View } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { statusColors } from "../../components/ui/Status";
import { dateLabel, words } from "../../components/ui/theme";
import {
  SkeletonBlock,
  SkeletonPulse,
} from "../../components/ui/loading/Skeleton";
import type { Task } from "../../../core/web/app/features/tasks/taskTypes";

const columns = [
  { label: "Task", width: 178 },
  { label: "Status", width: 132 },
  { label: "Owner", width: 148 },
  { label: "Due date", width: 120 },
  { label: "Office", width: 148 },
];
const rail = 4;
export const projectTableWidths = (viewport: number, fontScale: number) => {
  const widths = columns.map(({ width }) =>
    Math.round(width * Math.min(1.5, Math.max(1, fontScale))),
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
  office,
  onOpen,
  skeleton = false,
  header = !task,
}: {
  widths: number[];
  accent: string;
  task?: Task;
  office?: string;
  onOpen?: () => void;
  skeleton?: boolean;
  header?: boolean;
}) {
  const palette = useTheme();
  const tone = task && statusColors(task.status, palette);
  const due = task?.deadline || task?.dueDate;
  const values = task
    ? [
        task.title,
        words(task.status),
        task.assigneeName || "Unassigned",
        due ? dateLabel(due) : "—",
        office || "—",
      ]
    : columns.map(({ label }) => label);
  const row = (
    <>
      <View style={{ width: rail, backgroundColor: accent }} />
      {values.map((value, index) => (
        <View
          key={columns[index].label}
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
              <Text
                accessibilityRole={task ? undefined : "header"}
                numberOfLines={2}
                style={{
                  flex: 1,
                  fontSize: task ? 13 : 12,
                  fontWeight:
                    index === 0 || index === 1 || !task ? "600" : "400",
                  color:
                    index === 1 && tone
                      ? tone.foreground
                      : !task || index > 1
                        ? palette.mutedLabel
                        : palette.text,
                  textAlign: index === 1 ? "center" : "left",
                }}
              >
                {value}
              </Text>
              {task && index === 0 && (
                <ChevronRight size={14} color={palette.mutedLabel} />
              )}
            </>
          )}
        </View>
      ))}
    </>
  );
  const frame = {
    borderColor: palette.border,
    backgroundColor: task ? palette.surface : palette.background,
  };
  return task ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={task.title}
      accessibilityHint={`${values[1]}. Owner: ${values[2]}. Due date: ${values[3]}. Office: ${values[4]}. Opens task details.`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        frame,
        pressed && { backgroundColor: palette.primarySoft },
      ]}
    >
      {row}
    </Pressable>
  ) : (
    <View style={[styles.row, frame, header && styles.header]}>{row}</View>
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
  cell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
