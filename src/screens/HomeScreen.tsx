import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WagerCard } from "../components/WagerCard";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { Wager } from "../types";

function StatBox({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  value: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});

function MiniWagerCard({ wager, onPress }: { wager: Wager; onPress?: () => void }) {
  const statusColors: Record<string, string> = {
    ACTIVE: theme.colors.accent,
    PENDING: theme.colors.pending,
    AWAITING_RESULT: theme.colors.pending,
    DISPUTED: theme.colors.destructive,
    SETTLED: theme.colors.textMuted,
    VOIDED: theme.colors.textMuted,
    EXPIRED: theme.colors.textMuted,
  };
  const statusColor = statusColors[wager.status] ?? theme.colors.textMuted;

  return (
    <Pressable onPress={onPress} style={miniStyles.card}>
      <View style={miniStyles.row}>
        <Text style={miniStyles.activity}>{wager.activity}</Text>
        <View style={[miniStyles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}1A` }]}>
          <Text style={[miniStyles.badgeText, { color: statusColor }]}>{wager.status}</Text>
        </View>
      </View>
      <Text style={miniStyles.amount}>${wager.amount.toFixed(2)}</Text>
      <Text style={miniStyles.vs}>vs {wager.opponentDisplayName ?? wager.opponentHandle}</Text>
    </Pressable>
  );
}

const miniStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    width: 160,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activity: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  amount: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },
  vs: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});

export default function HomeScreen({ navigation }: { navigation: any }) {
  const user = useAppStore((s) => s.user);
  const wagers = useAppStore((s) => s.wagers);
  const feed = useAppStore((s) => s.feed);
  const notifications = useAppStore((s) => s.notifications);
  const setCreateWagerVisible = useAppStore((s) => s.setCreateWagerVisible);

  const activeWagers = wagers.filter((w) => w.status === "ACTIVE");
  const pendingWagers = wagers.filter((w) => w.status === "PENDING");
  const unreadCount = notifications.filter((n) => !n.read).length;

  const recentFeed = feed.slice(0, 3);

  const record = `${user.wins}W — ${user.losses}L`;
  const totalWagered = `$${user.totalWagered.toFixed(0)}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/ratpac-logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("Search")}>
            <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name={unreadCount > 0 ? "notifications" : "notifications-outline"} size={20} color={unreadCount > 0 ? theme.colors.accent : theme.colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>Hey, {user.handle}</Text>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <StatBox label="Record" value={record} />
          <View style={styles.statSpacer} />
          <StatBox
            label="Active"
            value={String(activeWagers.length)}
            valueColor={activeWagers.length > 0 ? theme.colors.accent : undefined}
          />
          <View style={styles.statSpacer} />
          <StatBox label="Wagered" value={totalWagered} />
        </View>

        {/* Pending challenges */}
        {pendingWagers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Challenges
              <Text style={styles.sectionCount}> {pendingWagers.length}</Text>
            </Text>
            {pendingWagers.map((w) => (
              <MiniWagerCard key={w.id} wager={w} />
            ))}
          </View>
        )}

        {/* Active wagers horizontal scroll */}
        {activeWagers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Wagers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {activeWagers.map((w) => (
                <MiniWagerCard key={w.id} wager={w} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick create CTA if no wagers */}
        {wagers.length === 0 && (
          <Pressable style={styles.emptyState} onPress={() => setCreateWagerVisible(true)}>
            <Ionicons name="trophy-outline" size={48} color={theme.colors.textMuted} style={styles.emptyStateIcon} />
            <Text style={styles.emptyStateTitle}>Make your first wager</Text>
            <Text style={styles.emptyStateDesc}>
              Challenge a friend to golf, darts, pool and more.
            </Text>
            <View style={styles.emptyStateCta}>
              <Text style={styles.emptyStateCtaText}>Create a wager</Text>
            </View>
          </Pressable>
        )}

        {/* Recent feed */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => navigation.navigate("Feed")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {recentFeed.map((post) => (
            <WagerCard key={post.id} post={post} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logoImage: {
    width: 140,
    height: 34,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: {
    fontSize: 18,
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  greeting: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 24,
  },
  statSpacer: { width: 10 },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionCount: {
    color: theme.colors.accent,
    fontWeight: "800",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: {
    color: theme.colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  hScroll: {
    marginLeft: -4,
  },
  emptyState: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyStateTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyStateDesc: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateCta: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyStateCtaText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 14,
  },
});
