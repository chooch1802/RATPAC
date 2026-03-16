import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { Wager, WagerStatus } from "../types";

type WagerFilter = "ALL" | "NEEDS_RESPONSE" | WagerStatus;

const FILTERS: WagerFilter[] = [
  "ALL",
  "NEEDS_RESPONSE",
  "ACTIVE",
  "PENDING",
  "AWAITING_RESULT",
  "DISPUTED",
  "SETTLED",
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: theme.colors.accent,
  PENDING: theme.colors.pending,
  AWAITING_RESULT: theme.colors.pending,
  DISPUTED: theme.colors.destructive,
  SETTLED: theme.colors.textMuted,
  VOIDED: theme.colors.textMuted,
  EXPIRED: theme.colors.textMuted,
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  AWAITING_RESULT: "Awaiting",
  DISPUTED: "Disputed",
  SETTLED: "Settled",
  VOIDED: "Voided",
  EXPIRED: "Expired",
};

function WagerRow({ wager, onPress }: { wager: Wager; onPress: () => void }) {
  const statusColor = STATUS_COLORS[wager.status] ?? theme.colors.textMuted;
  const statusLabel = STATUS_LABELS[wager.status] ?? wager.status;
  const isWin = wager.status === "SETTLED" && wager.winnerHandle;

  return (
    <Pressable style={styles.wagerRow} onPress={onPress}>
      <View style={styles.wagerLeft}>
        <View style={styles.wagerTopRow}>
          <Text style={styles.wagerActivity}>{wager.activity}</Text>
          <View style={[styles.statusPill, { borderColor: statusColor, backgroundColor: `${statusColor}1A` }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.wagerOpponent}>
          vs {wager.opponentDisplayName ?? wager.opponentHandle}
        </Text>
        {wager.termsText && (
          <Text style={styles.wagerTerms} numberOfLines={1}>
            {wager.termsText}
          </Text>
        )}
        {isWin && (
          <Text style={styles.winnerText}>
            {wager.winnerHandle === "@you" ? "You won" : `${wager.winnerHandle} won`}
          </Text>
        )}
        {wager.createdAt && (
          <Text style={styles.wagerDate}>
            {new Date(wager.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        )}
      </View>
      <Text style={[styles.wagerAmount, { color: statusColor }]}>
        ${wager.amount.toFixed(2)}
      </Text>
    </Pressable>
  );
}

export default function WagersScreen({ route, navigation }: { route?: any; navigation: any }) {
  const wagers = useAppStore((s) => s.wagers);
  const user = useAppStore((s) => s.user);
  const hydrateFromBackend = useAppStore((s) => s.hydrateFromBackend);
  const [filter, setFilter] = useState<WagerFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");

  useEffect(() => {
    const requestedFilter = route?.params?.initialFilter as WagerFilter | undefined;
    if (requestedFilter && FILTERS.includes(requestedFilter)) {
      setFilter(requestedFilter);
    }
  }, [route?.params?.initialFilter, route?.params?.filterRequestId]);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? wagers
        : filter === "NEEDS_RESPONSE"
        ? wagers.filter((w) => w.status === "PENDING" && w.opponentHandle === user.handle)
        : wagers.filter((w) => w.status === filter),
    [filter, wagers, user.handle]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: wagers.length,
      NEEDS_RESPONSE: wagers.filter(
        (w) => w.status === "PENDING" && w.opponentHandle === user.handle
      ).length,
    };
    wagers.forEach((w) => {
      c[w.status] = (c[w.status] ?? 0) + 1;
    });
    return c;
  }, [wagers, user.handle]);

  const activeFilterLabel =
    filter === "ALL"
      ? "All"
      : filter === "NEEDS_RESPONSE"
      ? "Needs response"
      : STATUS_LABELS[filter] ?? filter;

  const activeFilterSummary =
    filter === "NEEDS_RESPONSE"
      ? "Showing incoming challenges that need your response."
      : `Showing ${activeFilterLabel.toLowerCase()} wagers.`;

  function countForFilter(nextFilter: WagerFilter, list: Wager[], currentHandle: string): number {
    if (nextFilter === "ALL") return list.length;
    if (nextFilter === "NEEDS_RESPONSE") {
      return list.filter((w) => w.status === "PENDING" && w.opponentHandle === currentHandle).length;
    }
    return list.filter((w) => w.status === nextFilter).length;
  }

  async function onRefresh() {
    setRefreshing(true);
    await hydrateFromBackend();
    const latest = useAppStore.getState();
    const remaining = countForFilter(filter, latest.wagers, latest.user.handle);
    if (filter !== "ALL" && remaining === 0) {
      setFilter("ALL");
      setRefreshMessage(`No ${activeFilterLabel.toLowerCase()} wagers after refresh. Showing all.`);
      setTimeout(() => setRefreshMessage(""), 1800);
    } else {
      setRefreshMessage("");
    }
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wagers</Text>
        <Text style={styles.headerCount}>{wagers.length} total</Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filtersScroll}
      >
        {FILTERS.map((f) => {
          const count = counts[f] ?? 0;
          const isActive = filter === f;
          return (
            <Pressable
              key={f}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {f === "ALL"
                  ? "All"
                  : f === "NEEDS_RESPONSE"
                  ? "Needs response"
                  : STATUS_LABELS[f] ?? f}
                {count > 0 && f !== "ALL" ? ` · ${count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {filter !== "ALL" && (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterText}>{activeFilterSummary}</Text>
          <Pressable style={styles.clearFilterBtn} onPress={() => setFilter("ALL")}>
            <Text style={styles.clearFilterBtnText}>Clear filter</Text>
          </Pressable>
        </View>
      )}
      {refreshMessage.length > 0 && (
        <View style={styles.refreshInfoRow}>
          <Text style={styles.refreshInfoText}>{refreshMessage}</Text>
        </View>
      )}

      {/* Wager list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WagerRow
            wager={item}
            onPress={() => navigation.navigate("WagerDetail", { wagerId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {filter === "ALL"
                ? "No wagers yet"
                : filter === "NEEDS_RESPONSE"
                ? "No challenges waiting"
                : `No ${STATUS_LABELS[filter] ?? filter.toLowerCase()} wagers`}
            </Text>
            <Text style={styles.emptyDesc}>
              {filter === "ALL"
                ? "Tap + to challenge someone to a wager."
                : filter === "NEEDS_RESPONSE"
                ? "You're all caught up on incoming challenges."
                : "Nothing here right now."}
            </Text>
          </View>
        }
      />
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
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  headerCount: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  filtersScroll: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: `${theme.colors.accent}20`,
    borderColor: theme.colors.accent,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: theme.colors.accent,
  },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: `${theme.colors.accent}08`,
    gap: 10,
  },
  activeFilterText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  clearFilterBtn: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearFilterBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  refreshInfoRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: `${theme.colors.bgSecondary}`,
  },
  refreshInfoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  wagerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  wagerLeft: {
    flex: 1,
    marginRight: 12,
  },
  wagerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  wagerActivity: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  wagerOpponent: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  wagerTerms: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 4,
  },
  winnerText: {
    color: theme.colors.win,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  wagerDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  wagerAmount: {
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyDesc: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
