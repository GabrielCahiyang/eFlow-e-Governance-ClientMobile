import { Text } from "./Typography";
import type { ReactNode } from "react";
import {
  RefreshControl,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ScrollView, View } from "./Primitives";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import Inbox from "lucide-react-native/icons/inbox";
import { colors } from "./theme";
import { Button } from "./Button";
import { ViewLoadingState } from "./loading/ViewLoadingState";
export function Screen({
  title,
  description,
  actions,
  children,
  onRefresh,
  refreshing,
  style,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[s.content, style]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {!!title && (
        <View style={s.header}>
          <View style={s.heading}>
            <Text accessibilityRole="header" style={s.title}>
              {title}
            </Text>
            {!!description && <Text style={s.description}>{description}</Text>}
          </View>
          {actions}
        </View>
      )}
      {children}
    </ScrollView>
  );
}
export function Card({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.card, style]}>
      {!!title && (
        <Text accessibilityRole="header" style={s.cardTitle}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}
export function Loading({
  label = "Getting things done",
}: {
  label?: string;
}) {
  return <ViewLoadingState label={label} />;
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "This view could not load. Please try again.";
  return (
    <View accessibilityRole="alert" style={s.error}>
      <AlertCircle size={20} color={colors.danger} />
      <Text style={s.errorText}>{message}</Text>
      {!!retry && (
        <Button variant="outline" onPress={retry}>
          Retry
        </Button>
      )}
    </View>
  );
}
export function Empty({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <Inbox color={colors.primary} size={34} />
      <Text style={s.cardTitle}>{title}</Text>
      {!!description && (
        <Text style={[s.description, { textAlign: "center" }]}>
          {description}
        </Text>
      )}
      {action}
    </View>
  );
}
export function LabelValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={s.labelValue}>
      <Text style={s.description}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={s.value}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={s.notice}>
      <Text style={s.description}>{children}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 36,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  heading: { flex: 1, minWidth: 190, gap: 6 },
  title: { fontSize: 25, fontWeight: "700", color: colors.text },
  description: { fontSize: 13, lineHeight: 20, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  empty: {
    padding: 28,
    gap: 14,
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
  },
  error: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f2b8c2",
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  labelValue: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
  },
  notice: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 14,
  },
});
