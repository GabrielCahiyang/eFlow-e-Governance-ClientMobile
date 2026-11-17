import { Text } from "./Typography";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactNode,
} from "react";
import {
  StyleSheet,
  useWindowDimensions,
  type FlatListProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ScrollView, View } from "./Primitives";
import Animated from "react-native-reanimated";
import AlertCircle from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import ClockAlert from "lucide-react-native/icons/clock-alert";
import Info from "lucide-react-native/icons/info";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import ShieldAlert from "lucide-react-native/icons/shield-alert";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import WifiOff from "lucide-react-native/icons/wifi-off";
import { EmptyIllustration, type EmptyKind } from "./EmptyIllustration";
import { colors, withOpacity } from "./theme";
import { Button } from "./Button";
import { OperationStatus } from "./OperationStatus";
import {
  ViewLoadingState,
  type LoadingLayout,
} from "./loading/ViewLoadingState";
import { useAppearance, useTheme } from "./Appearance";
import { PageHeader } from "./PageHeader";
import { useNavigationHeader } from "../../features/navigation/navigationHeaderContext";
import { usePullRefresh } from "../../shared/usePullRefresh";
import { FolderPullArea, RefreshFlatList } from "./FolderRefresh";
import {
  feedback,
  userErrorMessage,
  type FeedbackContext,
} from "../../shared/userMessages";

const RefreshScreenScroll = Animated.createAnimatedComponent(ScrollView);

export function Screen<T = never>({
  title,
  description,
  headerRight,
  actions,
  children,
  onRefresh,
  style,
  compact = false,
  footer,
  list,
  edgeToEdge = false,
}: {
  title?: string;
  description?: string;
  headerRight?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  onRefresh?: () => Promise<unknown>;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  footer?: ReactNode;
  /** Content draws under the status bar and handles the top inset itself. */
  edgeToEdge?: boolean;
  list?: Pick<
    FlatListProps<T>,
    | "data"
    | "keyExtractor"
    | "renderItem"
    | "onEndReached"
    | "ListFooterComponent"
  >;
}) {
  const palette = useTheme();
  const navHeader = useNavigationHeader();
  const pull = usePullRefresh(onRefresh);
  const ContentScroll = onRefresh ? RefreshScreenScroll : ScrollView;
  const scrollProps = {
    contentInsetAdjustmentBehavior: edgeToEdge
      ? ("never" as const)
      : ("automatic" as const),
    style: { flex: 1, backgroundColor: palette.background },
    keyboardShouldPersistTaps: "handled" as const,
    contentContainerStyle: [
      s.content,
      compact && s.compact,
      !edgeToEdge &&
        !!navHeader?.topInset && {
          paddingTop: (compact ? 10 : 16) + navHeader.topInset,
        },
      { backgroundColor: palette.background },
      style,
    ],
  };
  const header = (
    <>
      <OperationStatus />
      {!!title && (
        <View style={{ gap: 10 }}>
          <PageHeader title={title} subtitle={description} right={headerRight} />
          {!!actions && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {actions}
            </View>
          )}
        </View>
      )}
      {!!pull.error && (
        <ErrorState error={pull.error} retry={() => void pull.refresh()} />
      )}
      {children}
    </>
  );
  const scroll = list ? (
    <RefreshFlatList
      {...scrollProps}
      {...list}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View style={{ gap: compact ? 10 : 16 }}>{header}</View>
      }
    />
  ) : (
    <ContentScroll {...scrollProps}>{header}</ContentScroll>
  );
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {onRefresh ? (
        <FolderPullArea pull={pull}>{scroll}</FolderPullArea>
      ) : (
        scroll
      )}
      {footer}
    </View>
  );
}
export type CardBadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "review";

export function Card({
  title,
  badge,
  badgeTone = "neutral",
  icon,
  action,
  flat = false,
  children,
  style,
}: {
  title?: string;
  badge?: string;
  badgeTone?: CardBadgeTone;
  icon?: ReactNode;
  action?: ReactNode;
  flat?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const hasHeader = Boolean(title || badge || icon || action);
  const badgeStyle =
    badgeTone === "success"
      ? { backgroundColor: palette.successSoft, textColor: palette.success }
      : badgeTone === "warning"
        ? { backgroundColor: palette.warningSoft, textColor: palette.warning }
        : badgeTone === "info"
          ? { backgroundColor: palette.blueSoft, textColor: palette.blue }
          : badgeTone === "danger"
            ? { backgroundColor: palette.dangerSoft, textColor: palette.danger }
            : badgeTone === "review"
              ? { backgroundColor: palette.reviewSoft, textColor: palette.review }
              : {
                  backgroundColor: palette.primarySoft,
                  textColor: palette.primaryDark,
                };

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: flat ? "transparent" : palette.surface,
          borderColor: flat ? "transparent" : palette.border,
          borderWidth: flat ? 0 : 1,
          padding: flat ? 0 : 16,
        },
        style,
      ]}
    >
      {hasHeader && (
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLead}>
            {!!icon && (
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  s.cardIconChip,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                {icon}
              </View>
            )}
            {!!title && (
              <Text
                accessibilityRole="header"
                style={[
                  s.cardTitle,
                  { color: palette.text },
                  flat && s.cardTitleFlat,
                ]}
              >
                {title}
              </Text>
            )}
          </View>
          {(!!badge || !!action) && (
            <View style={s.cardHeaderTrail}>
              {!!badge && (
                <View
                  style={[
                    s.cardBadge,
                    { backgroundColor: badgeStyle.backgroundColor },
                  ]}
                >
                  <Text
                    style={[s.cardBadgeText, { color: badgeStyle.textColor }]}
                  >
                    {badge}
                  </Text>
                </View>
              )}
              {action}
            </View>
          )}
        </View>
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
function errorMeta(message: string, context: FeedbackContext) {
  if (/^Ask the appointed Task Lead\b/.test(message))
    return { title: "Schedule update needed", Icon: AlertCircle };
  if (message === feedback.invalidCredentials)
    return { title: "Couldn't sign in", Icon: ShieldAlert };
  if (/Connection unavailable/i.test(message))
    return { title: "Connection unavailable", Icon: WifiOff };
  if (/timed? out/i.test(message))
    return { title: "Request timed out", Icon: ClockAlert };
  if (message === feedback.session)
    return { title: "Session expired", Icon: ShieldAlert };
  if (
    /don't have access|permission|Web only|inactive|locked|no longer available/i.test(
      message,
    )
  )
    return { title: "Access notice", Icon: ShieldAlert };
  if (/already saved|changes were saved/i.test(message))
    return { title: "Changes saved", Icon: AlertCircle };
  if (/couldn't confirm/i.test(message))
    return { title: "Check before retrying", Icon: AlertCircle };
  if (/has changed/i.test(message))
    return { title: "Item updated", Icon: AlertCircle };
  if (/the upload stopped before/i.test(message))
    return { title: "Upload interrupted", Icon: AlertCircle };
  if (
    /^(?:Ask the appointed Task Lead|Enter|Choose|Record|Explain|Describe|Use|Passwords|Progress|Actual spending|Attach|Title|Task name|A work note|A review note|Needed-by|Allow camera)\b/i.test(
      message,
    )
  )
    return { title: "Check your details", Icon: AlertCircle };
  if (context === "action")
    return { title: "Couldn't complete this", Icon: AlertCircle };
  return { title: "Unable to load", Icon: AlertCircle };
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
  const { isDark } = useAppearance();
  const message = userErrorMessage(error, context);
  const { title, Icon } = errorMeta(message, context);
  return (
    <View
      style={[
        s.error,
        {
          backgroundColor: isDark ? "#1d1a30" : "#fffafb",
          borderColor: withOpacity(palette.danger, isDark ? 0.32 : 0.2),
        },
      ]}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          s.errorBadge,
          {
            backgroundColor: isDark
              ? withOpacity(palette.danger, 0.18)
              : "#ffffff",
            borderColor: withOpacity(palette.danger, isDark ? 0.32 : 0.22),
          },
          !isDark && s.alertBadgeShadowLight,
        ]}
      >
        <Icon size={18} color={palette.danger} />
      </View>
      <View style={s.errorBody}>
        <View accessible accessibilityRole="alert" style={s.errorCopy}>
          <Text style={[s.errorTitle, { color: palette.text }]}>{title}</Text>
          <Text style={[s.errorText, { color: palette.muted }]}>{message}</Text>
        </View>
        {!!retry && (
          <Button
            variant="outline"
            compact
            accessibilityLabel="Retry"
            onPress={retry}
            icon={<RotateCcw size={12} color={palette.text} />}
            style={[
              s.errorRetry,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            textStyle={[s.errorRetryText, { color: palette.text }]}
          >
            Retry
          </Button>
        )}
      </View>
    </View>
  );
}
export function Empty({
  title = "Nothing here yet",
  description,
  action,
  compact = false,
  kind = "empty",
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
function flattenGroupItems(node: ReactNode): ReactNode[] {
  const items: ReactNode[] = [];
  Children.forEach(node, (child) => {
    if (child == null || typeof child === "boolean") return;
    if (isValidElement(child) && child.type === Fragment) {
      items.push(
        ...flattenGroupItems(
          (child.props as { children?: ReactNode }).children,
        ),
      );
      return;
    }
    items.push(child);
  });
  return items;
}

export type LabelValueTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export function LabelValue({
  label,
  value,
  stacked = false,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  stacked?: boolean;
  tone?: LabelValueTone;
}) {
  const palette = useTheme();
  const { fontScale } = useWindowDimensions();
  const isStacked = stacked || fontScale > 1.35;
  const valueColor =
    tone === "success"
      ? palette.success
      : tone === "warning"
        ? palette.warning
        : tone === "danger"
          ? palette.danger
          : tone === "info"
            ? palette.blue
            : palette.text;

  return (
    <View style={isStacked ? s.stackedValue : s.labelValue}>
      <Text
        style={[
          s.description,
          { color: palette.muted },
          !isStacked && { flexShrink: 1 },
        ]}
      >
        {label}
      </Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text
          style={[
            s.value,
            { color: valueColor },
            isStacked && { textAlign: "left", alignSelf: "stretch" },
          ]}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

export function DetailGroup({
  children,
  inset = true,
  style,
}: {
  children: ReactNode;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const items = flattenGroupItems(children);
  if (!items.length) return null;

  const insetBg = isDark ? "#0f1733" : palette.background;

  return (
    <View
      style={[
        s.detailGroup,
        inset && {
          backgroundColor: insetBg,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      {items.map((item, idx) => (
        <View
          key={
            isValidElement(item) && item.key != null
              ? item.key
              : `detail-${idx}`
          }
          style={[
            s.detailGroupRow,
            idx > 0 && {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: palette.border,
            },
          ]}
        >
          {item}
        </View>
      ))}
    </View>
  );
}

export type NoticeTone =
  | "info"
  | "warning"
  | "danger"
  | "success"
  | "review"
  | "neutral";

export function Notice({
  children,
  tone = "info",
  title,
  icon,
  action,
}: {
  children: ReactNode;
  tone?: NoticeTone;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const toneSpec =
    tone === "warning"
      ? { bg: palette.warningSoft, accent: palette.warning, Icon: TriangleAlert }
      : tone === "danger"
        ? { bg: palette.dangerSoft, accent: palette.danger, Icon: AlertCircle }
        : tone === "success"
          ? { bg: palette.successSoft, accent: palette.success, Icon: CircleCheck }
          : tone === "review"
            ? { bg: palette.reviewSoft, accent: palette.review, Icon: ShieldCheck }
            : tone === "neutral"
              ? { bg: palette.primarySoft, accent: palette.primary, Icon: Info }
              : { bg: palette.blueSoft, accent: palette.blue, Icon: Info };

  const DefaultIcon = toneSpec.Icon;
  const badgeBg = isDark ? withOpacity(toneSpec.accent, 0.18) : "#ffffff";
  const badgeBorder = withOpacity(toneSpec.accent, isDark ? 0.32 : 0.22);
  const containerBorder = withOpacity(toneSpec.accent, isDark ? 0.3 : 0.2);

  return (
    <View
      style={[
        s.notice,
        {
          backgroundColor: toneSpec.bg,
          borderColor: containerBorder,
        },
      ]}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          s.noticeBadge,
          {
            backgroundColor: badgeBg,
            borderColor: badgeBorder,
          },
          !isDark && s.alertBadgeShadowLight,
        ]}
      >
        {icon ?? <DefaultIcon size={18} color={toneSpec.accent} />}
      </View>
      <View style={s.noticeBody}>
        {!!title && (
          <Text style={[s.noticeTitle, { color: toneSpec.accent }]}>
            {title}
          </Text>
        )}
        {children != null && (
          <Text style={[s.noticeText, { color: palette.text }]}>
            {children}
          </Text>
        )}
        {action}
      </View>
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
  compact: { gap: 10, paddingTop: 10, paddingBottom: 24 },
  compactEmpty: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  description: { fontSize: 13, lineHeight: 20, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  cardHeaderLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  cardHeaderTrail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text, flexShrink: 1 },
  cardTitleFlat: { fontSize: 15, fontWeight: "700" },
  cardBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 14,
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
  },
  error: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
  },
  errorBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertBadgeShadowLight: {
    shadowColor: "#101849",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  errorBody: {
    flex: 1,
    gap: 3,
    alignItems: "flex-start",
  },
  errorCopy: {
    gap: 3,
    alignSelf: "stretch",
  },
  errorTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
  },
  errorRetry: {
    marginTop: 7,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    alignSelf: "flex-start",
  },
  errorRetryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  labelValue: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  stackedValue: { gap: 2, alignItems: "flex-start" },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    textAlign: "right",
  },
  detailGroup: {
    gap: 0,
  },
  detailGroupRow: {
    paddingVertical: 10,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  noticeBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  noticeTitle: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "700",
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
