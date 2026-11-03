import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Screen,
  Tabs,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { useTaskFacts } from "../tasks";
import { useFacts } from "../../shared/useFacts";
import { personalReviewActions } from "../../../core/web/app/features/action-center/selectors";
import { getAssignedIndependentReviews } from "../../../core/web/app/features/budget/services/independentReviewService";
import { InboxScreen } from "./InboxScreen";
import type { Navigate } from "../../shared/routes";
export function ActionInbox({ navigate }: { navigate: Navigate }) {
  const { profile } = useAuth(),
    [tab, setTab] = useState("actions"),
    tasks = useTaskFacts("inbox-actions"),
    facts = useFacts("inbox-actions:" + profile?.id, async () => ({
      finance: await getAssignedIndependentReviews(profile!.id),
    })),
    items = personalReviewActions(
      tasks.data || [],
      [],
      profile?.id,
      profile?.role,
    );
  useEffect(() => {
    const timer = setInterval(
      () => void Promise.all([tasks.refresh(), facts.refresh()]),
      15000,
    );
    return () => clearInterval(timer);
  }, [tasks.refresh, facts.refresh]);
  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "actions", label: "Needs action" },
          { id: "updates", label: "Updates" },
        ]}
      />
      {tab === "updates" ? (
        <InboxScreen navigate={navigate} />
      ) : (
        <Screen
          title="Needs action"
          onRefresh={() => void Promise.all([tasks.refresh(), facts.refresh()])}
          refreshing={tasks.loading || facts.loading}
        >
          {tasks.error || facts.error ? (
            <ErrorState error={tasks.error || facts.error} />
          ) : !facts.data || !tasks.data ? (
            <Loading />
          ) : (
            <>
              {!items.length && !facts.data.finance.length && (
                <Empty title="No assigned reviews waiting" />
              )}
              {facts.data.finance.map((item) => (
                <Card key={item.liquidation.id} title={item.request.purpose}>
                  <Button
                    variant="outline"
                    onPress={() => navigate({ name: "financial_reviews" })}
                  >
                    Review independent financial package
                  </Button>
                </Card>
              ))}
              {items.map((item) => (
                <Card key={item.key} title={item.title}>
                  <Button
                    variant="outline"
                    onPress={() =>
                      navigate({
                        name: "task",
                        id: item.taskId,
                        nodeId: item.entityId,
                        view:
                          item.source === "subtask-review"
                            ? "subitems"
                            : "review",
                      })
                    }
                  >
                    Open {item.source === "subtask-review" ? "subitem" : "task"}{" "}
                    review
                  </Button>
                </Card>
              ))}
            </>
          )}
        </Screen>
      )}
    </>
  );
}
