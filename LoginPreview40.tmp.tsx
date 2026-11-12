import "./src/platform/bootstrap";
import { registerRootComponent } from "expo";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppearanceProvider } from "./src/app/components/ui/Appearance";
import { LoginScreen } from "./src/app/features/authentication/LoginScreen";
import { MotionProvider } from "./src/app/shared/motion";

globalThis.fetch = async () => ({ ok: false, status: 423 });

function LoginFixture() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppearanceProvider>
          <MotionProvider reduceMotion>
            <LoginScreen />
          </MotionProvider>
        </AppearanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(LoginFixture);


