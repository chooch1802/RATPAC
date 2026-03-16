import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WagerCard } from "../components/WagerCard";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { FeedPost } from "../types";

type FeedTab = "following" | "foryou";

export default function FeedScreen({ navigation }: { navigation: any }) {
  const feed = useAppStore((s) => s.feed);
  const user = useAppStore((s) => s.user);
  const hydrateFromBackend = useAppStore((s) => s.hydrateFromBackend);
  const [activeTab, setActiveTab] = useState<FeedTab>("following");
  const [refreshing, setRefreshing] = useState(false);

  const pendingChallenges = feed.filter(
    (p) => p.type === "challenge" && p.opponentHandle === user.handle && p.status === "PENDING"
  );

  const sortedFeed = [...feed]
    .filter((p) => !(p.type === "challenge" && p.opponentHandle === user.handle && p.status === "PENDING"))
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  async function onRefresh() {
    setRefreshing(true);
    await hydrateFromBackend();
    setRefreshing(false);
  }

  function handleCardPress(post: FeedPost) {
    // Only navigate to detail if there's a real wager behind it
    navigation.navigate("WagerDetail", { wagerId: post.wagerId ?? post.id });
  }

  const ListHeader = () => (
    <>
      {/* Pending challenges strip */}
      {pendingChallenges.length > 0 && (
        <View style={styles.challengeStrip}>
          <View style={styles.challengeStripLeft}>
            <Ionicons name="flash" size={18} color={theme.colors.accent} />
            <View>
              <Text style={styles.challengeStripTitle}>
                {pendingChallenges.length === 1
                  ? `${pendingChallenges[0].authorDisplayName} challenged you`
                  : `${pendingChallenges.length} challenges waiting`}
              </Text>
              {pendingChallenges.length === 1 && (
                <Text style={styles.challengeStripSub}>
                  ${pendingChallenges[0].amount.toFixed(2)} · {pendingChallenges[0].activity}
                </Text>
              )}
              {pendingChallenges.length > 1 && (
                <Text style={styles.challengeStripSub}>Jump into your pending responses</Text>
              )}
            </View>
          </View>
          <Pressable
            style={styles.challengeStripBtn}
            onPress={() =>
              pendingChallenges.length === 1
                ? handleCardPress(pendingChallenges[0])
                : navigation.navigate("Wagers", { initialFilter: "NEEDS_RESPONSE" })
            }
          >
            <Text style={styles.challengeStripBtnText}>
              {pendingChallenges.length === 1 ? "Respond now" : "View all"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Challenge cards first */}
      {pendingChallenges.map((post) => (
        <WagerCard key={post.id} post={post} onPress={() => handleCardPress(post)} />
      ))}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/ratpac-logo.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Pressable style={styles.searchBtn} onPress={() => navigation.navigate("Search")}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tab, activeTab === "following" && styles.tabActive]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.tabTextActive]}>
            Following
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "foryou" && styles.tabActive]}
          onPress={() => setActiveTab("foryou")}
        >
          <Text style={[styles.tabText, activeTab === "foryou" && styles.tabTextActive]}>
            For You
          </Text>
        </Pressable>
      </View>

      {activeTab === "following" ? (
        <FlatList
          data={sortedFeed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WagerCard post={item} onPress={() => handleCardPress(item)} />
          )}
          ListHeaderComponent={<ListHeader />}
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
            pendingChallenges.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyDesc}>
                  Follow people to see their wager activity here.
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.comingSoon}>
          <Ionicons name="telescope-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.comingSoonTitle}>For You feed</Text>
          <Text style={styles.comingSoonDesc}>
            Discover popular wagers and trending activity from the community. Coming soon.
          </Text>
        </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLogo: {
    width: 130,
    height: 32,
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    fontSize: 16,
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    fontSize: 14,
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
  },
  challengeStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: `${theme.colors.accent}12`,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}40`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  challengeStripLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  challengeStripIcon: {
    fontSize: 20,
  },
  challengeStripTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  challengeStripSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  challengeStripBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  challengeStripBtnText: {
    color: "#001B10",
    fontWeight: "700",
    fontSize: 13,
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
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
  comingSoon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  comingSoonIcon: {
    fontSize: 44,
  },
  comingSoonTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  comingSoonDesc: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
});
