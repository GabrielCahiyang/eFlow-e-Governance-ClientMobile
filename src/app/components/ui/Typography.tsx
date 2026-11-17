import { forwardRef, type ComponentRef } from "react";
import { useAppearance, useTheme, themeText } from "./Appearance";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";
const families: Record<string, string> = {
  normal: "HostGrotesk_400Regular",
  "400": "HostGrotesk_400Regular",
  "500": "HostGrotesk_500Medium",
  "600": "HostGrotesk_600SemiBold",
  bold: "HostGrotesk_700Bold",
  "700": "HostGrotesk_700Bold",
  "800": "HostGrotesk_800ExtraBold",
};
function font(
  style: Readonly<Partial<TextStyle>> | null | undefined,
): TextStyle {
  if (style?.fontFamily) return {};
  return {
    fontFamily:
      families[String(style?.fontWeight || 400)] || "HostGrotesk_400Regular",
    fontWeight: "normal",
  };
}
export const Text = forwardRef<ComponentRef<typeof NativeText>, TextProps>(
  function Text({ style, textBreakStrategy = "simple", ...props }, ref) {
    const { isDark } = useAppearance();
    return (
      <NativeText
        textBreakStrategy={textBreakStrategy}
        {...props}
        ref={ref}
        style={[
          { fontSize: 15, lineHeight: 22 },
          themeText(style, isDark),
          font(StyleSheet.flatten(style)),
        ]}
      />
    );
  },
);
export const TextInput = forwardRef<
  ComponentRef<typeof NativeInput>,
  TextInputProps
>(function TextInput({ style, ...props }, ref) {
  const { isDark } = useAppearance();
  const palette = useTheme();
  return (
    <NativeInput
      {...props}
      ref={ref}
      placeholderTextColor={props.placeholderTextColor || palette.mutedLabel}
      keyboardAppearance={isDark ? "dark" : "light"}
      style={[themeText(style, isDark), font(StyleSheet.flatten(style))]}
    />
  );
});
