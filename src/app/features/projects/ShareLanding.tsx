import { Button, ErrorState, Notice, Screen } from "../../components/ui";
import { useAction } from "../../shared/useAction";
import { openShare } from "../../../core/web/app/features/project-access/services/accessService";
import { selectWorkspace } from "../../../core/web/app/features/workspaces/services/workspaceService";
import type { AppRoute } from "../../shared/routes";
export function ShareLanding({
  grant,
  onOpen,
  onClose,
}: {
  grant: string;
  onOpen: (route: AppRoute) => void;
  onClose: () => void;
}) {
  const action = useAction();
  return (
    <Screen title="Project invitation">
      <Notice>
        Sign in with the email address that received this invitation.
      </Notice>
      <Button
        busy={action.busy}
        onPress={() =>
          void action.run(async () => {
            const receipt = await openShare(grant),
              scope = await selectWorkspace(receipt.workspace);
            onOpen({
              name:
                scope.workspace.kind === "personal"
                  ? "personal_project"
                  : "project",
              id: receipt.project,
            });
          })
        }
      >
        Accept and open project
      </Button>
      <Button variant="outline" disabled={action.busy} onPress={onClose}>
        Back to eFlow
      </Button>
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Screen>
  );
}
