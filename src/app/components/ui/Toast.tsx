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
import Bell from "lucide-react-native/icons/bell";
import CheckCircle from "lucide-react-native/icons/circle-check-big";
import Info from "lucide-react-native/icons/info";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import X from "lucide-react-native/icons/x";
import { MotionView } from "../../shared/motion";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { colors, radius, space, withOpacity } from "./theme";
import { userErrorMessage } from "../../shared/userMessages";

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastIconKind = "auto" | "bell";

export interface ToastOptions {
  title?: string;
  eyebrow?: string;
  icon?: ToastIconKind;
  durationMs?: number;
}

export interface ToastPayload extends ToastOptions {
  message: string;
  type?: ToastType;
}

export type ToastInput = string | ToastPayload;

interface ToastEntry {
  id: string;
  title?: string;
  eyebrow?: string;
  message: string;
  type: ToastType;
  icon: ToastIconKind;
}

interface ToastContextValue {
  toast: (
    input: ToastInput,
    type?: ToastType,
    options?: ToastOptions,
  ) => void;
}

const Context = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(Context);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const insets = useSafeAreaInsets();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  const toast = useCallback(
    (input: ToastInput, typeArg?: ToastType, options?: ToastOptions) => {
      const payload: ToastPayload =
        typeof input === "string"
          ? {
              message: input,
              type: typeArg,
              ...options,
            }
          : {
              ...input,
              type: input.type ?? typeArg,
            };
      const type: ToastType = payload.type ?? "info";
      const safeMessage =
        type === "error"
          ? userErrorMessage(payload.message, "action")
          : payload.message.trim();
      const safeTitle = payload.title?.trim() || undefined;
      const safeEyebrow = payload.eyebrow?.trim() || undefined;
      if (!safeMessage && !safeTitle) return;

      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: ToastEntry = {
        id,
        title: safeTitle,
        eyebrow: safeEyebrow,
        message: safeMessage,
        type,
        icon: payload.icon ?? "auto",
      };

      const announcement = safeTitle
        ? `${safeTitle}. ${safeMessage}`.trim()
        : safeMessage;
      AccessibilityInfo.announceForAccessibility(announcement);

      setToasts((previous) => [...previous.slice(-2), entry]);
      const delay =
        payload.durationMs ??
        (type === "error" || type === "warning" || safeTitle ? 4500 : 3500);
      const timer = setTimeout(() => {
        timers.current.delete(id);
        setToasts((previous) => previous.filter((item) => item.id !== id));
      }, delay);
      timers.current.set(id, timer);
    },
    [],
  );

  return (
    <Context.Provider value={{ toast }}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          styles.stack,
          { top: Math.max(insets.top, space.sm) + space.sm },
        ]}
      >
        {toasts.map((entry) => (
          <ToastItem
            key={entry.id}
            toast={entry}
            onDismiss={() => dismiss(entry.id)}
          />
        ))}
      </View>
    </Context.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: () => void;
}) {
  const palette = useTheme();
  const tone =
    toast.type === "success"
      ? { accent: palette.success, soft: palette.successSoft }
      : toast.type === "error"
        ? { accent: palette.danger, soft: palette.dangerSoft }
        : toast.type === "warning"
          ? { accent: palette.warning, soft: palette.warningSoft }
          : { accent: palette.blue, soft: palette.blueSoft };

  const IconComponent =
    toast.icon === "bell"
      ? Bell
      : toast.type === "success"
        ? CheckCircle
        : toast.type === "error"
          ? AlertCircle
          : toast.type === "warning"
            ? TriangleAlert
            : Info;

  return (
    <MotionView kind="toast" style={styles.cardWrap}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion={
          toast.type === "error" ? "assertive" : "polite"
        }
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={[styles.accentRail, { backgroundColor: tone.accent }]} />
        <View style={styles.body}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: tone.soft,
                borderColor: withOpacity(tone.accent, 0.22),
              },
            ]}
          >
            <IconComponent size={18} color={tone.accent} strokeWidth={2.2} />
          </View>
          <View style={styles.copy}>
            {!!toast.eyebrow && (
              <Text
                style={[
                  styles.eyebrow,
                  { color: tone.accent },
                ]}
              >
                {toast.eyebrow}
              </Text>
            )}
            {toast.title ? (
              <>
                <Text style={[styles.title, { color: palette.text }]}>
                  {toast.title}
                </Text>
                {!!toast.message && (
                  <Text style={[styles.subtitle, { color: palette.muted }]}>
                    {toast.message}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.singleMessage, { color: palette.text }]}>
                {toast.message}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: pressed ? palette.primarySoft : "transparent",
              },
            ]}
          >
            <X size={16} color={palette.mutedLabel} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    zIndex: 9999,
    alignItems: "center",
    gap: space.sm,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 440,
  },
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
    borderRadius: radius.overlay,
    borderWidth: 1,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  accentRail: {
    width: 4,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 11,
    paddingLeft: space.md,
    paddingRight: space.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.surface,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.75,
    textTransform: "uppercase",
    lineHeight: 13,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  singleMessage: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
