import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { restorePurchases } from "../services/subscription";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { Wager } from "../types";

function Avatar({ handle, size = 72, imageUrl }: { handle: string; size?: number; imageUrl?: string }) {
  const initial = handle.replace("@", "")[0]?.toUpperCase() ?? "?";
  const palette = ["#7B5EA7", "#C0392B", "#2980B9", "#D35400", "#27AE60", "#8E44AD"];
  const idx = (handle.charCodeAt(1) ?? 0) % palette.length;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette[idx] },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, accent && { color: theme.colors.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WagerHistoryRow({ wager }: { wager: Wager }) {
  const isWin = wager.status === "SETTLED" && wager.winnerHandle;
  const statusColor =
    wager.status === "ACTIVE"
      ? theme.colors.accent
      : wager.status === "SETTLED"
      ? theme.colors.textMuted
      : wager.status === "PENDING"
      ? theme.colors.pending
      : theme.colors.textMuted;

  return (
    <View style={styles.historyRow}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyActivity}>{wager.activity}</Text>
        <Text style={styles.historyOpponent}>
          vs {wager.opponentDisplayName ?? wager.opponentHandle}
        </Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={[styles.historyAmount, { color: statusColor }]}>
          ${wager.amount.toFixed(2)}
        </Text>
        {isWin && <Text style={styles.historyWin}>Won</Text>}
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const user = useAppStore((s) => s.user);
  const wagers = useAppStore((s) => s.wagers);
  const setPaywallVisible = useAppStore((s) => s.setPaywallVisible);
  const refreshSubscriptionStatus = useAppStore((s) => s.refreshSubscriptionStatus);
  const isSubscriptionSyncing = useAppStore((s) => s.isSubscriptionSyncing);
  const [statusMsg, setStatusMsg] = useState("");

  async function onSubscriptionAction() {
    if (user.isSubscribed) {
      await Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else {
      setPaywallVisible(true);
    }
  }

  const settledWagers = wagers.filter((w) => w.status === "SETTLED");
  const totalWagered = wagers.reduce((acc, w) => acc + w.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => navigation.navigate("Settings")}
        >
          <Ionicons name="settings-outline" size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar handle={user.handle} size={80} imageUrl={user.avatarUrl} />
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.handle}>{user.handle}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, user.isPrivate ? styles.badgePrivate : styles.badgePublic]}>
                <Text style={[styles.badgeText, user.isPrivate ? styles.badgeTextPrivate : styles.badgeTextPublic]}>
                  {user.isPrivate ? "Private" : "Public"}
                </Text>
              </View>
              {user.isSubscribed && (
                <View style={styles.badgePro}>
                  <Text style={styles.badgeProText}>Pro</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Follow counts */}
        <View style={styles.followRow}>
          <Pressable style={styles.followItem}>
            <Text style={styles.followCount}>{user.followingCount}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </Pressable>
          <View style={styles.followDivider} />
          <Pressable style={styles.followItem}>
            <Text style={styles.followCount}>{user.followerCount}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatBlock
            label="Record"
            value={`${user.wins}W — ${user.losses}L`}
            accent
          />
          <StatBlock
            label="Total wagered"
            value={`$${totalWagered.toFixed(0)}`}
          />
          <StatBlock
            label="Active"
            value={String(user.activeWagerCount)}
          />
        </View>

        {/* Subscription */}
        <View style={styles.subCard}>
          <View style={styles.subCardRow}>
            <View>
              <Text style={styles.subCardTitle}>
                {user.isSubscribed ? "Ratpac Pro" : "Free tier"}
              </Text>
              <Text style={styles.subCardDesc}>
                {user.isSubscribed
                  ? "Full access — $4.99/month"
                  : "Upgrade to create and accept wagers"}
              </Text>
            </View>
            <View style={[styles.subStatusDot, user.isSubscribed && styles.subStatusDotActive]} />
          </View>
          <View style={styles.subCardButtons}>
            <Pressable
              style={[styles.subActionBtn, user.isSubscribed && styles.subActionBtnSecondary]}
              onPress={onSubscriptionAction}
            >
              <Text style={[styles.subActionBtnText, user.isSubscribed && styles.subActionBtnTextSecondary]}>
                {user.isSubscribed ? "Manage subscription" : "Subscribe — $4.99/mo"}
              </Text>
            </Pressable>
            {!user.isSubscribed && (
              <Pressable
                style={[styles.subRefreshBtn, isSubscriptionSyncing && { opacity: 0.5 }]}
                onPress={async () => setStatusMsg(await refreshSubscriptionStatus())}
                disabled={isSubscriptionSyncing}
              >
                <Text style={styles.subRefreshText}>
                  {isSubscriptionSyncing ? "Checking..." : "Refresh status"}
                </Text>
              </Pressable>
            )}
          </View>
          {statusMsg.length > 0 && <Text style={styles.subStatusMsg}>{statusMsg}</Text>}
        </View>

        {/* Wager History */}
        <Text style={styles.sectionTitle}>Wager History</Text>
        {wagers.length === 0 ? (
          <Text style={styles.emptyText}>No wagers yet.</Text>
        ) : (
          wagers.map((w) => <WagerHistoryRow key={w.id} wager={w} />)
        )}
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
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsBtnText: {
    fontSize: 18,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  handle: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePublic: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgTertiary,
  },
  badgePrivate: {
    borderColor: theme.colors.textMuted,
    backgroundColor: theme.colors.bgTertiary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeTextPublic: {
    color: theme.colors.textSecondary,
  },
  badgeTextPrivate: {
    color: theme.colors.textMuted,
  },
  badgePro: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeProText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  followRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  followItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  followCount: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  followLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  followDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statBlock: {
    flex: 1,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
    textAlign: "center",
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textAlign: "center",
    fontWeight: "500",
  },
  subCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  subCardTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },
  subCardDesc: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  subStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.textMuted,
  },
  subStatusDotActive: {
    backgroundColor: theme.colors.accent,
  },
  subCardButtons: {
    gap: 8,
  },
  subActionBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  subActionBtnSecondary: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subActionBtnText: {
    color: "#001B10",
    fontWeight: "700",
    fontSize: 14,
  },
  subActionBtnTextSecondary: {
    color: theme.colors.textPrimary,
  },
  subRefreshBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  subRefreshText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  subStatusMsg: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  historyLeft: {
    flex: 1,
  },
  historyActivity: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 2,
  },
  historyOpponent: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyAmount: {
    fontWeight: "800",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  historyWin: {
    color: theme.colors.win,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
});
