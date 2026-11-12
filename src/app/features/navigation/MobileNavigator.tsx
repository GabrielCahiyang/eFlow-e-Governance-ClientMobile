import { createContext, useContext, useRef, useState } from "react";
import { View, Pressable, AccessibilityInfo } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useNavigationContainerRef,
  type NavigatorScreenParams,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import Building from "lucide-react-native/icons/building-complex";
import User from "lucide-react-native/icons/user-round";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import { useInboxIndicator, usePushInbox } from "../notifications";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Screen,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { WorkspaceNavigationContext } from "../workspaces/WorkspaceNavigation";
import { WorkspaceSheet } from "../workspaces/WorkspaceSheet";
import { useWorkspaceFavorites } from "../workspaces/useWorkspaceFavorites";
import { ProfileToolbarTitle } from "./ProfileToolbarTitle";
import { EFlowMark } from "../../components/brand/EFlowMark";
import { useMotionPreferences } from "../../shared/motion";
import { isMobileRole } from "../../shared/mobileRoles";
import { feedback } from "../../shared/userMessages";
import type { AppRoute, Navigate, PrimaryTab } from "../../shared/routes";
import { MobileContent } from "../app-shell/MobileContent";
import { NativeBottomNavigation } from "./NativeBottomNavigation";
import { MoreScreen } from "./MoreScreen";
import { UnavailableDestination } from "./UnavailableDestination";
import {
  bindWorkspace,
  defaultTab,
  primaryTabs,
  resolveMobileRoute,
  routeFitsWorkspace,
  tabLabels,
  tabRoots,
} from "./mobileScope";

type StackParams = { Root: AppRoute; Destination: AppRoute };
type TabParams = Record<
  PrimaryTab,
  NavigatorScreenParams<StackParams> | undefined
>;
const Tabs = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<StackParams>();
const TabContext = createContext<PrimaryTab>("home");
const ShellContext = WorkspaceNavigationContext;

export function MobileNavigator({ initialRoute }: { initialRoute?: AppRoute }) {
  const { profile, signOut } = useAuth(),
    workspace = useWorkspace(),
    palette = useTheme(),
    { isDark } = useAppearance();
  const role = profile?.role || "",
    navigation = useNavigationContainerRef<TabParams>();
  const initialTab = initialRoute
    ? resolveMobileRoute(initialRoute, role, () => true).tab
    : defaultTab();
  const pendingPush = useRef(false),
    [chooser, setChooser] = useState(false);
  const [chooserMode, setChooserMode] = useState<"all" | "favorites">("all");
  const workspaceFavorites = useWorkspaceFavorites();
  const openInbox = () => {
    if (navigation.isReady()) navigation.navigate("inbox");
    else pendingPush.current = true;
  };
  usePushInbox(openInbox);
  const inboxUnread = useInboxIndicator(isMobileRole(role) ? profile?.id : undefined);
  const chooseWorkspace = async (id: string) => {
    setChooser(false);
    if (id === workspace.selected?.workspace.id) return;
    const selected = await workspace.select(id);
    AccessibilityInfo.announceForAccessibility(
      selected
        ? `Switched to ${selected.workspace.name}, ${selected.workspace.kind === "office" ? "Office" : "Personal"} workspace.`
        : "Could not switch workspaces. Open the workspace chooser to try again.",
    );
  };
  if (!isMobileRole(role))
    return (
      <Screen title="Mobile access unavailable">
        <ErrorState error={feedback.invalidCredentials} />
        <Button onPress={() => void signOut()}>Back to sign in</Button>
      </Screen>
    );
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger,
    },
  };
  const initialState = initialRoute
    ? {
        index: primaryTabs(role).indexOf(initialTab),
        routes: primaryTabs(role).map((tab) => ({
          name: tab,
          state: {
            index: tab === initialTab ? 1 : 0,
            routes: [
              { name: "Root", params: { name: tabRoots[tab] } },
              ...(tab === initialTab
                ? [{ name: "Destination", params: initialRoute }]
                : []),
            ],
          },
        })),
      }
    : undefined;
  return (
    <ShellContext.Provider
      value={{
        openWorkspace: () => {
          setChooserMode("all");
          setChooser(true);
        },
        openFavorites: () => {
          setChooserMode("favorites");
          setChooser(true);
        },
        chooseWorkspace,
        workspaceChooserOpen: chooser,
      }}
    >
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <NavigationContainer
          key={profile!.id + ":" + role}
          ref={navigation}
          theme={theme}
          initialState={initialState}
          onReady={() => {
            if (pendingPush.current) {
              pendingPush.current = false;
              navigation.navigate("inbox");
            }
          }}
        >
          <Tabs.Navigator
            initialRouteName={initialTab}
            backBehavior="history"
            screenOptions={{
              headerShown: false,
              animation: "none",
              lazy: true,
            }}
            tabBar={({ state, navigation: tabs }) => {
              // An open conversation is a focused task: hide the tab bar so
              // the composer owns the bottom edge (Messenger/WhatsApp style).
              const stack = state.routes[state.index].state;
              const top = stack?.routes[stack.index ?? stack.routes.length - 1];
              const params = top?.params as
                | {
                    name?: string;
                    id?: string;
                    taskId?: string;
                    projectId?: string;
                  }
                | undefined;
              if (
                top?.name === "Destination" &&
                params?.name === "messages" &&
                (params.id || params.taskId || params.projectId)
              )
                return null;
              return (
                <NativeBottomNavigation
                  role={role}
                  inboxUnread={inboxUnread}
                  selected={state.routes[state.index].name as PrimaryTab}
                  onSelect={(tab) => {
                    const event = tabs.emit({
                      type: "tabPress",
                      target: state.routes.find((route) => route.name === tab)
                        ?.key,
                      canPreventDefault: true,
                    });
                    if (!event.defaultPrevented) tabs.navigate(tab);
                  }}
                />
              );
            }}
          >
            {primaryTabs(role).map((tab) => (
              <Tabs.Screen key={tab} name={tab}>
                {() => <MobileTabStack tab={tab} />}
              </Tabs.Screen>
            ))}
          </Tabs.Navigator>
        </NavigationContainer>
        <WorkspaceSheet
          open={chooser}
          mode={chooserMode}
          workspaces={workspaceFavorites.available}
          favorites={workspaceFavorites.favorites}
          selectedId={workspace.selected?.workspace.id}
          loading={workspace.loading}
          error={workspace.error}
          onRetry={() => void workspace.refresh()}
          onToggleFavorite={workspaceFavorites.toggle}
          onSelect={(id) => void chooseWorkspace(id)}
          onClose={() => setChooser(false)}
        />
      </View>
    </ShellContext.Provider>
  );
}

function WorkspaceButton() {
  const workspace = useWorkspace(),
    { openWorkspace, workspaceChooserOpen } = useContext(ShellContext),
    palette = useTheme();
  const personal = workspace.selected?.workspace.kind === "personal",
    Icon = personal ? User : Building;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: workspaceChooserOpen }}
      accessibilityLabel={`Switch workspace. Current: ${workspace.selected?.workspace.name || "No workspace selected"}`}
      onPress={openWorkspace}
      style={({ pressed }) => ({
        maxWidth: 132,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: pressed ? palette.primarySoft : palette.surface,
      })}
    >
      <Icon size={16} color={palette.primary} />
      <View style={{ flexShrink: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, lineHeight: 14, color: palette.mutedLabel }}
        >
          {personal ? "Personal" : "Office"}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "600",
            color: palette.text,
          }}
        >
          {workspace.selected?.workspace.name || "Choose workspace"}
        </Text>
      </View>
      <ChevronDown size={14} color={palette.mutedLabel} />
    </Pressable>
  );
}

function MobileTabStack({ tab }: { tab: PrimaryTab }) {
  const palette = useTheme(),
    { reduced } = useMotionPreferences(),
    { profile, can } = useAuth();
  return (
    <TabContext.Provider value={tab}>
      <Stack.Navigator
        initialRouteName="Root"
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerTintColor: palette.primary,
          headerTitleStyle: { fontFamily: "Figtree_600SemiBold", fontSize: 19 },
          contentStyle: { backgroundColor: palette.background },
          headerRight: () => <WorkspaceButton />,
          animation: reduced ? "none" : "default",
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen
          name="Root"
          component={MobileRoute}
          initialParams={{ name: tabRoots[tab] }}
          options={({ navigation }) => ({
            title: tabLabels[tab],
            headerTitle: () =>
              tab === "home" ? (
                <ProfileToolbarTitle
                  name={profile?.full_name || "Your account"}
                  onPress={() =>
                    navigation.push("Destination", {
                      name: "profile",
                      originTab: tab,
                    })
                  }
                />
              ) : (
                <EFlowMark height={20} />
              ),
          })}
        />
        <Stack.Screen
          name="Destination"
          component={MobileRoute}
          options={({ route }) => ({
            title: resolveMobileRoute(
              route.params,
              profile?.role || "",
              can,
              tab,
            ).title,
          })}
        />
      </Stack.Navigator>
    </TabContext.Provider>
  );
}

function MobileRoute({
  route,
  navigation,
}: NativeStackScreenProps<StackParams, keyof StackParams>) {
  const tab = useContext(TabContext),
    { openWorkspace } = useContext(ShellContext),
    workspace = useWorkspace(),
    { profile, can } = useAuth();
  const destination = resolveMobileRoute(
    route.params,
    profile?.role || "",
    can,
    tab,
  );
  const navigate: Navigate = (next) => {
    const rootTab = primaryTabs(profile?.role || "").find(
      (item) => item !== "more" && tabRoots[item] === next.name,
    );
    if (rootTab && !next.id && !next.view && !next.originTab) {
      navigation.getParent()?.navigate(rootTab, { screen: "Root", pop: true });
      return;
    }
    const target = resolveMobileRoute(
      bindWorkspace(next, workspace.selected),
      profile?.role || "",
      can,
      tab,
    );
    if (
      route.name === "Destination" &&
      JSON.stringify(target.route) === JSON.stringify(destination.route)
    )
      return;
    if (target.tab !== tab) {
      navigation.getParent()?.navigate(target.tab, {
        screen: "Destination",
        params: target.route,
        initial: false,
      });
      return;
    }
    navigation.push("Destination", target.route);
  };
  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.getParent()?.navigate("more");
  };
  if (route.name === "Root" && tab === "more")
    return <MoreScreen navigate={navigate} />;
  if (destination.disposition !== "native")
    return (
      <UnavailableDestination
        destination={destination}
        onBack={back}
        backLabel={route.name === "Root" ? "More" : undefined}
      />
    );
  const needsWorkspace = [
    "projects",
    "project",
    "personal_project",
    "task",
  ].includes(destination.route.name);
  if (needsWorkspace && workspace.loading)
    return (
      <Screen compact>
        <Loading
          label="Loading authorized workspace"
          layout={
            destination.route.name === "projects"
              ? "projects"
              : destination.route.name === "project"
                ? "project"
                : destination.route.name === "personal_project"
                  ? "personalProject"
                  : "task"
          }
        />
      </Screen>
    );
  if (needsWorkspace && workspace.error)
    return (
      <Screen>
        <ErrorState
          error={workspace.error}
          retry={() => void workspace.refresh()}
        />
        <Button variant="outline" onPress={openWorkspace}>
          Choose another workspace
        </Button>
      </Screen>
    );
  if (needsWorkspace && !workspace.selected)
    return (
      <Screen>
        <Empty
          kind="workspace"
          title="Choose a workspace"
          description="Projects are shown only inside an authorized Office or personal workspace."
          action={<Button onPress={openWorkspace}>Choose workspace</Button>}
        />
      </Screen>
    );
  if (!routeFitsWorkspace(destination.route, workspace.selected))
    return (
      <Screen>
        <Empty
          kind="workspace"
          title="This item belongs to another workspace"
          description="The original work destination has been retained. Switch to its authorized workspace to continue."
          action={<Button onPress={openWorkspace}>Switch workspace</Button>}
        />
        <Button variant="outline" onPress={() => navigation.popToTop()}>
          Back to {tabLabels[tab]}
        </Button>
      </Screen>
    );
  return (
    <MobileContent
      key={[
        profile?.id,
        workspace.selected?.workspace.id,
        destination.route.id,
        destination.route.nodeId,
      ].join(":")}
      current={destination.route}
      navigate={navigate}
    />
  );
}
