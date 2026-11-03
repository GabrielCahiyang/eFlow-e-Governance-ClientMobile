import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { Pressable, View } from "./Primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import CheckCircle from "lucide-react-native/icons/circle-check-big";
import Info from "lucide-react-native/icons/info";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import X from "lucide-react-native/icons/x";
import { MotionView } from "../../shared/motion";
import { Text } from "./Typography";
import { colors } from "./theme";
type Tone = "success" | "error" | "warning" | "info";
type Item = { id: number; message: string; type: Tone };
const Context = createContext({
  toast: (_message: string, _type: Tone = "info") => {},
});
export const useToast = () => useContext(Context);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]),
    serial = useRef(0),
    insets = useSafeAreaInsets();
  const toast = useCallback((message: string, type: Tone = "info") => {
    setItems((old) => [...old, { id: ++serial.current, message, type }]);
    AccessibilityInfo.announceForAccessibility(message);
  }, []);
  const remove = useCallback(
    (id: number) => setItems((old) => old.filter((t) => t.id !== id)),
    [],
  );
  return (
    <Context.Provider value={{ toast }}>
      {children}
      <View
        pointerEvents="box-none"
        style={[s.stack, { top: insets.top + 16 }]}
      >
        {items.map((item) => (
          <ToastItem key={item.id} item={item} remove={remove} />
        ))}
      </View>
    </Context.Provider>
  );
}
function ToastItem({
  item,
  remove,
}: {
  item: Item;
  remove: (id: number) => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => remove(item.id), 4000);
    return () => clearTimeout(timeout);
  }, [item.id, remove]);
  const color =
    item.type === "error"
      ? colors.danger
      : item.type === "warning"
        ? colors.warning
        : item.type === "success"
          ? colors.success
          : colors.primary;
  const Icon =
    item.type === "error"
      ? AlertCircle
      : item.type === "warning"
        ? TriangleAlert
        : item.type === "success"
          ? CheckCircle
          : Info;
  return (
    <MotionView kind="toast">
      <View
        accessibilityRole={item.type === "error" ? "alert" : undefined}
        style={[s.toast, { borderColor: color }]}
      >
        <Icon color={color} size={18} />
        <Text style={s.message}>{item.message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={() => remove(item.id)}
          hitSlop={10}
        >
          <X size={16} color={colors.muted} />
        </Pressable>
      </View>
    </MotionView>
  );
}
const s = StyleSheet.create({
  stack: {
    position: "absolute",
    right: 16,
    left: 16,
    zIndex: 1000,
    gap: 8,
    alignItems: "flex-end",
  },
  toast: {
    width: "100%",
    maxWidth: 390,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  message: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
});
