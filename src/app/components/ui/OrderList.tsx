import { useEffect, useRef, useState } from "react";
import { PanResponder } from "react-native";
import { View } from "./Primitives";
import { Button, Row } from "./index";
import { Text } from "./Typography";
export function OrderList({
  items,
  onSave,
  busy = false,
}: {
  items: { id: string; label: string }[];
  onSave: (ids: string[]) => Promise<unknown>;
  busy?: boolean;
}) {
  const [order, setOrder] = useState(items),
    [drag, setDrag] = useState<string>(),
    [offset, setOffset] = useState(0);
  const state = useRef({ order, drag, offset });
  state.current = { order, drag, offset };
  useEffect(() => {
    setOrder(items);
  }, [items.map((i) => i.id).join("|")]);
  const move = (id: string, delta: number) =>
    setOrder((previous) => {
      const next = [...previous],
        from = next.findIndex((i) => i.id === id),
        to = Math.max(0, Math.min(next.length - 1, from + delta));
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => !!state.current.drag,
      onPanResponderMove: (_, gesture) => setOffset(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        const id = state.current.drag;
        if (id) move(id, Math.round(gesture.dy / 76));
        setDrag(undefined);
        setOffset(0);
      },
      onPanResponderTerminate: () => {
        setDrag(undefined);
        setOffset(0);
      },
    }),
  ).current;
  return (
    <View {...responder.panHandlers} style={{ gap: 8 }}>
      {order.map((item, index) => (
        <View
          key={item.id}
          style={{
            height: 68,
            justifyContent: "center",
            padding: 8,
            borderWidth: 1,
            borderColor: drag === item.id ? "#0c6f6b" : "#d7dfdf",
            borderRadius: 10,
            transform: [{ translateY: drag === item.id ? offset : 0 }],
            zIndex: drag === item.id ? 2 : 0,
          }}
        >
          <Row>
            <Text style={{ flex: 1 }} numberOfLines={2}>
              {index + 1}. {item.label}
            </Text>
            <Button
              variant="ghost"
              disabled={busy}
              onLongPress={() => setDrag(item.id)}
              onPress={() => setDrag(drag === item.id ? undefined : item.id)}
              accessibilityLabel={"Drag " + item.label}
            >
              ↕
            </Button>
            <Button
              variant="ghost"
              disabled={busy || index === 0}
              onPress={() => move(item.id, -1)}
              accessibilityLabel={"Move " + item.label + " up"}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              disabled={busy || index === order.length - 1}
              onPress={() => move(item.id, 1)}
              accessibilityLabel={"Move " + item.label + " down"}
            >
              ↓
            </Button>
          </Row>
        </View>
      ))}
      <Text>
        Hold the handle and drag, or use the arrow buttons. Save to apply this
        order.
      </Text>
      <Button busy={busy} onPress={() => void onSave(order.map((i) => i.id))}>
        Save order
      </Button>
    </View>
  );
}
