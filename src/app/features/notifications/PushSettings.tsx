import { useEffect } from "react";
import { AppState, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  Button,
  Card,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { enablePush, disablePush, pushEnabled } from "../../../platform/push";
export function PushSettings() {
  const { profile } = useAuth(),
    actor = profile!.id,
    facts = useFacts("push:" + actor, () => pushEnabled(actor)),
    action = useAction();
  const ready = !facts.loading && !facts.error && facts.data !== undefined;
  return (
    <Card title="Device push notifications">
      {facts.loading && (
        <Loading label="Checking push settings" layout="summary" />
      )}
      {ready && (
        <>
          <LabelValue label="Push alerts" value={facts.data ? "On" : "Off"} />
          <Notice>
            Alerts show a generic work update. Open eFlow to see the details.
          </Notice>
        </>
      )}
      <Row>
        <Button
          busy={action.busy}
          disabled={!ready}
          onPress={() =>
            void action.run(async () => {
              if (!ready) return;
              if (facts.data) await disablePush(actor);
              else await enablePush(actor);
              await facts.refresh();
            })
          }
        >
          {facts.data ? "Turn off push alerts" : "Turn on push alerts"}
        </Button>
        <Button variant="outline" onPress={() => void Linking.openSettings()}>
          Device settings
        </Button>
      </Row>
      {!!(facts.error || action.error) && (
        <ErrorState
          error={facts.error || action.error}
          retry={facts.error ? () => void facts.refresh() : undefined}
        />
      )}
    </Card>
  );
}
export function usePushInbox(onOpen: () => void) {
  const { profile } = useAuth();
  useEffect(() => {
    if (!profile || Platform.OS === "web") return;
    let active = true;
    const received = Notifications.addNotificationResponseReceivedListener(
      () => {
        if (active) onOpen();
      },
    );
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (active && response) {
          onOpen();
          void Notifications.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => {});
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void pushEnabled(profile.id)
          .then((enabled) => {
            if (enabled) return enablePush(profile.id);
          })
          .catch(() => {});
    });
    return () => {
      active = false;
      received.remove();
      app.remove();
    };
  }, [profile?.id]);
}
