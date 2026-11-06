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
import { EmptyIllustration, type EmptyKind } from "./EmptyIllustration";
import { colors } from "./theme";
import { Button } from "./Button";
import {
  ViewLoadingState,
  type LoadingLayout,
} from "./loading/ViewLoadingState";
import { useTheme } from "./Appearance";
import { usePullRefresh } from "../../shared/usePullRefresh";
import {
  userErrorMessage,
  type FeedbackContext,
} from "../../shared/userMessages";
export function Screen({
  title,
  description,
  actions,
  children,
  onRefresh,
  style,
  compact = false,
  footer,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  onRefresh?: () => Promise<unknown>;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  footer?: ReactNode;
}) {
  const palette = useTheme();
  const pull = usePullRefresh(onRefresh);
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: palette.background }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.content,
          compact && s.compact,
          { backgroundColor: palette.background },
          style,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={pull.refreshing}
              onRefresh={pull.refresh}
              tintColor={palette.primary}
            />
          ) : undefined
        }
      >
        {!!title && (
          <View style={s.header}>
            <View style={s.heading}>
              <Text
                accessibilityRole="header"
                style={[s.title, compact && s.compactTitle]}
              >
                {title}
              </Text>
              {!!description && (
                <Text style={s.description}>{description}</Text>
              )}
            </View>
            {actions}
          </View>
        )}
        {!!pull.error && (
          <ErrorState error={pull.error} retry={() => void pull.refresh()} />
        )}
        {children}
      </ScrollView>
      {footer}
    </View>
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
  label = "Loading content",
  layout = "navigation",
  rows,
}: {
  label?: string;
  layout?: LoadingLayout;
  rows?: number;
}) {
  return <ViewLoadingState label={label} layout={layout} rows={rows} />;
}
export function ErrorState({
  error,
  retry,
  context = "load",
}: {
  error: unknown;
  retry?: () => void;
  context?: FeedbackContext;
}) {
  const palette = useTheme();
  const message = userErrorMessage(error, context);
  return (
    <View accessibilityRole="alert" style={s.error}>
      <AlertCircle size={20} color={palette.danger} />
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
  compact = false,
  kind = "work",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  kind?: EmptyKind;
}) {
  const palette = useTheme();
  return (
    <View
      style={[
        compact ? s.compactEmpty : s.empty,
        { backgroundColor: "transparent" },
      ]}
    >
      <EmptyIllustration kind={kind} compact={compact} />
      <Text
        accessibilityRole="header"
        style={[
          s.cardTitle,
          {
            textAlign: "center",
            color: palette.text,
            fontSize: compact ? 16 : 20,
          },
        ]}
      >
        {title}
      </Text>
      {!!description && (
        <Text
          style={[
            s.description,
            { textAlign: "center", maxWidth: 340, color: palette.mutedLabel },
          ]}
        >
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
  compact: { gap: 10, paddingTop: 10, paddingBottom: 24 },
  compactTitle: { fontSize: 21, lineHeight: 28 },
  compactEmpty: { gap: 8, paddingVertical: 12, alignItems: "center" },
  heading: { flex: 1, minWidth: 190, gap: 6 },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "600",
    color: colors.text,
  },
  description: { fontSize: 13, lineHeight: 20, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 32,
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
