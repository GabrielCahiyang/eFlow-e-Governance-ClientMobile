import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MotionProvider } from "./src/app/shared/motion";
import { ToastProvider } from "./src/app/components/ui/Toast";
import { AppRoot } from "./src/app/features/app-shell/AppRoot";
import {
  AppearanceProvider,
  useAppearance,
} from "./src/app/components/ui/Appearance";
function AppStatusBar() {
  const { isDark } = useAppearance();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppearanceProvider>
          <MotionProvider>
            <ToastProvider>
              <AppRoot />
              <AppStatusBar />
            </ToastProvider>
          </MotionProvider>
        </AppearanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
