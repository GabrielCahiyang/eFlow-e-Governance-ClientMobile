import { useState } from "react";
import { Linking } from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ExternalLink from "lucide-react-native/icons/external-link";
import { Screen, Empty, Button, ErrorState } from "../../components/ui";
import { useTheme } from "../../components/ui/Appearance";
import { backendConfig } from "../../../platform/config";
import { webHandoffUrl } from "../../../platform/webHandoff";
import { tabLabels, type MobileDestination } from "./mobileScope";
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
    <Screen
      compact
      title={destination.title}
      description={backLabel ? `From ${backLabel}` : undefined}
    >
      <Empty
        compact
        title={
          destination.disposition === "web"
            ? "Available in eFlow Web"
            : "Unavailable in mobile"
        }
        description={
          destination.disposition === "web" && !url
            ? "This build needs the eFlow Web address to open this page."
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
      <Button
        variant="outline"
        icon={<ArrowLeft size={16} color={palette.primary} />}
        onPress={onBack}
      >
        Back to {backLabel || tabLabels[destination.tab] || "Projects"}
      </Button>
      {!!error && <ErrorState error={error} />}
    </Screen>
  );
}
