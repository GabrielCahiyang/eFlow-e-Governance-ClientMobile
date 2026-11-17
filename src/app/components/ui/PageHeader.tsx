import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import { Text } from "./Typography";
import { useTheme } from "./Appearance";
import { useNavigationHeader } from "../../features/navigation/navigationHeaderContext";

export function PageHeader({
  title,
  subtitle,
  onBack,
  backHint,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backHint?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const navHeader = useNavigationHeader();
  const handleBack = onBack ?? navHeader?.onBack;
  const resolvedHint =
    backHint ?? navHeader?.backHint ?? "Returns to previous screen";

  return (
    <View style={[s.row, style]}>
      {!!handleBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint={resolvedHint}
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [
            s.backBtn,
            {
              backgroundColor: pressed ? palette.primarySoft : palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <ArrowLeft size={17} color={palette.text} />
        </Pressable>
      )}
      <View style={s.copy}>
        <Text
          accessibilityRole="header"
          style={[s.title, { color: palette.text }]}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[s.subtitle, { color: palette.mutedLabel }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!right && <View style={s.right}>{right}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  right: {
    flexShrink: 0,
  },
});
