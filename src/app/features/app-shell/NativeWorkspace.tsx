import { WorkspaceProvider } from "../workspaces";
import { useAuth } from "../authentication";
import type { AppRoute } from "../../shared/routes";
import { MobileNavigator } from "../navigation/MobileNavigator";
import { ToastProvider } from "../../components/ui/Toast";
import { WorkFeedProvider } from "../personal-work/WorkFeedProvider";
import { WorkStatusProvider } from "../work-status";

export function NativeWorkspace({
  initialRoute,
}: { initialRoute?: AppRoute } = {}) {
  const { profile } = useAuth();
  return (
    <WorkspaceProvider key={profile?.id}>
      <WorkFeedProvider key={profile?.id}>
        <WorkStatusProvider actor={profile?.is_active ? profile.id : undefined}>
          <ToastProvider>
            <MobileNavigator key={profile?.id} initialRoute={initialRoute} />
          </ToastProvider>
        </WorkStatusProvider>
      </WorkFeedProvider>
    </WorkspaceProvider>
  );
}
