import { useEffect } from "react";
import { AccessibilityInfo, ScrollView, View } from "react-native";
import { Host, BottomSheet, RNHostView } from "@expo/ui";
import { useAppearance, useTheme } from "./Appearance";
import { Text } from "./Typography";
import { Button } from "./Button";
import { NavigationRow } from "./NavigationRow";
/** Platform-native choice sheet. Transactional editors retain their existing draft/busy lifecycle. */
export function SelectionSheet({
  open,
  title,
  description,
  value,
  options,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  value?: string;
  options: {
    id: string;
    title: string;
    description?: string;
    selected?: boolean;
  }[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const palette = useTheme(),
    { isDark } = useAppearance();
  useEffect(() => {
    if (open) AccessibilityInfo.announceForAccessibility(title);
  }, [open, title]);
  return (
    <Host
      colorScheme={isDark ? "dark" : "light"}
      seedColor={palette.primary}
      pointerEvents="none"
      style={{ position: "absolute" }}
    >
      <BottomSheet
        isPresented={open}
        onDismiss={onClose}
        snapPoints={["half", "full"]}
        contentPadding={0}
        containerColor={palette.surface}
      >
        <RNHostView>
          <View
            accessibilityViewIsModal
            style={{ flex: 1, backgroundColor: palette.surface }}
          >
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 4 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  accessibilityRole="header"
                  style={{
                    flex: 1,
                    fontSize: 19,
                    lineHeight: 26,
                    fontWeight: "600",
                    color: palette.text,
                  }}
                >
                  {title}
                </Text>
                <Button variant="ghost" onPress={onClose}>
                  Close
                </Button>
              </View>
              {!!description && (
                <Text style={{ color: palette.muted }}>{description}</Text>
              )}
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="automatic"
            >
              {options.map((option) => (
                <NavigationRow
                  key={option.id}
                  title={option.title}
                  description={option.description}
                  selected={option.selected ?? value === option.id}
                  onPress={() => onSelect(option.id)}
                />
              ))}
              {!options.length && (
                <Text style={{ padding: 16, color: palette.muted }}>
                  No authorized workspaces are available.
                </Text>
              )}
            </ScrollView>
          </View>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
}
