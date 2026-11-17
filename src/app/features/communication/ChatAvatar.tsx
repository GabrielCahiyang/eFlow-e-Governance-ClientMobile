import { View } from "react-native";
import Building from "lucide-react-native/icons/building";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import Folder from "lucide-react-native/icons/folder";
import Pin from "lucide-react-native/icons/pin";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { Text } from "../../components/ui/Typography";
import { ChatImage } from "./chatImages";
import { initials } from "./chatPresentation";

/** Messenger-style round avatar: initials for people, kind-tinted glyphs for groups. */
export function ChatAvatar({
  name,
  kind,
  size = 48,
  actor,
  path,
  pinned = false,
}: {
  name?: string | null;
  kind?: string;
  size?: number;
  actor?: string;
  path?: string;
  pinned?: boolean;
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
  const tone =
    kind === "project"
      ? { bg: palette.reviewSoft, fg: palette.review }
      : kind === "task"
        ? { bg: palette.blueSoft, fg: palette.blue }
        : { bg: palette.primarySoft, fg: palette.primary };

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone.bg,
        }}
      >
        {Glyph ? (
          <Glyph size={size * 0.45} color={tone.fg} />
        ) : (
          <Text
            style={{
              fontSize: size * 0.34,
              lineHeight: size * 0.44,
              fontWeight: "700",
              color: isDark ? palette.text : tone.fg,
            }}
          >
            {initials(name)}
          </Text>
        )}
        {!!(actor && path) && (
          <ChatImage
            actor={actor}
            path={path}
            avatar
            resizeMode="cover"
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: size / 2,
            }}
          />
        )}
      </View>
      {pinned && (
        <View
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pin size={10} color={palette.primary} />
        </View>
      )}
    </View>
  );
}
