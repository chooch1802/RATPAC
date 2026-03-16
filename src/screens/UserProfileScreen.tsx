import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { searchProfiles } from "../services/follows";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { FeedPost, WagerStatus } from "../types";

type ProfileData = {
  id: string;
  handle: string;
  displayName: string;
  wins: number;
  losses: number;
  isPublic: boolean;
  bio?: string;
  avatarUrl?: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getAvatarColor(handle: string): string {
  const palette = ["#7B5EA7", "#C0392B", "#2980B9", "#D35400", "#27AE60", "#8E44AD", "#1A6B4A"];
  return palette[(handle.charCodeAt(1) ?? 0) % palette.length];
}

function Avatar({ handle, size = 80, imageUrl }: { handle: string; size?: number; imageUrl?: string }) {
  const initial = handle.replace("@", "")[0]?.toUpperCase() ?? "?";
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarCircle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(handle) },
      ]}
    >
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

const STATUS_COLORS: Record<WagerStatus, string> = {
  PENDING: theme.colors.pending,
  ACTIVE: theme.colors.accent,
  AWAITING_RESULT: theme.colors.pending,
  DISPUTED: theme.colors.destructive,
  SETTLED: theme.colors.textMuted,
  VOIDED: theme.colors.textMuted,
  EXPIRED: theme.colors.textMuted,
};

const STATUS_LABELS: Record<WagerStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  AWAITING_RESULT: "Awaiting",
  DISPUTED: "Disputed",
  SETTLED: "Settled",
  VOIDED: "Voided",
  EXPIRED: "Expired",
};

export default function UserProfileScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const handle: string = route.params?.handle ?? "";
  const forYouFeed = useAppStore((s) => s.forYouFeed);
  const feed = useAppStore((s) => s.feed);
  const followingHandles = useAppStore((s) => s.followingHandles);
  const toggleFollowForHandle = useAppStore((s) => s.toggleFollowForHandle);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const isFollowing = followingHandles.includes(normalizedHandle);

  // Get wagers for this user from the combined feed
  const allPosts = [...feed, ...forYouFeed];
  const seen = new Set<string>();
  const userPosts = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return p.authorHandle === normalizedHandle && p.isPublic;
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results = await searchProfiles(handle.replace(/^@/, ""));
      const found = results.find(
        (r: any) => r.handle === normalizedHandle || r.handle === handle
      ) ?? results[0] ?? null;
      setProfile(found ?? null);
      setLoading(false);
    }
    load();
  }, [handle]);

  async function onToggleFollow() {
    setFollowLoading(true);
    await toggleFollowForHandle(normalizedHandle);
    setFollowLoading(false);
  }

  const winRate =
    profile && profile.wins + profile.losses > 0
      ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
      : 0;

  const totalWagered = userPosts.reduce((acc, p) => acc + p.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {normalizedHandle}
        </Text>
        {profile && (
          <Pressable
            style={[styles.followBtn, isFollowing && styles.followingBtn, followLoading && { opacity: 0.5 }]}
            onPress={onToggleFollow}
            disabled={followLoading}
          >
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}
        {!profile && !loading && <View style={{ width: 80 }} />}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 60 }} />
      ) : !profile ? (
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>User not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar + info */}
          <View style={styles.profileHeader}>
            <Avatar handle={normalizedHandle} size={80} imageUrl={profile.avatarUrl} />
            <Text style={styles.displayName}>{profile.displayName}</Text>
            <Text style={styles.handle}>{profile.handle}</Text>
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{profile.wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{profile.losses}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win %</Text>
            </View>
          </View>

          {/* Wager record */}
          <View style={styles.recordCard}>
            <Text style={styles.recordTitle}>Wager record</Text>
            <Text style={styles.recordAmount}>
              ${totalWagered.toFixed(2)}{" "}
              <Text style={styles.recordAmountLabel}>total wagered (public)</Text>
            </Text>
          </View>

          {/* Privacy lock or wager history */}
          {!profile.isPublic ? (
            <View style={styles.privateContainer}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.privateText}>This account is private</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Wager Activity</Text>
              {userPosts.length === 0 ? (
                <Text style={styles.emptyText}>No public wagers yet.</Text>
              ) : (
                userPosts.map((post) => {
                  const statusColor = STATUS_COLORS[post.status] ?? theme.colors.textMuted;
                  const statusLabel = STATUS_LABELS[post.status] ?? post.status;
                  return (
                    <Pressable
                      key={post.id}
                      style={styles.wagerRow}
                      onPress={() =>
                        navigation.navigate("WagerDetail", { wagerId: post.wagerId ?? post.id })
                      }
                    >
                      <View style={styles.wagerRowLeft}>
                        <Text style={styles.wagerActivity}>{post.activity}</Text>
                        <Text style={styles.wagerOpponent}>
                          vs {post.opponentDisplayName}
                        </Text>
                      </View>
                      <View style={styles.wagerRowRight}>
                        <Text style={styles.wagerAmount}>${post.amount.toFixed(2)}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderColor: `${statusColor}60`,
                              backgroundColor: `${statusColor}18`,
                            },
                          ]}
                        >
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {statusLabel.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.wagerTime}>{timeAgo(post.createdAt)}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  backBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 20,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  followingBtn: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgTertiary,
  },
  followBtnText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  followingBtnText: {
    color: theme.colors.textSecondary,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
    gap: 6,
  },
  avatarCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarInitial: {
    color: "#FFF",
    fontWeight: "800",
  },
  displayName: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  handle: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  bio: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  recordCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  recordTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  recordAmount: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  recordAmountLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "400",
  },
  privateContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  lockIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  privateText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  wagerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  wagerRowLeft: {
    flex: 1,
    gap: 3,
  },
  wagerActivity: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  wagerOpponent: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  wagerRowRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  wagerAmount: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  wagerTime: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
});
