import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
import { NavigationContainerRef } from "@react-navigation/native";

import { CreateWagerModal } from "./src/components/CreateWagerModal";
import { CustomTabBar } from "./src/components/CustomTabBar";

import FeedScreen from "./src/screens/FeedScreen";
import GroupDetailScreen from "./src/screens/GroupDetailScreen";
import GroupsScreen from "./src/screens/GroupsScreen";
import HomeScreen from "./src/screens/HomeScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SearchScreen from "./src/screens/SearchScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SignInScreen from "./src/screens/SignInScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import GamblingControlsScreen from "./src/screens/GamblingControlsScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import SubscriptionWallScreen from "./src/screens/SubscriptionWallScreen";
import WagerDetailScreen from "./src/screens/WagerDetailScreen";
import WagersScreen from "./src/screens/WagersScreen";

import { checkAndExpireTrials, hasActiveSession, syncProfileForCurrentUser } from "./src/services/auth";
import { registerAndSaveToken } from "./src/services/pushNotifications";
import { initRevenueCat } from "./src/services/subscription";
import {
  subscribeToFeedPostChanges,
  subscribeToNotificationChanges,
  subscribeToWagerChanges,
} from "./src/services/wagers";
import { useAppStore } from "./src/store/useAppStore";
import { theme } from "./src/theme";

// Initialise RevenueCat once at module load
initRevenueCat();

const navigationRef = React.createRef<NavigationContainerRef<any>>();

function parseDeepLink(url: string): { type: "wager"; wagerId: string } | { type: "group_join"; code: string } | null {
  const wagerMatch = url.match(/^ratpac:\/\/wager[?&]id=([^&]+)/);
  if (wagerMatch) return { type: "wager", wagerId: decodeURIComponent(wagerMatch[1]) };
  const groupMatch = url.match(/^ratpac:\/\/group\/join[?&]code=([^&]+)/);
  if (groupMatch) return { type: "group_join", code: decodeURIComponent(groupMatch[1]) };
  return null;
}

const RootStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function SplashScreen() {
  return (
    <View style={splash.container}>
      <Image
        source={require("./assets/ratpac-logo.png")}
        style={splash.logo}
        resizeMode="contain"
      />
      <Text style={splash.tagline}>Bet on your people</Text>
    </View>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 260,
    height: 190,
  },
  tagline: {
    color: theme.colors.textMuted,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
});

function TabsNavigator() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Wagers" component={WagersScreen} />
      <Tabs.Screen name="Groups" component={GroupsScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={TabsNavigator} />
      <AppStack.Screen
        name="WagerDetail"
        component={WagerDetailScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="Search"
        component={SearchScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="GamblingControls"
        component={GamblingControlsScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="Feed"
        component={FeedScreen}
        options={{ presentation: "card" }}
      />
      <AppStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ presentation: "card" }}
      />
    </AppStack.Navigator>
  );
}

function RootFlow() {
  const isAuthed = useAppStore((s) => s.isAuthed);
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const user = useAppStore((s) => s.user);

  // isProUser is intentionally re-evaluated here so the nav tree reacts to
  // subscription / trial changes without a full app remount.
  function isPro(): boolean {
    if (user.isSubscribed) return true;
    if (!user.trialEndsAt) return false;
    return new Date(user.trialEndsAt) > new Date();
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthed ? (
        <RootStack.Screen name="SignIn" component={SignInScreen} />
      ) : !isOnboarded ? (
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !isPro() ? (
        <RootStack.Screen name="SubscriptionWall" component={SubscriptionWallScreen} />
      ) : (
        <RootStack.Screen name="App" component={AppNavigator} />
      )}
    </RootStack.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bgPrimary,
    card: theme.colors.bgSecondary,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    primary: theme.colors.accent,
  },
};

export default function App() {
  const hydrateFromBackend = useAppStore((s) => s.hydrateFromBackend);
  const isLoading = useAppStore((s) => s.isLoading);
  const isAuthed = useAppStore((s) => s.isAuthed);
  const setAuth = useAppStore((s) => s.setAuth);
  const refreshSubscriptionStatus = useAppStore((s) => s.refreshSubscriptionStatus);
  const upsertWager = useAppStore((s) => s.upsertWager);
  const upsertNotification = useAppStore((s) => s.upsertNotification);
  const patchFeedPost = useAppStore((s) => s.patchFeedPost);
  const loadForYouFeed = useAppStore((s) => s.loadForYouFeed);
  const loadGroups = useAppStore((s) => s.loadGroups);

  // Re-hydrate and register push token whenever the user becomes authenticated
  useEffect(() => {
    if (isAuthed) {
      hydrateFromBackend();
      registerAndSaveToken();
      loadForYouFeed();
      loadGroups();
    }
  }, [isAuthed, hydrateFromBackend, loadForYouFeed, loadGroups]);

  useEffect(() => {
    async function bootstrap() {
      const active = await hasActiveSession();
      if (active) {
        await checkAndExpireTrials();
        await syncProfileForCurrentUser();
        await refreshSubscriptionStatus();
        setAuth(true);
      }
    }
    bootstrap();
  }, [refreshSubscriptionStatus, setAuth]);

  useEffect(() => {
    if (!isAuthed) return;

    let unsubscribe: (() => void) | null = null;
    let disposed = false;

    subscribeToWagerChanges((wager) => {
      upsertWager(wager);
    }).then((cleanup) => {
      if (disposed) {
        cleanup?.();
        return;
      }
      unsubscribe = cleanup;
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [isAuthed, upsertWager]);

  useEffect(() => {
    if (!isAuthed) return;

    let unsubscribe: (() => void) | null = null;
    let disposed = false;

    subscribeToNotificationChanges((notification) => {
      upsertNotification(notification);
    }).then((cleanup) => {
      if (disposed) {
        cleanup?.();
        return;
      }
      unsubscribe = cleanup;
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [isAuthed, upsertNotification]);

  useEffect(() => {
    if (!isAuthed) return;

    let unsubscribe: (() => void) | null = null;
    let disposed = false;

    subscribeToFeedPostChanges((post) => {
      patchFeedPost(post.id, { reactions: post.reactions, comments: post.comments });
    }).then((cleanup) => {
      if (disposed) {
        cleanup?.();
        return;
      }
      unsubscribe = cleanup;
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [isAuthed, patchFeedPost]);

  const pendingLinkRef = useRef<string | null>(null);

  useEffect(() => {
    function process(url: string | null) {
      if (!url) return;
      const parsed = parseDeepLink(url);
      if (!parsed) return;
      if (!isAuthed) {
        pendingLinkRef.current = url;
        return;
      }
      if (parsed.type === "wager") {
        (navigationRef.current as any)?.navigate("WagerDetail", { wagerId: parsed.wagerId });
      } else if (parsed.type === "group_join") {
        useAppStore.getState().setPendingGroupJoinCode(parsed.code);
      }
    }

    Linking.getInitialURL().then(process);
    const sub = Linking.addEventListener("url", ({ url }) => process(url));
    return () => sub.remove();
  }, [isAuthed]);

  // Process any link that arrived before auth was ready
  useEffect(() => {
    if (!isAuthed || !pendingLinkRef.current) return;
    const url = pendingLinkRef.current;
    pendingLinkRef.current = null;
    const parsed = parseDeepLink(url);
    if (!parsed) return;
    if (parsed.type === "wager") {
      (navigationRef.current as any)?.navigate("WagerDetail", { wagerId: parsed.wagerId });
    } else if (parsed.type === "group_join") {
      useAppStore.getState().setPendingGroupJoinCode(parsed.code);
    }
  }, [isAuthed]);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style="light" />
      {isLoading ? <SplashScreen /> : <RootFlow />}
      <CreateWagerModal />
    </NavigationContainer>
  );
}
