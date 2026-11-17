import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
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
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { WorkspaceNavigationContext } from "../workspaces/WorkspaceNavigation";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import { useMotionPreferences } from "../../shared/motion";
import { isMobileRole } from "../../shared/mobileRoles";
import { feedback } from "../../shared/userMessages";
import type { AppRoute, Navigate, PrimaryTab } from "../../shared/routes";
import { MobileContent } from "../app-shell/MobileContent";
import { NativeBottomNavigation } from "./NativeBottomNavigation";
import { MoreScreen } from "./MoreScreen";
import { UnavailableDestination } from "./UnavailableDestination";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MoreSheet } from "./MoreSheet";
import { moreDestinations } from "./moreDestinations";
import { TabRootContext, inPageHeaderTabs } from "./tabRootContext";
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
/** Route the More tab opens on: the pinned destination, or the More list. */
const PinnedRouteContext = createContext<AppRoute | undefined>(undefined);
const pinnedKey = (actor: string) => `eflow.more.pinned.${actor}`;
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
  const [sheetOpen, setSheetOpen] = useState(false),
    [pinnedId, setPinnedId] = useState<string>(),
    [signingOut, setSigningOut] = useState(false);
  const extras = moreDestinations(role, can, !!profile?.org_id);
  const pinned = extras.find((item) => item.id === pinnedId);
  useEffect(() => {
    // Per-device convenience only; a missing or blocked store means no pin.
    let alive = true;
    setPinnedId(undefined);
    if (!profile?.id) return;
    AsyncStorage.getItem(pinnedKey(profile.id))
      .then((value) => {
        if (alive && value) setPinnedId(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [profile?.id]);
  const pick = (id: string, route: AppRoute) => {
    setSheetOpen(false);
    setPinnedId(id);
    if (profile?.id)
      AsyncStorage.setItem(pinnedKey(profile.id), id).catch(() => undefined);
    if (navigation.isReady())
      navigation.navigate("more", { screen: "Root", params: route, pop: true });
  };
  const confirmSignOut = async () => {
    setSheetOpen(false);
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };
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
                  inboxUnread={inbox.unread}
                  pinned={
                    pinned
                      ? { label: pinned.label, Icon: pinned.Icon }
                      : undefined
                  }
                  onMore={() => setSheetOpen(true)}
                  moreOpen={sheetOpen}
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
                {() => (
                  <PinnedRouteContext.Provider
                    value={tab === "more" ? pinned?.route : undefined}
                  >
                    <MobileTabStack tab={tab} />
                  </PinnedRouteContext.Provider>
                )}
              </Tabs.Screen>
            ))}
          </Tabs.Navigator>
        </NavigationContainer>
        <MoreSheet
          open={sheetOpen}
          destinations={extras}
          pinnedId={pinned?.id}
          signingOut={signingOut}
          onPick={(item) => pick(item.id, item.route)}
          onSignOut={() => void confirmSignOut()}
          onClose={() => setSheetOpen(false)}
        />
      </View>
    </ShellContext.Provider>
    </InboxCountsContext.Provider>
  );
}

/** Top-left back arrow to Home on every other tab, like a pushed screen. */
function HomeButton({ onPress }: { onPress: () => void }) {
  const palette = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      accessibilityHint="Returns to Home"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        marginLeft: Platform.OS === "web" ? 4 : -8,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
        backgroundColor: pressed ? palette.primarySoft : "transparent",
      })}
    >
      <ArrowLeft size={24} color={palette.primary} />
    </Pressable>
  );
}

function MobileTabStack({ tab }: { tab: PrimaryTab }) {
  const palette = useTheme(),
    { reduced } = useMotionPreferences(),
    { profile, can } = useAuth(),
    pinnedRoute = useContext(PinnedRouteContext);
  return (
    <TabContext.Provider value={tab}>
      <Stack.Navigator
        initialRouteName="Root"
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerTintColor: palette.primary,
          headerTitleStyle: { fontFamily: "HostGrotesk_600SemiBold", fontSize: 19 },
          contentStyle: { backgroundColor: palette.background },
          animation: reduced ? "none" : "default",
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen
          name="Root"
          component={MobileRoute}
          initialParams={pinnedRoute ?? tabRootRoute(tab)}
          options={({ navigation }) => ({
            title: tabLabels[tab],
            // Home draws its own header inside the page so it scrolls away;
            // other tab roots offer a way back to Home instead of a logo.
            headerShown: !(inPageHeaderTabs as readonly string[]).includes(tab),
            headerTitle: "",
            headerLeft: () => (
              <HomeButton
                onPress={() =>
                  navigation.getParent()?.navigate("home", {
                    screen: "Root",
                    pop: true,
                  })
                }
              />
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
    workspace = useWorkspace(),
    focused = useIsFocused(),
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
  // The More stack's root is the More list unless a destination is pinned.
  if (
    route.name === "Root" &&
    tab === "more" &&
    route.params?.name === tabRoots.more
  )
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
      </Screen>
    );
  if (needsWorkspace && !workspace.selected)
    return (
      <Screen>
        <Empty
          kind="workspace"
          title="No workspace available"
          description="Projects are shown only inside an authorized Office or personal workspace."
          action={
            <Button onPress={() => void workspace.refresh()}>Try again</Button>
          }
        />
      </Screen>
    );
  if (mismatch && unavailableKey === routeKey && !wantsHome)
    return (
      <Screen>
        <Empty
          kind="workspace"
          title="This item isn't available to you"
          description="None of your authorized workspaces include this record. It may have moved or your access changed."
          action={
            <Button onPress={() => navigation.popToTop()}>
              Back to {tabLabels[tab]}
            </Button>
          }
        />
      </Screen>
    );
  if (mismatch && unavailableKey !== routeKey)
    return (
      <Screen compact>
        <Loading label="Opening the right workspace" />
      </Screen>
    );
  return (
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
}
