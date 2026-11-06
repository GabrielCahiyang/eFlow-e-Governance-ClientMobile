import { StyleSheet, View } from "react-native";
import { useTheme } from "../Appearance";
import { SkeletonBlock as Block, SkeletonPulse } from "./Skeleton";

export type LoadingLayout =
  | "navigation"
  | "recent"
  | "projects"
  | "work"
  | "workList"
  | "inbox"
  | "project"
  | "personalProject"
  | "task"
  | "tree"
  | "summary"
  | "request"
  | "review"
  | "activity"
  | "messages"
  | "announcements"
  | "people"
  | "files"
  | "form"
  | "verification";

/** Shapes belong to the replaced content region; existing headings/filters stay mounted. */
export function ViewLoadingState({
  label = "Loading content",
  layout = "navigation",
  rows = 3,
}: {
  label?: string;
  layout?: LoadingLayout;
  rows?: number;
}) {
  const palette = useTheme();
  const line = (width: `${number}%` = "70%", height = 14) => (
    <Block style={{ width, height, borderRadius: 4 }} />
  );
  const panel = (children: React.ReactNode, key?: number) => (
    <View
      key={key}
      style={[
        s.panel,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {children}
    </View>
  );
  const pairs = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <View key={i} style={s.pair}>
        {line("44%", 12)}
        {line("28%", 12)}
      </View>
    ));
  const chips = (
    <View style={s.row}>
      <Block style={s.chip} />
      <Block style={[s.chip, { width: 82 }]} />
    </View>
  );
  const workRow = (i: number) => (
    <View
      key={i}
      style={[
        s.work,
        {
          borderBottomWidth: i === rows - 1 ? 0 : 0.5,
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
    >
      <Block style={s.stripe} />
      <View style={s.workContent}>
        {line("76%", 16)}
        {line("56%", 12)}
        {chips}
      </View>
      <Block style={s.chevron} />
    </View>
  );
  const navRows = (icon: boolean, boxed: boolean) =>
    Array.from({ length: rows }, (_, i) => (
      <View
        key={i}
        style={[
          s.nav,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderWidth: boxed ? 1 : 0,
            borderBottomWidth: boxed ? 1 : 0.5,
            borderRadius: boxed ? 14 : 0,
            marginBottom: boxed ? 8 : 0,
          },
        ]}
      >
        {icon && <Block style={s.icon} />}
        <View style={s.navCopy}>
          {line("72%", 15)}
          {line("56%", 12)}
        </View>
        <Block style={s.chevron} />
      </View>
    ));
  let content;
  switch (layout) {
    case "work":
      content = (
        <>
          <View style={s.row}>
            <Block style={{ width: 6, height: 18 }} />
            {line("38%", 17)}
            <Block style={s.chip} />
          </View>
          <View
            style={[
              s.table,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {Array.from({ length: rows }, (_, i) => workRow(i))}
          </View>
        </>
      );
      break;
    case "workList":
      content = (
        <>
          <View style={s.row}>
            <Block style={{ width: 6, height: 18 }} />
            {line("38%", 17)}
            <Block style={s.chip} />
          </View>
          <View style={{ gap: 6 }}>
            {Array.from({ length: rows }, (_, i) => workRow(i))}
          </View>
        </>
      );
      break;
    case "recent":
      content = (
        <>
          {Array.from({ length: rows }, (_, i) => (
            <View
              key={i}
              style={[s.row, { paddingVertical: 12, flexWrap: "nowrap" }]}
            >
              <Block style={{ width: 44, height: 44, borderRadius: 14 }} />
              <View style={s.navCopy}>
                {line("65%", 15)}
                {line("45%", 12)}
              </View>
            </View>
          ))}
        </>
      );
      break;
    case "projects":
      content = (
        <>
          {line("42%", 17)}
          {navRows(true, true)}
        </>
      );
      break;
    case "inbox":
    case "announcements":
      content = (
        <>
          {Array.from({ length: rows }, (_, i) =>
            panel(
              <>
                {layout === "inbox" && chips}
                {line("76%", 16)}
                {line("94%")}
                {line("64%", 12)}
                {layout === "inbox" && <Block style={s.button} />}
              </>,
              i,
            ),
          )}
        </>
      );
      break;
    case "project":
    case "personalProject":
      content = (
        <>
          {line("78%", 26)}
          {panel(
            <>
              {chips}
              {pairs(2)}
              <Block style={{ height: 6 }} />
            </>,
          )}
          <Block style={s.button} />
          <View style={s.row}>
            {[0, 1, 2].map((i) => (
              <Block key={i} style={[s.chip, { width: 76, height: 36 }]} />
            ))}
          </View>
          <Block style={{ height: 44 }} />
          {layout === "project" ? (
            <View style={[s.table, { borderColor: palette.border }]}>
              {Array.from({ length: rows }, (_, i) => workRow(i))}
            </View>
          ) : (
            navRows(false, false)
          )}
        </>
      );
      break;
    case "task":
      content = (
        <>
          {line("84%", 26)}
          {chips}
          <Block style={s.button} />
          {panel(
            <>
              {line("36%", 17)}
              {navRows(false, false)}
            </>,
          )}
          {panel(
            <>
              {line("54%", 17)}
              {pairs(4)}
            </>,
          )}
        </>
      );
      break;
    case "tree":
      content = panel(
        <>
          {line("44%", 17)}
          {Array.from({ length: rows }, (_, i) => (
            <View key={i} style={{ marginLeft: i ? 16 : 0 }}>
              {navRows(false, false).slice(i, i + 1)}
            </View>
          ))}
        </>,
      );
      break;
    case "summary":
      content = <>{pairs(rows)}</>;
      break;
    case "request":
    case "review":
      content = panel(
        <>
          {line("70%", 17)}
          {chips}
          {pairs(layout === "request" ? 5 : 2)}
          {layout === "review" &&
            panel(
              <>
                {line("52%", 17)}
                {pairs(3)}
                <Block style={s.button} />
              </>,
            )}
          <Block style={{ height: 56 }} />
          <Block style={s.button} />
        </>,
      );
      break;
    case "messages":
    case "activity":
      content = (
        <>
          {Array.from({ length: rows }, (_, i) => (
            <View key={i} style={[s.entry, { borderColor: palette.border }]}>
              {line("42%", 14)}
              {layout === "activity" && (
                <View style={s.pair}>
                  {line("30%", 12)}
                  {line("32%", 12)}
                </View>
              )}
              {line(i % 2 ? "72%" : "94%")}
              {layout === "messages" && line("34%", 12)}
            </View>
          ))}
        </>
      );
      break;
    case "form":
      content = (
        <>
          {Array.from({ length: rows }, (_, i) => (
            <View key={i} style={{ gap: 8 }}>
              {line("42%", 12)}
              <Block style={{ height: 64, borderRadius: 8 }} />
            </View>
          ))}
        </>
      );
      break;
    case "verification":
      content = (
        <View style={s.row}>
          <Block style={{ width: 18, height: 18, borderRadius: 9 }} />
          {line("68%", 13)}
        </View>
      );
      break;
    case "people":
      content = (
        <>
          {Array.from({ length: rows }, (_, i) => (
            <View key={i} style={s.row}>
              <View style={s.navCopy}>
                {line("90%", 14)}
                {line("65%", 12)}
              </View>
              <Block style={s.chip} />
            </View>
          ))}
        </>
      );
      break;
    case "files":
      content = <>{navRows(false, false)}</>;
      break;
    default:
      content = <>{navRows(false, false)}</>;
  }
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      testID={`skeleton-${layout}`}
      style={s.root}
    >
      <SkeletonPulse style={{ gap: 12 }}>{content}</SkeletonPulse>
    </View>
  );
}
const s = StyleSheet.create({
  root: { width: "100%" },
  panel: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  pair: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 4,
  },
  table: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  work: { flexDirection: "row", alignItems: "center", minHeight: 104 },
  stripe: { width: 5, alignSelf: "stretch", height: "100%", borderRadius: 0 },
  workContent: { flex: 1, padding: 12, gap: 6 },
  chip: { height: 24, width: 60, borderRadius: 6 },
  chevron: { width: 8, height: 12, marginRight: 12, borderRadius: 4 },
  nav: {
    minHeight: 76,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  navCopy: { flex: 1, gap: 7 },
  icon: { width: 36, height: 36, borderRadius: 10 },
  button: { height: 42, width: 160, maxWidth: "100%" },
  entry: { gap: 8, paddingVertical: 12, borderBottomWidth: 0.5 },
});
