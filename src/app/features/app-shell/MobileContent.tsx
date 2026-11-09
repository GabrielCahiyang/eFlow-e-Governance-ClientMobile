import { Screen, Empty, ErrorState } from "../../components/ui";
import type { AppRoute, Navigate } from "../../shared/routes";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { ProjectScreen, ProjectsScreen } from "../projects";
import { TaskDetailsScreen } from "../tasks";
import {
  PersonalProjectScreen,
  PersonalWorkFeedScreen,
} from "../personal-work";
import { ActionInbox } from "../notifications";
import { ChatScreen, AnnouncementsScreen } from "../communication";
import { ProfileScreen } from "../profile";
import { SettingsScreen } from "../settings";
import { OverviewScreen } from "../dashboard";
import { OfficeBudgetScreen, FinancialReviewsScreen } from "../budget";
import { OfficePettyCash } from "../office-petty-cash";
import {
  accountingView,
  officeFinanceRoutes,
} from "../budget/mobileFinanceScope";
import { canOpenNativeSection } from "../navigation/nativeNavigation";
import { LinkedWorkNodeScreen } from "../tasks/LinkedWorkNodeScreen";
export function MobileContent({
  current,
  navigate,
}: {
  current: AppRoute;
  navigate: Navigate;
}) {
  const { profile, can } = useAuth(),
    workspace = useWorkspace();
  const hasLeadingWork = false;
  let content;
  if (
    !canOpenNativeSection(
      profile?.role || "",
      current.name,
      can,
      hasLeadingWork,
    )
  )
    content = (
      <Screen title="Access unavailable">
        <ErrorState error="Your current account permissions do not allow this destination." />
      </Screen>
    );
  else if (
    current.nodeId &&
    (current.name === "personal_project" ||
      (current.name === "task" && current.view !== "budget"))
  )
    content = <LinkedWorkNodeScreen route={current} navigate={navigate} />;
  else if (current.name === "personal_project" && current.id)
    content = (
      <PersonalProjectScreen
        key={current.id + ":" + (current.taskId || "")}
        id={current.id}
        initialTaskId={current.taskId}
        navigate={navigate}
      />
    );
  else if (current.name === "overview")
    content = <OverviewScreen navigate={navigate} />;
  else if (current.name === "inbox" || current.name === "notifications")
    content = <ActionInbox navigate={navigate} initialView={current.view} />;
  else if (current.name === "messages")
    content = <ChatScreen navigate={navigate} route={current} />;
  else if (current.name === "announcements") content = <AnnouncementsScreen />;
  else if (current.name === "financial_reviews")
    content =
      (current.recordType === "office_petty_cash" ||
        (current.recordType === "office_petty_cash_staffing" &&
          profile?.role === "head")) &&
      profile?.org_id &&
      (!current.financialOfficeId ||
        current.financialOfficeId === profile.org_id) ? (
        <Screen title="Office petty cash">
          <OfficePettyCash
            office={profile.org_id}
            requestId={current.recordId}
          />
        </Screen>
      ) : (
        <FinancialReviewsScreen
          key={current.recordId || current.id}
          recordId={current.recordId || current.id}
          recordType={current.recordType}
        />
      );
  else if (officeFinanceRoutes.includes(current.name)) {
    const view = accountingView(
      current.view ??
        (current.name === "accounting_releases" ? "requests" : undefined),
    );
    content =
      view === "reviews" ? (
        <FinancialReviewsScreen recordId={current.recordId || current.id} />
      ) : view ? (
        <OfficeBudgetScreen
          key={current.name + ":" + view}
          navigate={navigate}
          initialView={view}
          recordId={current.recordId}
          officeId={current.financialOfficeId}
          fiscalYear={current.fiscalYear}
        />
      ) : (
        <Screen title="Office finance">
          <Empty title="This financial view is available in eFlow Web" />
        </Screen>
      );
  } else if (
    current.name === "project" &&
    current.id &&
    can("navigation.projects")
  )
    content = (
      <ProjectScreen
        key={current.id}
        id={current.id}
        initialView={current.view}
        navigate={navigate}
      />
    );
  else if (current.name === "task" && current.id && can("navigation.tasks"))
    content = (
      <TaskDetailsScreen
        key={
          current.id +
          ":" +
          (current.nodeId || "") +
          ":" +
          (current.recordId || "")
        }
        id={current.id}
        projectId={current.projectId}
        initialView={current.view}
        nodeId={current.nodeId}
        submissionId={current.view === "review" ? current.recordId : undefined}
        financialRecordId={
          current.view === "budget" ? current.recordId : undefined
        }
        navigate={navigate}
      />
    );
  else if (current.name === "projects" && can("navigation.projects"))
    content = <ProjectsScreen navigate={navigate} />;
  else if (
    current.name === "personal_work" ||
    current.name === "subtasks" ||
    current.name === "history"
  )
    content = (
      <PersonalWorkFeedScreen
        key={current.name + ":" + (current.view || "")}
        dueOnly={current.view === "deadlines"}
        initial={
          current.name === "subtasks"
            ? "Subtasks"
            : current.name === "history"
              ? "History"
              : "Assigned work"
        }
        navigate={navigate}
      />
    );
  else if (current.name === "profile") content = <ProfileScreen />;
  else if (current.name === "settings")
    content = <SettingsScreen initialView={current.view} navigate={navigate} />;
  else
    content = (
      <Screen>
        <Empty
          title="This page is not available on mobile"
          description="Open a supported destination from the bottom navigation or return to the previous screen."
        />
      </Screen>
    );
  return <>{content}</>;
}
