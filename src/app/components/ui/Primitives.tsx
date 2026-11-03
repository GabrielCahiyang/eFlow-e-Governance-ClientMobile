import { forwardRef, type ComponentRef } from "react";
import {
  View as NativeView,
  ScrollView as NativeScrollView,
  Pressable as NativePressable,
  type ViewProps,
  type ScrollViewProps,
  type PressableProps,
} from "react-native";
import {
  SafeAreaView as NativeSafeArea,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";
import { themedStyle, useAppearance } from "./Appearance";
export const View = forwardRef<ComponentRef<typeof NativeView>, ViewProps>(
  function View({ style, ...props }, ref) {
    const { isDark } = useAppearance();
    return (
      <NativeView {...props} ref={ref} style={themedStyle(style, isDark)} />
    );
  },
);
export const ScrollView = forwardRef<
  ComponentRef<typeof NativeScrollView>,
  ScrollViewProps
>(function ScrollView({ style, contentContainerStyle, ...props }, ref) {
  const { isDark } = useAppearance();
  return (
    <NativeScrollView
      {...props}
      ref={ref}
      style={themedStyle(style, isDark)}
      contentContainerStyle={themedStyle(contentContainerStyle, isDark)}
    />
  );
});
export const Pressable = forwardRef<
  ComponentRef<typeof NativeView>,
  PressableProps
>(function Pressable({ style, ...props }, ref) {
  const { isDark } = useAppearance();
  return (
    <NativePressable
      {...props}
      ref={ref}
      style={
        typeof style === "function"
          ? (state) => themedStyle(style(state), isDark)
          : themedStyle(style, isDark)
      }
    />
  );
});
export const SafeAreaView = forwardRef<
  ComponentRef<typeof NativeSafeArea>,
  SafeAreaViewProps
>(function SafeAreaView({ style, ...props }, ref) {
  const { isDark } = useAppearance();
  return (
    <NativeSafeArea {...props} ref={ref} style={themedStyle(style, isDark)} />
  );
});
