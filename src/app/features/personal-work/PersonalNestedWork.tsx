import { ErrorState, Loading } from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { WorkTreePanel } from "../tasks";
import { fetchWorkTree } from "../../../core/web/app/features/nested-work/services/workTreeService";
export function PersonalNestedWork({
  root,
  readOnly,
}: {
  root: string;
  readOnly: boolean;
}) {
  const tree = useFacts("personal-tree:" + root, () => fetchWorkTree(root));
  return tree.error ? (
    <ErrorState error={tree.error} retry={() => void tree.refresh()} />
  ) : tree.data ? (
    <WorkTreePanel
      data={tree.data}
      readOnly={readOnly}
      onSaved={async () => {
        await tree.refresh();
      }}
    />
  ) : (
    <Loading />
  );
}
