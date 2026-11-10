import { ErrorState, Loading } from "../../components/ui";
import { WorkTreePanel } from "../tasks";
import type { WorkTreeSnapshot } from "../../../core/web/app/features/nested-work/types";
import type { Navigate } from "../../shared/routes";
export function PersonalNestedWork({
  tree,
  readOnly,
  navigate,
}: {
  tree: {
    data?: WorkTreeSnapshot;
    loading: boolean;
    error?: Error;
    refresh: () => Promise<void>;
  };
  readOnly: boolean;
  navigate: Navigate;
}) {
  return tree.error ? (
    <ErrorState error={tree.error} retry={() => void tree.refresh()} />
  ) : tree.data ? (
    <WorkTreePanel
      data={tree.data}
      navigate={navigate}
      readOnly={readOnly || tree.loading}
      onSaved={async () => {
        await tree.refresh();
      }}
    />
  ) : (
    <Loading label="Loading subtasks" layout="tree" />
  );
}
