import { useState } from "react";
import { Linking } from "react-native";
import ExternalLink from "lucide-react-native/icons/external-link";
import { Screen, Empty, Button, ErrorState } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { backendConfig } from "../../../platform/config";
import { webHandoffUrl } from "../../../platform/webHandoff";
import type { MobileDestination } from "./mobileScope";
export function UnavailableDestination({
  destination,
  onBack,
  backLabel,
}: {
  destination: MobileDestination;
  onBack: () => void;
  backLabel?: string;
}) {
  const palette = useTheme(),
    [error, setError] = useState<Error>();
  const url =
    destination.disposition === "web"
      ? webHandoffUrl(destination.route, backendConfig.webOrigin)
      : undefined;
  return (
    <Screen compact>
      <Empty
        compact
        title={destination.title}
        description={
          destination.disposition === "web" && !url
            ? "Open eFlow Web to manage this."
            : destination.reason
        }
      />
      {!!url && (
        <Button
          icon={<ExternalLink size={18} color={palette.onPrimary} />}
          onPress={() => void Linking.openURL(url).catch(setError)}
        >
          Continue in eFlow Web
        </Button>
      )}
      <Button variant="outline" onPress={onBack}>
        Back to{" "}
        {backLabel ||
          (destination.tab === "work"
            ? "My Work"
            : destination.tab === "home"
              ? "Home"
              : destination.tab === "more"
                ? "More"
                : destination.tab === "inbox"
                  ? "Inbox"
                  : destination.tab === "accounting"
                    ? "Accounting"
                    : "Projects")}
      </Button>
      {!!error && <ErrorState error={error} />}
    </Screen>
  );
}
