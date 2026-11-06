import { ViewLoadingState } from "../../components/ui/loading/ViewLoadingState";

export function FeedSkeleton({
  label,
  layout = "workList",
}: {
  label: string;
  layout?: "work" | "workList" | "inbox" | "navigation";
}) {
  return <ViewLoadingState label={label} layout={layout} />;
}
