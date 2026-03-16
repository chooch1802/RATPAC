import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: "home", inactive: "home-outline" },
  Wagers: { active: "trophy", inactive: "trophy-outline" },
  Feed: { active: "newspaper", inactive: "newspaper-outline" },
  Groups: { active: "people", inactive: "people-outline" },
  Profile: { active: "person", inactive: "person-outline" },
};

type CustomTabBarProps = {
  state: any;
  descriptors: any;
  navigation: any;
};

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const setCreateWagerVisible = useAppStore((s) => s.setCreateWagerVisible);
  const notifications = useAppStore((s) => s.notifications);
  const wagers = useAppStore((s) => s.wagers);
  const user = useAppStore((s) => s.user);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingResponseCount = wagers.filter(
    (w) => w.status === "PENDING" && w.opponentHandle === user.handle
  ).length;

  const routes = state.routes as Array<{ key: string; name: string }>;

  return (
    <View style={styles.container}>
      {/* Left tabs: Home, Wagers */}
      <View style={styles.half}>
        {routes.slice(0, 2).map((route, i) => {
          const isFocused = state.index === i;
          const icons = TAB_ICONS[route.name] ?? { active: "●", inactive: "○" };

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) {
              return;
            }

            if (route.name === "Wagers" && pendingResponseCount > 0) {
              navigation.navigate("Wagers", {
                initialFilter: "NEEDS_RESPONSE",
                filterRequestId: Date.now(),
              });
              return;
            }

            if (!isFocused) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable key={route.key} style={styles.tab} onPress={onPress}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={22}
                  color={isFocused ? theme.colors.accent : theme.colors.textMuted}
                />
                {route.name === "Wagers" && pendingResponseCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {pendingResponseCount > 9 ? "9+" : pendingResponseCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* FAB */}
      <Pressable style={styles.fabWrapper} onPress={() => setCreateWagerVisible(true)}>
        <View style={styles.fab}>
          <Text style={styles.fabIcon}>+</Text>
        </View>
      </Pressable>

      {/* Right tabs: Feed, Profile */}
      <View style={styles.half}>
        {routes.slice(2).map((route, i) => {
          const actualIndex = i + 2;
          const isFocused = state.index === actualIndex;
          const icons = TAB_ICONS[route.name] ?? { active: "●", inactive: "○" };

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable key={route.key} style={styles.tab} onPress={onPress}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={22}
                  color={isFocused ? theme.colors.accent : theme.colors.textMuted}
                />
                {route.name === "Profile" && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    alignItems: "flex-end",
  },
  half: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    flex: 1,
    gap: 3,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.destructive,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.tabBar,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: theme.colors.accent,
  },
  tabLabelInactive: {
    color: theme.colors.textMuted,
  },
  fabWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: "#001B10",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
});
