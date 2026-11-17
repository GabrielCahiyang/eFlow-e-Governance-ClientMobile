import { useEffect, useState } from "react";
import { View, SafeAreaView } from "../../components/ui/Primitives";
import { useFonts } from "expo-font";
import { HostGrotesk_400Regular } from "@expo-google-fonts/host-grotesk/400Regular";
import { HostGrotesk_500Medium } from "@expo-google-fonts/host-grotesk/500Medium";
import { HostGrotesk_600SemiBold } from "@expo-google-fonts/host-grotesk/600SemiBold";
import { HostGrotesk_700Bold } from "@expo-google-fonts/host-grotesk/700Bold";
import { HostGrotesk_800ExtraBold } from "@expo-google-fonts/host-grotesk/800ExtraBold";
import {
  AuthProvider,
  LoginScreen,
  useAuth,
  useNativeEntryLink,
  InvitationScreen,
  ActivationScreen,
} from "../authentication";
import { hydrateWebPreferences } from "../../../platform/webRuntime";
import { Button, ErrorState, Screen } from "../../components/ui";
import { LoadingScreen } from "./LoadingScreen";
import { NativeWorkspace } from "./NativeWorkspace";
import { ShareLanding } from "../projects";
import type { AppRoute } from "../../shared/routes";
import { BackgroundAccessStatus } from "./BackgroundAccessStatus";
import { feedback } from "../../shared/userMessages";
export function AppRoot() {
  const [attempt, setAttempt] = useState(0);
  return (
    <ReadyAppRoot
      key={attempt}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}
function ReadyAppRoot({ onRetry }: { onRetry: () => void }) {
  const [fonts, fontError] = useFonts({
    HostGrotesk_400Regular,
    HostGrotesk_500Medium,
    HostGrotesk_600SemiBold,
    HostGrotesk_700Bold,
    HostGrotesk_800ExtraBold,
  });
  const [ready, setReady] = useState(false),
    [error, setError] = useState<Error>();
  const hydrate = () => {
    setError(undefined);
    void hydrateWebPreferences()
      .then(() => setReady(true))
      .catch(setError);
  };
  useEffect(hydrate, []);
  if (fontError || error)
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Screen title="eFlow could not start">
          <ErrorState error={fontError || error} retry={onRetry} />
        </Screen>
      </SafeAreaView>
    );
  if (!fonts || !ready) return <LoadingScreen />;
  return (
    <AuthProvider>
      <SessionContent />
    </AuthProvider>
  );
}
function SessionContent() {
  const { loading, accessError, user, profile, error, refresh, signOut } =
    useAuth();
  const { entry, close } = useNativeEntryLink();
  const [sharedRoute, setSharedRoute] = useState<AppRoute>();
  useEffect(() => setSharedRoute(undefined), [profile?.id]);
  if (entry?.kind === "project-share" && profile)
    return (
      <ShareLanding
        grant={entry.token}
        onClose={close}
        onOpen={(route) => {
          setSharedRoute(route);
          close();
        }}
      />
    );
  if (entry && entry.kind !== "project-share")
    return entry.kind === "activation" ? (
      <ActivationScreen key={entry.token} token={entry.token} onClose={close} />
    ) : (
      <InvitationScreen
        key={entry.token}
        token={entry.token}
        projectGuest={entry.kind === "project-invitation"}
        onClose={close}
      />
    );
  if (loading && !profile) return <LoadingScreen />;
  if (error) {
    const denied = error.message === feedback.invalidCredentials;
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Screen title={denied ? "Sign in to eFlow" : "Check your account access"}>
          <ErrorState error={error} retry={denied ? undefined : () => void refresh()} />
          <Button variant="outline" onPress={() => void signOut()}>
            Back to sign in
          </Button>
        </Screen>
      </SafeAreaView>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {user && profile ? (
          <NativeWorkspace
            key={sharedRoute?.id || profile.id}
            initialRoute={sharedRoute}
          />
        ) : (
          <LoginScreen />
        )}
      </View>
      {!!profile && (
        <BackgroundAccessStatus
          error={accessError}
          retry={() => void refresh()}
        />
      )}
    </View>
  );
}
