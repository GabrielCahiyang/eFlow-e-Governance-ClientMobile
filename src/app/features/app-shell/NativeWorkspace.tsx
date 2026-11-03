import { useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Pressable, View } from "../../components/ui/Primitives";
import { SafeAreaView } from "../../components/ui/Primitives";
import {
  NavigationContainer,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import LogOut from "lucide-react-native/icons/log-out";
import Menu from "lucide-react-native/icons/menu";
import UserRound from "lucide-react-native/icons/user-round";
import {
  Button,
  Choice,
  Empty,
  ErrorState,
  Loading,
  Screen,
  Sheet,
  colors,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { EFlowMark } from "../../components/brand/EFlowMark";
import { useMotionPreferences, motionDuration } from "../../shared/motion";
import type { AppRoute, Navigate } from "../../shared/routes";
import { useAuth } from "../authentication";
import {
  useWorkspace,
  WorkspaceProvider,
  WorkspaceCreateSheet,
} from "../workspaces";
import { ProjectScreen, ProjectsScreen } from "../projects";
import {
  TaskDetailsScreen,
  TasksScreen,
  fetchVisibleTasks,
  WorkToolsScreen,
} from "../tasks";
import { ReviewsScreen } from "../reviews";
import { ReportsScreen } from "../reports";
import { TeamScreen, IdentityScreen } from "../team-management";
import {
  PersonalProjectScreen,
  PersonalWorkspaceScreen,
  PersonalWorkFeedScreen,
} from "../personal-work";
import { OfficeTeamScreen } from "../office-team";
import { ActionInbox, usePushInbox } from "../notifications";
import {
  ChatScreen,
  CallProvider,
  AnnouncementsScreen,
} from "../communication";
import { ProfileScreen } from "../profile";
import { SettingsScreen } from "../settings";
import { HelpScreen } from "../help";
import { useFacts } from "../../shared/useFacts";
import { getTaskLeadId } from "../../../core/web/app/features/tasks/selectors/teamMembership";
import { OverviewScreen } from "../dashboard";
import { OfficeBudgetScreen, FinancialReviewsScreen } from "../budget";
import {
  nativeDestinations,
  nativeImplementedSections,
  nativeDefaultSection,
  canOpenNativeSection,
  NativeBottomNavigation,
  NativeSidebar,
  NativeDestinationIcon,
} from "../navigation";
type StackParams = { Workspace: AppRoute };
const Stack = createNativeStackNavigator<StackParams>();
export function NativeWorkspace({
  initialRoute,
}: { initialRoute?: AppRoute } = {}) {
  const { profile } = useAuth(),
    { reduced } = useMotionPreferences();
  return (
    <CallProvider>
      <WorkspaceProvider key={profile?.id}>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: reduced ? "none" : "fade",
              animationDuration: motionDuration.expressiveShort,
            }}
          >
            <Stack.Screen
              name="Workspace"
              component={WorkspaceRoute}
              initialParams={
                initialRoute || {
                  name: nativeDefaultSection(profile?.role || ""),
                }
              }
            />
          </Stack.Navigator>
        </NavigationContainer>
      </WorkspaceProvider>
    </CallProvider>
  );
}
function WorkspaceRoute() {
  const route = useRoute<RouteProp<StackParams, "Workspace">>(),
    nav = useNavigation<NativeStackNavigationProp<StackParams>>();
  const { profile, can, signOut } = useAuth(),
    workspace = useWorkspace();
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [menu, setMenu] = useState(false),
    [error, setError] = useState<Error>();
  const current = route.params;
  const wide = useWindowDimensions().width >= 1024;
  const leadership = useFacts(
    `native-leadership:${profile?.id}`,
    fetchVisibleTasks,
    profile?.role !== "admin",
  );
  const hasLeadingWork = !!leadership.data?.some(
    (task) =>
      !task.archivedAt &&
      !["completed", "cancelled"].includes(task.status) &&
      getTaskLeadId(task) === profile?.id,
  );
  const navigate: Navigate = (next) => {
    setMenu(false);
    if (
      next.name === current.name &&
      next.id === current.id &&
      next.view === current.view &&
      next.nodeId === current.nodeId &&
      next.taskId === current.taskId
    )
      return;
    nav.push("Workspace", next);
  };
  usePushInbox(() => navigate({ name: "inbox" }));
  const chooseWorkspace = async (id: string) => {
    await workspace.select(id);
    navigate({ name: "projects" });
  };
  const back = () => {
    if (nav.canGoBack()) nav.goBack();
    else navigate({ name: "projects" });
  };
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
  else if (current.name === "personal_project" && current.id)
    content = (
      <PersonalProjectScreen
        key={current.id + ":" + (current.taskId || "")}
        id={current.id}
        initialTaskId={current.taskId}
        navigate={navigate}
      />
    );
  else if (
    current.name === "projects" &&
    workspace.selected?.workspace.kind === "personal"
  )
    content = <PersonalWorkspaceScreen navigate={navigate} />;
  else if (current.name === "overview")
    content = <OverviewScreen navigate={navigate} />;
  else if (current.name === "office_team") content = <OfficeTeamScreen />;
  else if (current.name === "inbox" || current.name === "notifications")
    content = <ActionInbox navigate={navigate} />;
  else if (current.name === "messages")
    content = <ChatScreen navigate={navigate} />;
  else if (current.name === "announcements") content = <AnnouncementsScreen />;
  else if (current.name === "financial_reviews")
    content = <FinancialReviewsScreen />;
  else if (current.name === "budget" || current.name.startsWith("accounting_"))
    content = (
      <OfficeBudgetScreen
        key={current.name}
        navigate={navigate}
        initialView={
          current.view ||
          (current.name === "accounting_releases"
            ? "requests"
            : current.name === "accounting_journal"
              ? "journal"
              : current.name === "accounting_audit"
                ? "audit"
                : current.name === "accounting_budgets"
                  ? "annual"
                  : "overview")
        }
      />
    );
  else if (
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
        key={current.id}
        id={current.id}
        initialView={current.view}
        nodeId={current.nodeId}
        navigate={navigate}
      />
    );
  else if (current.name === "projects" && can("navigation.projects"))
    content = <ProjectsScreen navigate={navigate} />;
  else if (
    current.name === "personal_work" ||
    current.name === "subtasks" ||
    current.name === "history" ||
    (current.name === "tasks" && profile?.role !== "head")
  )
    content = (
      <PersonalWorkFeedScreen
        key={current.name}
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
  else if (current.name === "tasks" && can("navigation.tasks"))
    content = <TasksScreen navigate={navigate} personal={false} />;
  else if (current.name === "profile") content = <ProfileScreen />;
  else if (current.name === "settings") content = <SettingsScreen />;
  else if (current.name === "help")
    content = <HelpScreen navigate={navigate} />;
  else if (current.name === "deadlines")
    content = (
      <WorkToolsScreen
        key={current.name}
        kind={current.name}
        navigate={navigate}
      />
    );
  else if (current.name === "reports")
    content = <ReportsScreen navigate={navigate} />;
  else if (
    current.name === "team" ||
    current.name === "intelligence" ||
    current.name === "performance"
  )
    content = (
      <TeamScreen
        key={current.name}
        kind={
          current.name === "team"
            ? "supervision"
            : current.name === "performance"
              ? "performance"
              : "intelligence"
        }
        navigate={navigate}
      />
    );
  else if (current.name === "identity") content = <IdentityScreen />;
  else if (current.name === "reviews")
    content = <ReviewsScreen navigate={navigate} />;
  else
    content = (
      <Screen>
        <Empty
          title="This destination is not available in this native build"
          description="The full port is still in progress. This build has not passed feature parity acceptance."
        />
      </Screen>
    );
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nav.canGoBack() ? "Go back" : "Open navigation"}
          onPress={nav.canGoBack() ? back : () => setMenu(true)}
          style={s.icon}
        >
          {nav.canGoBack() ? (
            <ArrowLeft color={colors.text} size={22} />
          ) : (
            <Menu color={colors.text} size={22} />
          )}
        </Pressable>
        <EFlowMark height={32} />
        <View style={s.divider} />
        <Text style={s.city}>LGU Ormoc City</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open account and navigation"
          onPress={() => setMenu(true)}
          style={s.icon}
        >
          <UserRound color={colors.primary} size={22} />
        </Pressable>
      </View>
      <View style={s.body}>
        {!!wide && (
          <NativeSidebar
            actorId={profile?.id || ""}
            role={profile?.role || ""}
            can={can}
            leading={hasLeadingWork}
            current={current}
            navigate={navigate}
            workspaceId={workspace.selected?.workspace.id || ""}
            workspaces={workspace.workspaces}
            projects={workspace.selected?.projects || []}
            loaded={!!workspace.selected && !workspace.loading}
            selectWorkspace={(id) => void chooseWorkspace(id)}
          />
        )}
        <View style={s.main}>
          {workspace.error ? (
            <Screen>
              <ErrorState
                error={workspace.error}
                retry={() => void workspace.refresh()}
              />
            </Screen>
          ) : workspace.loading && !workspace.selected ? (
            <Screen>
              <Loading />
            </Screen>
          ) : (
            content
          )}
        </View>
      </View>
      {!wide && (
        <NativeBottomNavigation
          projectContext={current.name === "task" && !!current.projectId}
          role={profile?.role || ""}
          can={can}
          current={current.name}
          navigate={navigate}
          onMore={() => setMenu(true)}
        />
      )}
      {!!creatingWorkspace && (
        <WorkspaceCreateSheet
          kind="workspace"
          actor={profile!.id}
          context="new"
          onClose={() => setCreatingWorkspace(false)}
          onCreated={async (id) => {
            await workspace.refresh();
            await chooseWorkspace(id);
          }}
        />
      )}
      <Sheet
        open={menu}
        title="Workspace"
        description={
          workspace.selected?.workspace.name || profile?.full_name || "eFlow"
        }
        onClose={() => setMenu(false)}
        presentation="inspector"
      >
        {!!(profile?.role !== "admin") && (
          <Choice
            label="Workspace"
            value={workspace.selected?.workspace.id || ""}
            onChange={(id: string) => void chooseWorkspace(id)}
            options={workspace.workspaces.map((w) => ({
              value: w.id,
              label: w.name,
            }))}
          />
        )}
        {!!(profile?.role !== "admin") && (
          <Button
            variant="outline"
            onPress={() => {
              setMenu(false);
              setCreatingWorkspace(true);
            }}
          >
            Create personal workspace
          </Button>
        )}
        {nativeDestinations(profile?.role || "", can, hasLeadingWork)
          .filter((item) => nativeImplementedSections.has(item.id))
          .map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              icon={
                <NativeDestinationIcon name={item.id} color={colors.primary} />
              }
              onPress={() => navigate({ name: item.id })}
            >
              {item.label}
            </Button>
          ))}
        <Button
          variant="outline"
          icon={<LogOut color={colors.text} size={18} />}
          onPress={() => void signOut().catch(setError)}
        >
          Sign out
        </Button>
        {!!error && <ErrorState error={error} />}
      </Sheet>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { width: 1, height: 24, backgroundColor: colors.border },
  city: { flex: 1, color: colors.muted, fontSize: 12, flexShrink: 1 },
});
