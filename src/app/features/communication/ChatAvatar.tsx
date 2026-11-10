import { View } from "react-native";
import Building from "lucide-react-native/icons/building";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import Folder from "lucide-react-native/icons/folder";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { initials } from "./chatPresentation";

/** Messenger-style round avatar: initials for people, glyphs for groups. */
export function ChatAvatar({
  name,
  kind,
  size = 48,
}: {
  name?: string | null;
  kind?: string;
  size?: number;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const Glyph =
    kind === "org"
      ? Building
      : kind === "project"
        ? Folder
        : kind === "task"
          ? ClipboardList
          : undefined;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.primarySoft,
      }}
    >
      {Glyph ? (
        <Glyph size={size * 0.46} color={palette.primary} />
      ) : (
        <Text
          style={{
            fontSize: size * 0.34,
            lineHeight: size * 0.44,
            fontWeight: "700",
            color: isDark ? palette.text : palette.primary,
          }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
