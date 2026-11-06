import { ErrorState, Loading } from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { WorkTreePanel } from "../tasks";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
import type { Navigate } from "../../shared/routes";
export function PersonalNestedWork({
  root,
  readOnly,
  navigate,
}: {
  root: string;
  readOnly: boolean;
  navigate: Navigate;
}) {
  const tree = useFacts("personal-tree:" + root, () => fetchWorkTree(root));
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
    <Loading label="Loading subitems" layout="tree" />
  );
}
