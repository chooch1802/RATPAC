import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { FeedPost, Reactions, WagerStatus } from "../types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Avatar({ handle, size = 32 }: { handle: string; size?: number }) {
  const initial = handle.replace("@", "")[0]?.toUpperCase() ?? "?";
  const palette = ["#7B5EA7", "#C0392B", "#2980B9", "#D35400", "#27AE60", "#8E44AD", "#1A6B4A"];
  const idx = (handle.charCodeAt(1) ?? 0) % palette.length;
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette[idx] },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: WagerStatus }) {
  const config: Record<WagerStatus, { label: string; color: string }> = {
    ACTIVE: { label: "LIVE", color: theme.colors.accent },
    PENDING: { label: "PENDING", color: theme.colors.pending },
    AWAITING_RESULT: { label: "AWAITING", color: theme.colors.pending },
    DISPUTED: { label: "DISPUTED", color: theme.colors.destructive },
    SETTLED: { label: "SETTLED", color: theme.colors.textMuted },
    VOIDED: { label: "VOIDED", color: theme.colors.textMuted },
    EXPIRED: { label: "EXPIRED", color: theme.colors.textMuted },
  };
  const { label, color } = config[status] ?? config.PENDING;
  return (
    <View style={[styles.statusBadge, { borderColor: color, backgroundColor: `${color}1A` }]}>
      {status === "ACTIVE" && <View style={[styles.liveDot, { backgroundColor: color }]} />}
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function ActivityPill({ activity }: { activity: string }) {
  const iconMap: Record<string, string> = {
    Golf: "⛳",
    Tennis: "🎾",
    "Table Tennis": "🏓",
    Pickleball: "🏸",
    Pool: "🎱",
    Darts: "🎯",
  };
  const icon = iconMap[activity] ?? "✨";
  return (
    <View style={styles.activityPill}>
      <Text style={styles.activityPillText}>
        {icon} {activity}
      </Text>
    </View>
  );
}

type WagerCardProps = {
  post: FeedPost;
  onPress?: () => void;
};

export function WagerCard({ post, onPress }: WagerCardProps) {
  const toggleReaction = useAppStore((s) => s.toggleReaction);
  const toggleFollowForHandle = useAppStore((s) => s.toggleFollowForHandle);
  const respondToChallenge = useAppStore((s) => s.respondToChallenge);
  const followingHandles = useAppStore((s) => s.followingHandles);
  const user = useAppStore((s) => s.user);
  const [actionLoading, setActionLoading] = useState<"" | "accept" | "decline">("");
  const isFollowingAuthor = followingHandles.includes(post.authorHandle);


  const isChallengToMe = post.type === "challenge" && post.opponentHandle === user.handle;
  const isPendingOutgoing = post.status === "PENDING" && post.authorHandle === user.handle;
  const isSettled = post.status === "SETTLED";
  const isActive = post.status === "ACTIVE";
  const iWon = isSettled && post.winnerHandle === user.handle;
  const iLost = isSettled && post.winnerHandle && post.winnerHandle !== user.handle;

  // Left accent bar color
  const accentColor = isChallengToMe
    ? theme.colors.accent
    : isActive
    ? theme.colors.accent
    : iWon
    ? theme.colors.win
    : iLost
    ? theme.colors.destructive
    : theme.colors.border;

  // Amount color
  const amountColor = isActive
    ? theme.colors.accent
    : post.status === "PENDING"
    ? theme.colors.pending
    : iWon
    ? theme.colors.win
    : theme.colors.textMuted;

  const reactions: Array<{ key: keyof Reactions; emoji: string }> = [
    { key: "fire", emoji: "🔥" },
    { key: "hundred", emoji: "💯" },
    { key: "laughing", emoji: "😂" },
    { key: "shocked", emoji: "😱" },
  ];

  return (
    <Pressable onPress={onPress} style={[styles.card, isChallengToMe && styles.cardChallenge]}>
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.inner}>
        {/* Challenge banner */}
        {isChallengToMe && (
          <View style={styles.challengeBanner}>
            <Text style={styles.challengeBannerText}>You've been challenged</Text>
          </View>
        )}
        {isPendingOutgoing && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              Waiting for {post.opponentDisplayName} to respond
            </Text>
          </View>
        )}

        {/* Winner banner */}
        {isSettled && post.winnerHandle && (
          <View style={[styles.resultBanner, iWon ? styles.resultBannerWin : styles.resultBannerLoss]}>
            <Text style={styles.resultBannerText}>
              {iWon ? "You won" : `${post.winnerHandle} won`}
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Avatar handle={post.authorHandle} size={34} />
          <View style={styles.headerMeta}>
            <Text style={styles.displayName}>{post.authorDisplayName}</Text>
            <Text style={styles.handle}>
              {post.authorHandle} · {timeAgo(post.createdAt)}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <ActivityPill activity={post.activity} />
            {post.authorHandle !== user.handle && (
              <Pressable
                style={[styles.followBtn, isFollowingAuthor && styles.followingBtn]}
                onPress={() => {
                  void toggleFollowForHandle(post.authorHandle);
                }}
              >
                <Text style={[styles.followBtnText, isFollowingAuthor && styles.followingBtnText]}>
                  {isFollowingAuthor ? "Following" : "Follow"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Amount + VS */}
        <View style={styles.wagerBody}>
          <Text style={[styles.amount, { color: amountColor }]}>
            ${post.amount.toFixed(2)}
          </Text>
          <View style={styles.vsRow}>
            <Text style={styles.vsName} numberOfLines={1}>{post.authorDisplayName}</Text>
            <View style={styles.vsDivider}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <Text style={styles.vsName} numberOfLines={1}>{post.opponentDisplayName}</Text>
          </View>
          {post.termsText && (
            <Text style={styles.terms} numberOfLines={2}>{post.termsText}</Text>
          )}
        </View>

        {/* Accept / Decline CTAs */}
        {isChallengToMe && (
          <View style={styles.ctaRow}>
            <Pressable
              style={[styles.acceptBtn, actionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={actionLoading.length > 0}
              onPress={async () => {
                const wagerId = post.wagerId ?? post.id;
                setActionLoading("accept");
                await respondToChallenge(wagerId, "accept");
                setActionLoading("");
              }}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </Pressable>
            <Pressable
              style={[styles.declineBtn, actionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={actionLoading.length > 0}
              onPress={async () => {
                const wagerId = post.wagerId ?? post.id;
                setActionLoading("decline");
                await respondToChallenge(wagerId, "decline");
                setActionLoading("");
              }}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <StatusBadge status={post.status} />
          <View style={styles.reactionRow}>
            {reactions.map(({ key, emoji }) => {
              const count = post.reactions[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    void toggleReaction(post.id, key);
                  }}
                  style={styles.reactionBtn}
                >
                  <Text style={styles.reactionText}>
                    {emoji}{count > 0 ? ` ${count}` : ""}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.reactionBtn}>
              <Text style={styles.reactionText}>💬{post.comments > 0 ? ` ${post.comments}` : ""}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardChallenge: {
    borderColor: `${theme.colors.accent}50`,
    backgroundColor: `${theme.colors.accent}08`,
  },
  accentBar: {
    width: 3,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  inner: {
    flex: 1,
    padding: 14,
  },
  challengeBanner: {
    backgroundColor: `${theme.colors.accent}20`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  challengeBannerText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pendingBanner: {
    backgroundColor: `${theme.colors.pending}18`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  pendingBannerText: {
    color: theme.colors.pending,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  resultBanner: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  resultBannerWin: {
    backgroundColor: `${theme.colors.win}20`,
  },
  resultBannerLoss: {
    backgroundColor: `${theme.colors.destructive}15`,
  },
  resultBannerText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  headerMeta: {
    flex: 1,
  },
  displayName: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  handle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  activityPill: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activityPillText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  followBtn: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  followingBtn: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgTertiary,
  },
  followBtnText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "600",
  },
  followingBtnText: {
    color: theme.colors.textSecondary,
  },
  wagerBody: {
    marginBottom: 12,
  },
  amount: {
    fontSize: 28,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    marginBottom: 8,
  },
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 6,
  },
  vsName: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
    textAlign: "center",
  },
  vsDivider: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vsText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1,
  },
  terms: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 17,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  acceptBtnText: {
    color: "#001B10",
    fontWeight: "700",
    fontSize: 14,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  declineBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  reactionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  reactionBtn: {
    paddingVertical: 2,
  },
  reactionText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
});
