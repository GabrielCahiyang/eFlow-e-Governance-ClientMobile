import type { ReactNode } from "react";
import { View } from "react-native";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { space, type } from "../../components/ui/theme";
import type { AppRoute, Navigate } from "../../shared/routes";

export function HomeSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: type.heading,
          fontWeight: "700",
          marginBottom: space.xs,
        }}
      >
        {title}
      </Text>
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
