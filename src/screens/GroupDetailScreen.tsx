import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchGroupMembers, fetchGroupWagers } from "../services/groups";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { GroupMember, Wager, WagerStatus } from "../types";

const SPORT_EMOJI: Record<string, string> = {
  golf: "⛳",
  tennis: "🎾",
  pickleball: "🏓",
  pool: "🎱",
  darts: "🎯",
  padel: "🏸",
  poker: "♠️",
  custom: "🤝",
};

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

function MemberBubble({ member }: { member: GroupMember }) {
  const initials = member.displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={styles.memberBubble}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{initials || (member.handle[1]?.toUpperCase() ?? "?")}</Text>
      </View>
      <Text style={styles.memberHandle} numberOfLines={1}>
        {member.handle}
      </Text>
    </View>
  );
}

function WagerRow({
  wager,
  onPress,
}: {
  wager: Wager;
  onPress: () => void;
}) {
  const statusColor = STATUS_COLORS[wager.status] ?? theme.colors.textMuted;
  const statusLabel = STATUS_LABELS[wager.status] ?? wager.status;
  const sportEmoji = wager.sport ? (SPORT_EMOJI[wager.sport] ?? "🏆") : "🏆";

  return (
    <Pressable style={styles.wagerRow} onPress={onPress}>
      <Text style={styles.wagerSportEmoji}>{sportEmoji}</Text>
      <View style={styles.wagerRowBody}>
        <Text style={styles.wagerActivity} numberOfLines={1}>
          {wager.activity}
        </Text>
        <Text style={styles.wagerOpponent} numberOfLines={1}>
          vs {wager.opponentHandle}
        </Text>
      </View>
      <View style={styles.wagerRowRight}>
        <Text style={styles.wagerAmount}>${wager.amount.toFixed(0)}</Text>
        <View style={[styles.statusBadge, { borderColor: `${statusColor}60`, backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusLabel.toUpperCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function GroupDetailScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const groupId: string = route.params?.groupId;
  const groups = useAppStore((s) => s.groups);
  const group = groups.find((g) => g.id === groupId) ?? null;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingWagers, setIsLoadingWagers] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!groupId) return;

    fetchGroupMembers(groupId)
      .then(setMembers)
      .finally(() => setIsLoadingMembers(false));

    fetchGroupWagers(groupId)
      .then(setWagers)
      .finally(() => setIsLoadingWagers(false));
  }, [groupId]);

  async function handleCopyCode() {
    if (!group) return;
    await Share.share({
      message: `Join my Ratpac group "${group.name}" — code: ${group.joinCode}`,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Group</Text>
        </View>
        <Text style={styles.notFound}>Group not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group.name}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Invite code */}
        <View style={styles.inviteCard}>
          <View style={styles.inviteLeft}>
            <Text style={styles.inviteLabel}>Invite Code</Text>
            <Text style={styles.inviteCode}>{group.joinCode}</Text>
          </View>
          <Pressable style={styles.copyBtn} onPress={handleCopyCode}>
            <Text style={styles.copyBtnText}>{copied ? "Shared!" : "Share"}</Text>
          </Pressable>
        </View>

        {/* Members */}
        <Text style={styles.sectionTitle}>
          Members ({isLoadingMembers ? "..." : members.length})
        </Text>
        {isLoadingMembers ? (
          <ActivityIndicator
            color={theme.colors.accent}
            style={{ marginVertical: 16 }}
          />
        ) : members.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersRow}
          >
            {members.map((m) => (
              <MemberBubble key={m.userId} member={m} />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyHint}>No members found.</Text>
        )}

        {/* Wagers */}
        <Text style={styles.sectionTitle}>Wagers</Text>
        {isLoadingWagers ? (
          <ActivityIndicator
            color={theme.colors.accent}
            style={{ marginVertical: 16 }}
          />
        ) : wagers.length === 0 ? (
          <View style={styles.wagersEmpty}>
            <Text style={styles.wagersEmptyText}>
              No wagers yet. Create one and tag this group.
            </Text>
          </View>
        ) : (
          <View style={styles.wagersList}>
            {wagers.map((w) => (
              <WagerRow
                key={w.id}
                wager={w}
                onPress={() =>
                  navigation.navigate("WagerDetail", { wagerId: w.id })
                }
              />
            ))}
          </View>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },
  notFound: {
    color: theme.colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  inviteLeft: {
    gap: 4,
  },
  inviteLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inviteCode: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 6,
    fontVariant: ["tabular-nums"],
  },
  copyBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  copyBtnText: {
    color: "#001B10",
    fontWeight: "700",
    fontSize: 14,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  membersRow: {
    gap: 16,
    paddingRight: 8,
    marginBottom: 28,
  },
  memberBubble: {
    alignItems: "center",
    gap: 6,
    width: 60,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  memberHandle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
  emptyHint: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginBottom: 24,
  },
  wagersList: {
    gap: 10,
  },
  wagersEmpty: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  wagersEmptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  wagerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  wagerSportEmoji: {
    fontSize: 24,
    flexShrink: 0,
  },
  wagerRowBody: {
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
});
