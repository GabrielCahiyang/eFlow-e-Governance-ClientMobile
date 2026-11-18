import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import { brandColors, Empty, SearchField, Sheet, withOpacity } from "../../components/ui";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { parseMessage } from "../../../core/web/app/features/chat-calls/services/chatMessageCodec";
import { ChatAvatar } from "./ChatAvatar";
import {
  conversationFilters,
  conversationKindLabel,
  filterConversations,
  listStamp,
  pinnedConversation,
  type ConversationFilter,
} from "./chatPresentation";
import type { Channel } from "./services";

const QUICK_FILTERS: readonly ConversationFilter[] = [
  "all",
  "unread",
  "groups",
  "people",
  "office",
];

function ConversationSection({
  title,
  count,
  actor,
  items,
  isDark,
  onOpen,
}: {
  title: "Pinned" | "Conversations";
  count: number;
  actor: string;
  items: Channel[];
  isDark: boolean;
  onOpen: (channel: Channel) => void;
}) {
  const palette = useTheme();
  const surfaceInset = isDark ? palette.background : "#f7f9fd";

  return (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text
          accessibilityRole="header"
          style={[s.sectionHeading, { color: palette.mutedLabel }]}
        >
          {title}
        </Text>
        <Text style={[s.sectionCount, { color: palette.mutedLabel }]}>
          {count}
        </Text>
      </View>
      <View
        style={[
          s.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
          !isDark && s.cardShadow,
        ]}
      >
        {items.map((item, index) => {
          const unread = !!item.unread && !item.archived;
          const pinned = pinnedConversation(item);
          const stamp = listStamp(item.lastMessageAt);
          const preview = item.lastMessage
            ? parseMessage(item.lastMessage).text
            : "No messages yet";
          const contextText =
            item.kind === "task"
              ? `Task chat${item.projectTitle ? " · " + item.projectTitle : ""}`
              : item.kind === "project"
                ? `Project chat${item.defaultName && item.defaultName !== item.name ? " · " + item.defaultName : ""}`
                : undefined;

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}. ${
                unread ? "Unread. " : ""
              }${conversationKindLabel(item.kind)}${
                item.kind === "task" && item.projectTitle
                  ? " in " + item.projectTitle
                  : ""
              }`}
              onPress={() => onOpen(item)}
              style={({ pressed }) => [
                s.row,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: palette.border,
                },
                unread && {
                  backgroundColor: withOpacity(
                    brandColors.blue,
                    isDark ? 0.08 : 0.035,
                  ),
                },
                pressed && { backgroundColor: palette.primarySoft },
              ]}
            >
              <ChatAvatar
                name={item.name}
                kind={item.kind}
                size={48}
                actor={actor}
                path={item.avatarPath}
                pinned={pinned}
              />
              <View style={s.rowBody}>
                <View style={s.rowTop}>
                  <Text
                    numberOfLines={1}
                    style={[
                      s.rowName,
                      {
                        fontWeight: unread ? "800" : "700",
                        color: palette.text,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {!!stamp && (
                    <Text
                      style={[
                        s.rowStamp,
                        {
                          color: unread ? palette.blue : palette.mutedLabel,
                          fontWeight: unread ? "700" : "600",
                        },
                      ]}
                    >
                      {stamp}
                    </Text>
                  )}
                </View>

                {!!contextText && (
                  <View style={s.ctxWrap}>
                    <View
                      style={[
                        s.ctxPill,
                        {
                          backgroundColor: surfaceInset,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[s.ctxText, { color: palette.mutedLabel }]}
                      >
                        {contextText}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={s.rowBottom}>
                  <Text
                    numberOfLines={1}
                    style={[
                      s.rowPreview,
                      {
                        fontWeight: unread ? "600" : "400",
                        color: unread ? palette.text : palette.muted,
                      },
                    ]}
                  >
                    {preview}
                  </Text>
                  {unread && (
                    <View
                      accessibilityLabel="Unread"
                      style={[s.unreadDot, { backgroundColor: palette.blue }]}
                    />
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ConversationList({
  actor,
  channels,
  allChannels,
  total,
  query,
  onQuery,
  filter,
  onFilter,
  onOpen,
  searchable = true,
}: {
  actor: string;
  channels: Channel[];
  allChannels?: Channel[];
  total: number;
  query: string;
  onQuery: (value: string) => void;
  filter: ConversationFilter;
  onFilter: (value: ConversationFilter) => void;
  onOpen: (channel: Channel) => void;
  searchable?: boolean;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const [filterOpen, setFilterOpen] = useState(false);

  const source = allChannels ?? channels;
  const filterCounts = useMemo(() => {
    const counts = {} as Record<ConversationFilter, number>;
    for (const item of conversationFilters) {
      counts[item.value] = filterConversations(source, item.value, "").length;
    }
    return counts;
  }, [source]);

  const activeFilterOption =
    conversationFilters.find((item) => item.value === filter) ??
    conversationFilters[0];

  const pinned = channels
    .filter(pinnedConversation)
    .sort(
      (a, b) =>
        Number(b.kind === "project") - Number(a.kind === "project") ||
        (b.personalPin ?? "").localeCompare(a.personalPin ?? ""),
    );
  const regular = channels.filter((item) => !pinnedConversation(item));

  return (
    <View style={s.root}>
      {searchable && (
        <View style={s.searchBlock}>
          <SearchField
            value={query}
            onChange={onQuery}
            placeholder="Search conversations"
            accessibilityLabel="Search conversations"
            filterTrigger={{
              label: activeFilterOption.label,
              active: filter !== "all",
              count: filter !== "all" ? 1 : undefined,
              accessibilityLabel: "Filter conversations",
              onPress: () => setFilterOpen(true),
            }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.quickScroll}
          >
            {QUICK_FILTERS.map((key) => {
              const item = conversationFilters.find((f) => f.value === key)!;
              const selected = filter === item.value;
              const count = filterCounts[item.value] ?? 0;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item.label} conversations`}
                  hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                  onPress={() => onFilter(item.value)}
                  style={({ pressed }) => [
                    s.quickPill,
                    {
                      backgroundColor: selected
                        ? palette.primary
                        : pressed
                          ? palette.primarySoft
                          : palette.surface,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.quickPillText,
                      { color: selected ? palette.onPrimary : palette.muted },
                    ]}
                  >
                    {item.value === "all" || item.value === "unread"
                      ? `${item.label} (${count})`
                      : item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!channels.length ? (
        <View
          style={[
            s.emptyCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
            !isDark && s.cardShadow,
          ]}
        >
          <Empty
            compact
            kind={query.trim() || filter !== "all" ? "search" : "chat"}
            title={
              filter === "archive" && !query.trim()
                ? "No archived chats yet"
                : filter === "unread" && !query.trim()
                  ? "No unread conversations"
                  : query.trim() || filter !== "all"
                    ? "No matching conversations"
                    : "No conversations yet"
            }
            description={
              filter === "archive" && !query.trim()
                ? "Completed projects and their task chats appear here."
                : filter === "unread" && !query.trim()
                  ? "You are caught up across your active conversations."
                  : total
                    ? "Try another search or filter."
                    : "Your authorized direct, Office and task conversations appear here."
            }
          />
        </View>
      ) : (
        <View style={s.sections}>
          {pinned.length > 0 && (
            <ConversationSection
              title="Pinned"
              count={pinned.length}
              actor={actor}
              items={pinned}
              isDark={isDark}
              onOpen={onOpen}
            />
          )}
          {regular.length > 0 && (
            <ConversationSection
              title="Conversations"
              count={regular.length}
              actor={actor}
              items={regular}
              isDark={isDark}
              onOpen={onOpen}
            />
          )}
        </View>
      )}

      <Sheet
        open={filterOpen}
        title="Filter conversations"
        onClose={() => setFilterOpen(false)}
      >
        <View
          style={[
            s.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {conversationFilters.map((item, index) => {
            const selected = filter === item.value;
            const count = filterCounts[item.value] ?? 0;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  onFilter(item.value);
                  setFilterOpen(false);
                }}
                style={({ pressed }) => [
                  s.sheetOpt,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: palette.border,
                  },
                  selected && { backgroundColor: palette.primarySoft },
                  pressed &&
                    !selected && {
                      backgroundColor: isDark
                        ? palette.background
                        : "#f7f9fd",
                    },
                ]}
              >
                <View style={s.sheetOptCopy}>
                  <View style={s.sheetOptTitleRow}>
                    <Text
                      style={[
                        s.sheetOptLabel,
                        { color: selected ? palette.primary : palette.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <View
                      style={[
                        s.sheetCountPill,
                        {
                          backgroundColor: selected
                            ? palette.primary
                            : isDark
                              ? palette.background
                              : "#f7f9fd",
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.sheetCountText,
                          {
                            color: selected
                              ? palette.onPrimary
                              : palette.mutedLabel,
                          },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </View>
                  {!!item.description && (
                    <Text
                      style={[s.sheetOptDesc, { color: palette.mutedLabel }]}
                    >
                      {item.description}
                    </Text>
                  )}
                </View>
                {selected && <Check size={18} color={palette.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 14 },
  searchBlock: { gap: 10 },
  quickScroll: { gap: 8, paddingRight: 8 },
  quickPill: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    justifyContent: "center",
  },
  quickPillText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  sections: { gap: 16 },
  section: { gap: 7 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardShadow: {
    shadowColor: brandColors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 15.5,
    lineHeight: 20,
  },
  rowStamp: {
    fontSize: 11.5,
    lineHeight: 15,
    flexShrink: 0,
  },
  ctxWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctxPill: {
    maxWidth: "100%",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 1.5,
  },
  ctxText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowPreview: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  sheetOpt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sheetOptCopy: {
    flex: 1,
    gap: 2,
  },
  sheetOptTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetOptLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  sheetCountPill: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sheetOptDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
