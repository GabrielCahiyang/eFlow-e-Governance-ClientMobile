import { useEffect, useState } from "react";
import { View, SafeAreaView } from "../../components/ui/Primitives";
import { useFonts } from "expo-font";
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Figtree_800ExtraBold } from "@expo-google-fonts/figtree/800ExtraBold";
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
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
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
  if (error)
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Screen title="Check your account access">
          <ErrorState error={error} retry={() => void refresh()} />
          <Button variant="outline" onPress={() => void signOut()}>
            Back to sign in
          </Button>
        </Screen>
      </SafeAreaView>
    );
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
