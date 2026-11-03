import { useEffect, useRef, useState, type ComponentRef } from "react";
import {StyleSheet,useWindowDimensions} from "react-native";
import {ScrollView,View,Pressable} from '../../components/ui/Primitives';
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Text } from "../../components/ui/Typography";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { Choice, Sheet } from "../../components/ui";
import { loginMotion, useMotionPreferences } from "../../shared/motion";
import {
  cyclePreview,
  initialPreview,
  movePreview,
  previewColumns,
  type Column,
  type PreviewCard,
} from "./previewModel";

export function LivingBoard() {
  const { reduced, active } = useMotionPreferences(),
    { width, height } = useWindowDimensions();
  const [cards, setCards] = useState(initialPreview),
    [selected, setSelected] = useState<string>();
  const board = useRef<ComponentRef<typeof View>>(null),
    box = useRef({ x: 0, width: width - 40 }),
    lastInteraction = useRef(0),
    dragging = useRef(false),
    step = useRef(0),
    picks = useRef<Record<Column, number>>({
      todo: 0,
      in_progress: 0,
      done: 0,
    });
  useEffect(() => {
    if (reduced || !active) return;
    const tick = setInterval(() => {
      if (dragging.current || Date.now() - lastInteraction.current < 2000)
        return;
      setCards((old) => {
        const next = cyclePreview(old, step.current, picks.current);
        step.current = next.step;
        picks.current = next.picks;
        return next.cards;
      });
    }, 3000);
    return () => clearInterval(tick);
  }, [reduced, active]);
  const move = (id: string, col: Column) => {
    lastInteraction.current = Date.now();
    setCards((old) => movePreview(old, id, col));
  };
  const drag = (value: boolean) => {
    dragging.current = value;
    lastInteraction.current = Date.now();
  };
  const drop = (id: string, x: number) => {
    drag(false);
    const position = Math.max(
      0,
      Math.min(2, Math.floor((x - box.current.x) / (box.current.width / 3))),
    );
    move(id, previewColumns[position].id);
  };
  const measure = () =>
    board.current?.measureInWindow((x, _y, w) => {
      box.current = { x, width: w };
    });
  return (
    <>
      <View
        ref={board}
        onLayout={measure}
        style={[
          s.board,
          width < 768 && { padding: 8, gap: 6, height: 360, borderRadius: 14 },
          !reduced &&
            width >= 768 && {
              transform: [
                { perspective: 1400 },
                { rotateX: "4deg" },
                { rotateY: "-4deg" },
              ],
            },
        ]}
      >
        {previewColumns.map((column) => (
          <View
            key={column.id}
            style={[
              s.column,
              width < 768 && {
                paddingHorizontal: 5,
                paddingVertical: 7,
                borderRadius: 9,
              },
            ]}
          >
            <View
              style={[
                s.columnHeader,
                width < 768 && { gap: 2, paddingBottom: 6, paddingTop: 0 },
              ]}
            >
              <Text
                style={[
                  s.columnTitle,
                  width < 768 && {
                    fontSize: Math.max(7, Math.min(10, width * 0.0235)),
                    lineHeight: 12,
                  },
                ]}
              >
                {column.label}
              </Text>
              <Text
                style={[
                  s.count,
                  width < 768 && {
                    fontSize: 9,
                    paddingHorizontal: 3,
                    paddingVertical: 0,
                    minWidth: 16,
                    height: 16,
                    textAlign: "center",
                    lineHeight: 16,
                  },
                ]}
              >
                {cards.filter((c) => c.columnId === column.id).length}
              </Text>
            </View>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                gap: width < 768 ? 6 : 10,
                paddingBottom: 12,
              }}
            >
              {cards
                .filter((c) => c.columnId === column.id)
                .map((card) => (
                  <PreviewTile
                    key={card.id}
                    card={card}
                    drag={drag}
                    drop={drop}
                    onSelect={() => setSelected(card.id)}
                    small={width < 768}
                  />
                ))}
            </ScrollView>
          </View>
        ))}
      </View>
      <Text style={s.hint}>Drag cards to explore the workflow.</Text>
      <Sheet
        open={!!selected}
        title="Move preview card"
        description="This demonstration does not change project work."
        onClose={() => setSelected(undefined)}
      >
        <Choice
          label="Column"
          value={cards.find((c) => c.id === selected)?.columnId || "todo"}
          options={previewColumns.map((c) => ({ value: c.id, label: c.label }))}
          onChange={(col: Column) => {
            if (selected) move(selected, col);
            setSelected(undefined);
          }}
        />
      </Sheet>
    </>
  );
}
function PreviewTile({
  card,
  drag,
  drop,
  onSelect,
  small,
}: {
  card: PreviewCard;
  drag: (value: boolean) => void;
  drop: (id: string, x: number) => void;
  onSelect: () => void;
  small: boolean;
}) {
  const { reduced } = useMotionPreferences(),
    x = useSharedValue(0),
    y = useSharedValue(0),
    held = useSharedValue(false);
  const gesture = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      held.value = true;
      runOnJS(drag)(true);
    })
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = event.translationY;
    })
    .onEnd((event) => {
      runOnJS(drop)(card.id, event.absoluteX);
    })
    .onFinalize(() => {
      held.value = false;
      x.value = withSpring(0, loginMotion.drift);
      y.value = withSpring(0, loginMotion.drift);
      runOnJS(drag)(false);
    });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: reduced ? 1 : held.value ? 1.03 : 1 },
    ],
    zIndex: held.value ? 20 : 0,
    opacity: held.value ? 0.92 : 1,
  }));
  return (
    <GestureDetector gesture={gesture}>
      <AnimatedPressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${card.title}, ${card.statusLabel}. Choose column.`}
        accessibilityActions={[{ name: "activate", label: "Choose column" }]}
        onAccessibilityAction={onSelect}
        onPress={onSelect}
        onTouchStart={() => drag(true)}
        onTouchEnd={() => drag(false)}
        onTouchCancel={() => drag(false)}
        layout={
          reduced
            ? undefined
            : LinearTransition.springify()
                .stiffness(loginMotion.drift.stiffness)
                .damping(loginMotion.drift.damping)
        }
        style={[
          s.card,
          { borderLeftColor: card.borderColor },
          small && {
            paddingHorizontal: 4,
            paddingVertical: 6,
            borderLeftWidth: 3,
            borderRadius: 7,
            gap: 5,
          },
          style,
        ]}
      >
        <Text
          numberOfLines={3}
          style={[s.cardTitle, small && { fontSize: 10, lineHeight: 12 }]}
        >
          {card.title}
        </Text>
        <View style={s.avatars}>
          {card.avatars.map((initial, i) => (
            <Text
              key={initial}
              style={[
                s.avatar,
                small && {
                  width: 17,
                  height: 17,
                  padding: 0,
                  fontSize: 6,
                  lineHeight: 17,
                  textAlign: "center",
                },
                { backgroundColor: ["#e0e7ff", "#dbeafe", "#fce7f3"][i % 3] },
              ]}
            >
              {initial}
            </Text>
          ))}
        </View>
        <Text
          style={[
            s.status,
            { color: card.statusColor },
            small && {
              fontSize: 7,
              lineHeight: 9,
              paddingHorizontal: 3,
              paddingVertical: 2,
              borderRadius: 4,
              alignSelf: "flex-start",
              backgroundColor: card.statusColor + "1a",
            },
          ]}
        >
          {card.statusLabel}
        </Text>
        <View style={s.track}>
          <View
            style={{
              height: 4,
              borderRadius: 4,
              width: `${card.progress * 100}%`,
              backgroundColor: card.statusColor,
            }}
          />
        </View>
      </AnimatedPressable>
    </GestureDetector>
  );
}
const s = StyleSheet.create({
  board: {
    width: "100%",
    maxWidth: 960,
    height: 490,
    flexDirection: "row",
    gap: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ffffff59",
    borderRadius: 20,
    backgroundColor: "#ffffff2e",
    overflow: "visible",
  },
  column: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    padding: 8,
    backgroundColor: "#ffffffdf",
    gap: 12,
  },
  columnHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  columnTitle: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  count: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    color: "#0f172a",
  },
  avatars: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  avatar: { fontSize: 10, padding: 5, borderRadius: 20, color: "#334155" },
  status: { fontSize: 12, fontWeight: "600" },
  track: {
    height: 4,
    borderRadius: 4,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  hint: {
    fontSize: 12,
    color: "#ffffffe6",
    textAlign: "center",
    marginTop: 12,
  },
});
