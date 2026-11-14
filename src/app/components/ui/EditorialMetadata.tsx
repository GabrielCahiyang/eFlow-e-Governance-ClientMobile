import React from "react";
import {
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { statusIndicatorColor } from "./Status";
import { statusLabel } from "../../shared/statusLabels";

export interface EditorialItem {
  label: string;
  value: React.ReactNode;
  status?: string;
  domain?: "finance";
  accent?: string;
  accessibilityLabel?: string;
}

export function EditorialMetadataStrip({
  items,
  variant = "card",
  style,
}: {
  items: (EditorialItem | null | undefined | false)[];
  variant?: "card" | "flush";
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const validItems = items.filter(
    (item): item is EditorialItem =>
      Boolean(item && typeof item === "object" && item.value != null),
  );

  if (validItems.length === 0) return null;

  const isStacked = fontScale > 1.35 || (width < 340 && validItems.length > 2);

  return (
    <View
      style={[
        variant === "card"
          ? {
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }
          : {
              backgroundColor: "transparent",
            },
        {
          flexDirection: isStacked ? "column" : "row",
          alignItems: isStacked ? "stretch" : "center",
          gap: isStacked ? 8 : 0,
        },
        style,
      ]}
    >
      {validItems.map((item, index) => {
        const itemColor =
          item.accent ??
          (item.status
            ? statusIndicatorColor(item.status, palette)
            : palette.text);

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 &&
              (isStacked ? (
                <View
                  style={{
                    height: 1,
                    backgroundColor: palette.border,
                    opacity: 0.6,
                    marginVertical: 2,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 1,
                    backgroundColor: palette.border,
                    marginHorizontal: 12,
                    alignSelf: "stretch",
                    opacity: 0.8,
                  }}
                />
              ))}

            <View
              style={{
                flex: isStacked ? undefined : 1,
                gap: 2,
                justifyContent: "center",
              }}
              accessibilityLabel={
                item.accessibilityLabel ??
                `${item.label}: ${typeof item.value === "string" ? item.value : ""}`
              }
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: palette.mutedLabel,
                  textTransform: "uppercase",
                  letterSpacing: 0.75,
                }}
                numberOfLines={1}
              >
                {item.label.toUpperCase()}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: itemColor,
                  lineHeight: 18,
                }}
                numberOfLines={2}
              >
                {item.value}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export interface EditorialInlineItem {
  label?: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  status?: string;
  domain?: "finance";
  accent?: string;
  accessibilityLabel?: string;
}

export function EditorialMetadataInline({
  items,
  style,
}: {
  items: (EditorialInlineItem | null | undefined | false)[];
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const validItems = items.filter(
    (item): item is EditorialInlineItem =>
      Boolean(
        item &&
          typeof item === "object" &&
          item.value != null &&
          item.value !== "",
      ),
  );

  if (validItems.length === 0) return null;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
        },
        style,
      ]}
    >
      {validItems.map((item, index) => {
        const itemColor =
          item.accent ??
          (item.status
            ? statusIndicatorColor(item.status, palette)
            : palette.mutedLabel);

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <View
                style={{
                  width: 1,
                  height: 12,
                  backgroundColor: palette.border,
                  marginHorizontal: 8,
                  opacity: 0.8,
                }}
              />
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
              accessibilityLabel={
                item.accessibilityLabel ??
                (item.label
                  ? `${item.label}: ${typeof item.value === "string" ? item.value : ""}`
                  : typeof item.value === "string"
                    ? item.value
                    : undefined)
              }
            >
              {item.icon}
              {!!item.label && (
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: palette.mutedLabel,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {item.label.toUpperCase()}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: item.status ? "600" : "500",
                  color: itemColor,
                }}
                numberOfLines={1}
              >
                {item.value}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function EditorialStatus({
  value,
  domain,
  size = "medium",
  style,
}: {
  value: string;
  domain?: "finance";
  size?: "small" | "medium";
  style?: StyleProp<TextStyle>;
}) {
  const palette = useTheme();
  const label = statusLabel(value, domain);
  const color = statusIndicatorColor(value, palette);

  return (
    <Text
      accessibilityLabel={`Status: ${label}`}
      style={[
        {
          fontSize: size === "small" ? 12 : 13,
          fontWeight: "600",
          color,
        },
        style,
      ]}
    >
      {label}
    </Text>
  );
}
