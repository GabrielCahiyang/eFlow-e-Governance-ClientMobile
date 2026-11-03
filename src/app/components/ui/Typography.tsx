import { forwardRef, type ComponentRef } from "react";
import { useAppearance, themeText } from "./Appearance";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";
const families: Record<string, string> = {
  normal: "Figtree_400Regular",
  "400": "Figtree_400Regular",
  "500": "Figtree_500Medium",
  "600": "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
  "700": "Figtree_700Bold",
  "800": "Figtree_800ExtraBold",
};
function font(
  style: Readonly<Partial<TextStyle>> | null | undefined,
): TextStyle {
  if (style?.fontFamily) return {};
  return {
    fontFamily:
      families[String(style?.fontWeight || 400)] || "Figtree_400Regular",
    fontWeight: "normal",
  };
}
export const Text = forwardRef<ComponentRef<typeof NativeText>, TextProps>(
  function Text({ style, ...props }, ref) {
    const { isDark } = useAppearance();
    return (
      <NativeText
        {...props}
        ref={ref}
        style={[themeText(style, isDark), font(StyleSheet.flatten(style))]}
      />
    );
  },
);
export const TextInput = forwardRef<
  ComponentRef<typeof NativeInput>,
  TextInputProps
>(function TextInput({ style, ...props }, ref) {
  const { isDark } = useAppearance();
  return (
    <NativeInput
      {...props}
      ref={ref}
      placeholderTextColor={
        props.placeholderTextColor || (isDark ? "#afc4c3" : "#526161")
      }
      keyboardAppearance={isDark ? "dark" : "light"}
      style={[themeText(style, isDark), font(StyleSheet.flatten(style))]}
    />
  );
});
