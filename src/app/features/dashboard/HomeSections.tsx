import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { space, type, withOpacity } from "../../components/ui/theme";
import type { AppRoute, Navigate } from "../../shared/routes";

export type HomeSectionTone =
  | "primary"
  | "danger"
  | "warning"
  | "review"
  | "success";

function tonePalette(
  tone: HomeSectionTone,
  palette: ReturnType<typeof useTheme>,
) {
  switch (tone) {
    case "danger":
      return { bg: palette.dangerSoft, fg: palette.danger };
    case "warning":
      return { bg: palette.warningSoft, fg: palette.warning };
    case "review":
      return { bg: palette.reviewSoft, fg: palette.review };
    case "success":
      return { bg: palette.successSoft, fg: palette.success };
    default:
      return { bg: palette.primarySoft, fg: palette.primary };
  }
}

/** Inset grouped list container inside HomeSection Card v2. */
export function HomeCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  return (
    <View
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: isDark
            ? withOpacity(palette.background, 0.72)
            : "#f7f9fd",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Circular right chevron indicator matching unified Card v2 rows. */
export function HomeRowChevron() {
  const palette = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <ChevronRight size={13} color={palette.mutedLabel} strokeWidth={2.4} />
    </View>
  );
}

/**
 * A full-width tappable row inside HomeCard. Rows share one separator and one
 * padding rhythm so Home reads cleanly inside inset Card v2 groups.
 */
export function HomeRow({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  isFirst = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  isFirst?: boolean;
}) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: 56,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: palette.border,
        backgroundColor: pressed && onPress ? palette.primarySoft : "transparent",
      })}
    >
      {children}
    </Pressable>
  );
}

export function HomeSection({
  title,
  badge,
  icon,
  tone = "primary",
  action,
  onAction,
  actionLabel = "See all",
  actionAccessibilityLabel,
  children,
}: {
  title: string;
  badge?: string | number;
  icon?: ReactNode;
  tone?: HomeSectionTone;
  action?: {
    label?: string;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  onAction?: () => void;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  children: ReactNode;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const accent = tonePalette(tone, palette);
  const handleAction = action?.onPress ?? onAction;
  const label = action?.label ?? actionLabel;
  const a11yLabel =
    action?.accessibilityLabel ??
    actionAccessibilityLabel ??
    `${label} ${title}`;

  return (
    <View
      style={{
        borderRadius: 20,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        shadowColor: isDark ? "#000" : palette.primaryDark,
        shadowOpacity: isDark ? 0.2 : 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            flex: 1,
            minWidth: 0,
          }}
        >
          {!!icon && (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: accent.bg,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {icon}
            </View>
          )}
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: palette.text,
              flexShrink: 1,
            }}
          >
            {title}
          </Text>
          {badge !== undefined && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2.5,
                borderRadius: 999,
                backgroundColor: accent.bg,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: accent.fg,
                }}
              >
                {badge}
              </Text>
            </View>
          )}
        </View>

        {handleAction && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            onPress={handleAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              minHeight: 30,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: pressed
                ? withOpacity(palette.primary, 0.16)
                : palette.primarySoft,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            })}
          >
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: "700",
                color: palette.primary,
              }}
            >
              {label}
            </Text>
            <ChevronRight
              size={13}
              color={palette.primary}
              strokeWidth={2.5}
            />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

export function HomeMessage({ children }: { children: ReactNode }) {
  const palette = useTheme();
  return (
    <Text
      style={{
        color: palette.mutedLabel,
        fontSize: type.small,
        paddingVertical: space.xs,
      }}
    >
      {children}
    </Text>
  );
}

export function HomeLink({
  row,
  navigate,
}: {
  row: { title: string; description?: string; route: AppRoute };
  navigate: Navigate;
}) {
  return (
    <NavigationRow
      title={row.title}
      description={row.description}
      accessibilityHint={row.description}
      onPress={() => navigate(row.route)}
    />
  );
}
