import { createContext, useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useIsFocused,
  useNavigationContainerRef,
  type NavigatorScreenParams,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { useAuth } from "../authentication";
import { useWorkspace } from "../workspaces";
import type { Workspace } from "../../../core/web/app/features/workspaces/types";
import { useInboxIndicator, usePushInbox } from "../notifications";
import { InboxCountsContext } from "../notifications/inboxCountsContext";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Screen,
} from "../../components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { WorkspaceNavigationContext } from "../workspaces/WorkspaceNavigation";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import LogOut from "lucide-react-native/icons/log-out";
import { useMotionPreferences } from "../../shared/motion";
import { isMobileRole } from "../../shared/mobileRoles";
import { feedback } from "../../shared/userMessages";
import type { AppRoute, Navigate, PrimaryTab } from "../../shared/routes";
import { MobileContent } from "../app-shell/MobileContent";
import { NativeBottomNavigation } from "./NativeBottomNavigation";
import { MoreScreen } from "./MoreScreen";
import { UnavailableDestination } from "./UnavailableDestination";
import { NavigationHeaderContext } from "./navigationHeaderContext";
import { TabRootContext } from "./tabRootContext";
import {
  bindWorkspace,
  defaultTab,
  primaryTabs,
  resolveMobileRoute,
  routeFitsWorkspace,
  tabLabels,
  tabRootRoute,
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
// Workspace switching is not offered on mobile: the app uses the actor's own
// Office and selects another authorized workspace only when an opened record
// requires it.
const noWorkspaceChooser = {
  openWorkspace: () => {},
  openFavorites: () => {},
  chooseWorkspace: async () => {},
  workspaceChooserOpen: false,
};

type TabRouteParams = {
  name?: string;
  id?: string;
  taskId?: string;
  projectId?: string;
};

/** Focused chat conversations hide the floating tab bar so the composer owns the bottom edge. */
function hidesTabBar(routeName?: string, params?: TabRouteParams): boolean {
  return (
    routeName === "Destination" &&
    params?.name === "messages" &&
    Boolean(params.id || params.taskId || params.projectId)
  );
}

/** Order authorized workspaces by how likely they hold the route's record. */
function workspaceCandidates(route: AppRoute, workspaces: Workspace[]) {
  const rank = (item: Workspace) =>
    item.id === route.workspaceId
      ? 0
      : route.workspaceKind && item.kind === route.workspaceKind
        ? 1
        : route.name === "personal_project"
          ? item.kind === "personal"
            ? 2
            : 3
          : item.kind === "office"
            ? 2
            : 3;
  return [...workspaces].sort((a, b) => rank(a) - rank(b));
}

export function MobileNavigator({ initialRoute }: { initialRoute?: AppRoute }) {
  const { profile, signOut, can } = useAuth(),
    workspace = useWorkspace(),
    palette = useTheme(),
    { isDark } = useAppearance();
  const role = profile?.role || "",
    navigation = useNavigationContainerRef<TabParams>();
  const initialTab = initialRoute
    ? resolveMobileRoute(initialRoute, role, () => true).tab
    : defaultTab();
  const pendingPush = useRef(false);
  const openInbox = () => {
    if (navigation.isReady()) navigation.navigate("inbox");
    else pendingPush.current = true;
  };
  usePushInbox(openInbox);
  const inbox = useInboxIndicator(isMobileRole(role) ? profile?.id : undefined);
  if (!isMobileRole(role))
    return (
      <Screen title="Mobile access unavailable">
        <ErrorState error={feedback.invalidCredentials} />
        <Button
          icon={<LogOut size={16} color={palette.onPrimary} />}
          onPress={() => void signOut()}
        >
          Back to sign in
        </Button>
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
    <InboxCountsContext.Provider value={inbox}>
    <ShellContext.Provider value={noWorkspaceChooser}>
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
              const stack = state.routes[state.index].state;
              const top = stack?.routes[stack.index ?? stack.routes.length - 1];
              const params = top?.params as TabRouteParams | undefined;
              if (hidesTabBar(top?.name, params)) return null;
              return (
                <NativeBottomNavigation
                  role={role}
                  inboxUnread={inbox.unread}
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
      </View>
    </ShellContext.Provider>
    </InboxCountsContext.Provider>
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
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: reduced ? "none" : "default",
        }}
      >
        <Stack.Screen
          name="Root"
          component={MobileRoute}
          initialParams={tabRootRoute(tab)}
          options={{
            title: tabLabels[tab],
          }}
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
    workspace = useWorkspace(),
    focused = useIsFocused(),
    inset = useSafeAreaInsets(),
    palette = useTheme(),
    { profile, can } = useAuth();
  const destination = resolveMobileRoute(
    route.params,
    profile?.role || "",
    can,
    tab,
  );
  // Automatic workspace selection (there is no switcher). The Projects tab
  // always shows the actor's own Office; an opened record moves to the
  // authorized workspace that holds it. Only the visible screen may switch,
  // and each record tries each workspace at most once, so screens kept
  // mounted underneath can never fight over the selection.
  const homeOffice = workspace.workspaces.find(
    (item) => item.kind === "office" && item.office_id === profile?.org_id,
  );
  // Tab roots that summarise the Office (Home, Projects, Accounting).
  const wantsHome =
    route.name === "Root" &&
    ["overview", "projects", "accounting_overview"].includes(
      destination.route.name,
    );
  const routeKey = JSON.stringify(destination.route);
  const current = workspace.selected?.workspace.id;
  const mismatch =
    !workspace.loading &&
    !!workspace.selected &&
    (wantsHome
      ? !!homeOffice && current !== homeOffice.id
      : !routeFitsWorkspace(destination.route, workspace.selected));
  const attempts = useRef({ key: "", tried: new Set<string>() });
  const [unavailableKey, setUnavailableKey] = useState<string>();
  useEffect(() => {
    if (!focused || !mismatch || !current) return;
    if (attempts.current.key !== routeKey)
      attempts.current = { key: routeKey, tried: new Set() };
    const { tried } = attempts.current;
    tried.add(current);
    const next = wantsHome
      ? homeOffice && !tried.has(homeOffice.id)
        ? homeOffice
        : undefined
      : workspaceCandidates(destination.route, workspace.workspaces).find(
          (item) => !tried.has(item.id),
        );
    if (!next) {
      setUnavailableKey(routeKey);
      return;
    }
    tried.add(next.id);
    void workspace.select(next.id);
  }, [focused, mismatch, current, routeKey]);
  const navigate: Navigate = (next) => {
    const rootTab =
      next.name === "inbox" && next.view === "decisions"
        ? "reviews"
        : primaryTabs(profile?.role || "").find(
            (item) =>
              item !== "more" &&
              item !== "reviews" &&
              tabRoots[item] === next.name,
          );
    if (
      rootTab &&
      !next.id &&
      (!next.view || rootTab === "reviews") &&
      !next.originTab
    ) {
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
  const headerContext = {
    onBack:
      route.name === "Root"
        ? () => navigation.getParent()?.navigate("home", { screen: "Root", pop: true })
        : back,
    backHint:
      route.name === "Root" ? "Returns to Home" : "Returns to previous screen",
    topInset: inset.top,
    bottomInset: hidesTabBar(route.name, destination.route)
      ? 0
      : Math.max(12, inset.bottom) + 84,
    routeTitle: destination.title,
  };
  const needsWorkspace = [
    "projects",
    "project",
    "personal_project",
    "task",
  ].includes(destination.route.name);
  // The More stack's root is always the full-page More list.
  const screenContent =
    route.name === "Root" &&
    tab === "more" &&
    route.params?.name === tabRoots.more ? (
      <MoreScreen navigate={navigate} />
    ) : destination.disposition !== "native" ? (
      <UnavailableDestination
        destination={destination}
        onBack={back}
        backLabel={route.name === "Root" ? "More" : undefined}
      />
    ) : needsWorkspace && workspace.loading ? (
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
    ) : needsWorkspace && workspace.error ? (
      <Screen title={tabLabels[tab]}>
        <ErrorState
          error={workspace.error}
          retry={() => void workspace.refresh()}
        />
      </Screen>
    ) : needsWorkspace && !workspace.selected ? (
      <Screen title={tabLabels[tab]} onRefresh={() => workspace.refresh()}>
        <Empty
          kind="workspace"
          title="No workspace available"
          description="Projects are shown only inside an authorized Office or personal workspace."
        />
      </Screen>
    ) : mismatch && unavailableKey === routeKey && !wantsHome ? (
      <Screen title={tabLabels[tab]}>
        <Empty
          kind="workspace"
          title="This item isn't available to you"
          description="None of your authorized workspaces include this record. It may have moved or your access changed."
          action={
            <Button
              icon={<ArrowLeft size={16} color={palette.onPrimary} />}
              onPress={() => navigation.popToTop()}
            >
              Back to {tabLabels[tab]}
            </Button>
          }
        />
      </Screen>
    ) : mismatch && unavailableKey !== routeKey ? (
      <Screen compact>
        <Loading label="Opening the right workspace" />
      </Screen>
    ) : (
      <TabRootContext.Provider value={route.name === "Root"}>
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
      </TabRootContext.Provider>
    );
  return (
    <NavigationHeaderContext.Provider value={headerContext}>
      {screenContent}
    </NavigationHeaderContext.Provider>
  );
}
