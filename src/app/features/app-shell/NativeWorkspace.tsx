import { WorkspaceProvider } from "../workspaces";
import { useAuth } from "../authentication";
import type { AppRoute } from "../../shared/routes";
import { MobileNavigator } from "../navigation/MobileNavigator";
import { WorkFeedProvider } from "../personal-work/WorkFeedProvider";

export function NativeWorkspace({
  initialRoute,
}: { initialRoute?: AppRoute } = {}) {
  const { profile } = useAuth();
  return (
    <WorkspaceProvider key={profile?.id}>
      <WorkFeedProvider key={profile?.id}>
        <MobileNavigator key={profile?.id} initialRoute={initialRoute} />
      </WorkFeedProvider>
    </WorkspaceProvider>
  );
}
