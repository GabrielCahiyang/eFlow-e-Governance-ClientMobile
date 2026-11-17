import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Clock from "lucide-react-native/icons/clock";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import { Card, PageHeader } from "../../components/ui";
import { FilterChip } from "../../components/ui/FilterChip";
import { SearchField } from "../../components/ui/Fields";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { withOpacity } from "../../components/ui/theme";

export type ReviewKind = "all" | "task" | "subtask" | "personal" | "financial";

export const reviewKinds: { kind: ReviewKind; label: string }[] = [
  { kind: "all", label: "All" },
  { kind: "task", label: "Tasks" },
  { kind: "subtask", label: "Subtasks" },
  { kind: "personal", label: "Personal" },
  { kind: "financial", label: "Financial" },
];

export type DecisionItem = {
  key: string;
  kind: Exclude<ReviewKind, "all">;
  title: string;
  context: string;
  cashBlocked?: boolean;
};

export function ReviewsHeader({
  totalCount,
  showBack,
  onBack,
}: {
  totalCount: number;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <PageHeader
      title="Reviews"
      subtitle={
        totalCount === 0
          ? "All assigned reviews handled"
          : `${totalCount} ${totalCount === 1 ? "decision" : "decisions"} awaiting your check`
      }
      onBack={showBack ? onBack : undefined}
      backHint="Returns to Home"
    />
  );
}

export function ReviewsSummaryHero({ items }: { items: DecisionItem[] }) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.35 || width < 320;

  const taskCount = items.filter((d) => d.kind === "task").length;
  const subtaskCount = items.filter((d) => d.kind === "subtask").length;
  const personalCount = items.filter((d) => d.kind === "personal").length;
  const workCount = taskCount + subtaskCount + personalCount;
  const financialCount = items.filter((d) => d.kind === "financial").length;

  const workParts = [
    taskCount ? `${taskCount} ${taskCount === 1 ? "task" : "tasks"}` : null,
    subtaskCount ? `${subtaskCount} ${subtaskCount === 1 ? "subtask" : "subtasks"}` : null,
    personalCount ? `${personalCount} personal` : null,
  ].filter(Boolean);

  return (
    <LinearGradient
      colors={[palette.heroStart, palette.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        s.heroCard,
        {
          borderColor: isDark
            ? withOpacity(palette.primary, 0.28)
            : "rgba(148, 186, 255, 0.24)",
        },
      ]}
    >
      <View style={[s.heroSplit, stacked && s.heroStacked]}>
        <View style={s.heroCol}>
          <Text style={s.heroK}>WORK REVIEWS</Text>
          <Text style={s.heroV}>{workCount}</Text>
          <Text style={s.heroSub}>
            {workParts.length ? workParts.join(" · ") : "Nothing pending"}
          </Text>
        </View>
        <View style={stacked ? s.heroDividerHorizontal : s.heroDivider} />
        <View style={s.heroCol}>
          <Text style={s.heroK}>FINANCIAL REVIEWS</Text>
          <Text style={s.heroV}>{financialCount}</Text>
          <Text style={s.heroSub}>
            {financialCount === 0
              ? "None pending"
              : `${financialCount} ${financialCount === 1 ? "receipt package" : "receipt packages"}`}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export function ReviewsFilterBar({
  items,
  reviewKind,
  onSelectKind,
  searchText,
  onChangeSearch,
}: {
  items: DecisionItem[];
  reviewKind: ReviewKind;
  onSelectKind: (kind: ReviewKind) => void;
  searchText: string;
  onChangeSearch: (text: string) => void;
}) {
  const countFor = (kind: ReviewKind) =>
    kind === "all" ? items.length : items.filter((d) => d.kind === kind).length;

  return (
    <View style={s.filterCluster}>
      <SearchField
        value={searchText}
        onChange={onChangeSearch}
        placeholder="Search reviews"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.tabsRow}
      >
        {reviewKinds.map(({ kind, label }) => (
          <FilterChip
            key={kind}
            label={label}
            count={countFor(kind)}
            showZeroCount
            selected={reviewKind === kind}
            accessibilityLabel={kind === "all" ? "All reviews" : `${label} reviews`}
            onPress={() => onSelectKind(kind)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ReviewKindPill({
  kind,
  cashBlocked,
}: {
  kind: DecisionItem["kind"];
  cashBlocked?: boolean;
}) {
  const palette = useTheme();
  if (cashBlocked) {
    return (
      <View
        style={[
          s.catPill,
          { backgroundColor: palette.warningSoft },
        ]}
      >
        <Clock size={11} color={palette.warning} />
        <Text style={[s.catText, { color: palette.warning }]}>
          Waiting cash
        </Text>
      </View>
    );
  }
  const spec =
    kind === "financial"
      ? { label: "Financial", bg: palette.successSoft, fg: palette.success, Icon: ShieldCheck }
      : kind === "personal"
        ? { label: "Personal", bg: palette.blueSoft, fg: palette.blue, Icon: undefined }
        : {
            label: kind === "subtask" ? "Subtask" : "Task",
            bg: palette.reviewSoft,
            fg: palette.review,
            Icon: undefined,
          };
  return (
    <View style={[s.catPill, { backgroundColor: spec.bg }]}>
      {spec.Icon && <spec.Icon size={11} color={spec.fg} />}
      <Text style={[s.catText, { color: spec.fg }]}>{spec.label}</Text>
    </View>
  );
}

export function ReviewsQueueCard<T extends DecisionItem>({
  items,
  onOpen,
}: {
  items: T[];
  onOpen: (item: T) => void;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const insetBg = isDark ? withOpacity(palette.background, 0.72) : "#f7f9fd";

  return (
    <Card
      title="Awaiting your review"
      icon={<ClipboardCheck size={16} color={palette.primary} />}
      badge={`${items.length} pending`}
    >
      <View style={s.rowsList}>
        {items.map((decision) => (
          <Pressable
            key={decision.key}
            accessibilityRole="button"
            accessibilityLabel={decision.title}
            accessibilityHint={decision.context}
            onPress={() => onOpen(decision)}
            style={({ pressed }) => [
              s.insetRow,
              {
                backgroundColor: pressed ? palette.primarySoft : insetBg,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={s.rowLine1}>
              <Text style={[s.rowTitle, { color: palette.text }]}>
                {decision.title}
              </Text>
              <ChevronRight size={16} color={palette.mutedLabel} />
            </View>
            <View style={s.rowLine2}>
              <Text style={[s.rowCtx, { color: palette.mutedLabel }]}>
                {decision.context}
              </Text>
              <ReviewKindPill
                kind={decision.kind}
                cashBlocked={decision.cashBlocked}
              />
            </View>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
  },
  heroSplit: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  heroStacked: {
    flexDirection: "column",
  },
  heroCol: {
    flex: 1,
    minWidth: 0,
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroDividerHorizontal: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroK: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: "rgba(219, 234, 254, 0.78)",
  },
  heroV: {
    fontSize: 21,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  heroSub: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "rgba(219, 234, 254, 0.82)",
    marginTop: 2,
  },
  filterCluster: {
    gap: 9,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 1,
  },
  rowsList: {
    gap: 8,
  },
  insetRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 7,
  },
  rowLine1: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  rowLine2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  rowCtx: {
    flex: 1,
    minWidth: 130,
    fontSize: 12.5,
    lineHeight: 17,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  catText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
});
