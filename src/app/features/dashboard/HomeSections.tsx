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
import { useTheme } from "../../components/ui/Appearance";
import { space, type } from "../../components/ui/theme";
import type { AppRoute, Navigate } from "../../shared/routes";

/** One radius and one surface for every grouped list on Home. */
const homeCardRadius = 14;

export function HomeCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: homeCardRadius,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A full-width tappable row inside HomeCard. Rows share one separator and one
 * padding rhythm so Home reads as a column of lists, not a wall of cards.
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
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: isFirst ? 0 : StyleSheet.hairlineWidth,
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
  action,
  onAction,
  actionLabel = "See all",
  actionAccessibilityLabel,
  children,
}: {
  title: string;
  badge?: string | number;
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
  const handleAction = action?.onPress ?? onAction;
  const label = action?.label ?? actionLabel;
  const a11yLabel =
    action?.accessibilityLabel ??
    actionAccessibilityLabel ??
    `${label} ${title}`;

  return (
    <View style={{ gap: space.xs, marginTop: space.xs }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          minHeight: 44,
          marginBottom: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.xs,
            flexShrink: 1,
            paddingVertical: 4,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontSize: type.heading,
              fontWeight: "700",
              color: palette.text,
            }}
          >
            {title}
          </Text>
          {badge !== undefined && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: palette.primarySoft,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: palette.primaryDark ?? palette.primary,
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
              minHeight: 44,
              minWidth: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingVertical: 8,
              paddingLeft: space.sm,
              opacity: pressed ? 0.6 : 1,
              gap: 2,
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: palette.primary,
              }}
            >
              {label}
            </Text>
            <ChevronRight
              size={14}
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
