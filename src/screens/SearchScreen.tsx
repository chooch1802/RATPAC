import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { searchProfiles } from "../services/follows";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

type SuggestedUser = {
  id?: string;
  handle: string;
  displayName: string;
  wins: number;
  losses: number;
  isPublic: boolean;
};

function Avatar({ handle, size = 44 }: { handle: string; size?: number }) {
  const initial = handle.replace("@", "")[0]?.toUpperCase() ?? "?";
  const palette = ["#7B5EA7", "#C0392B", "#2980B9", "#D35400", "#27AE60", "#8E44AD"];
  const idx = (handle.charCodeAt(1) ?? 0) % palette.length;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette[idx], alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFF", fontWeight: "700", fontSize: size * 0.38 }}>{initial}</Text>
    </View>
  );
}

function UserRow({
  user,
  isFollowing,
  isSelf,
  onToggleFollow,
}: {
  user: SuggestedUser;
  isFollowing: boolean;
  isSelf: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <View style={styles.userRow}>
      <Avatar handle={user.handle} />
      <View style={styles.userInfo}>
        <Text style={styles.userDisplayName}>{user.displayName}</Text>
        <View style={styles.userMeta}>
          <Text style={styles.userHandle}>{user.handle}</Text>
          {!user.isPublic && <Ionicons name="lock-closed-outline" size={12} color={theme.colors.textMuted} />}
        </View>
        <Text style={styles.userRecord}>
          {user.wins}W — {user.losses}L
        </Text>
      </View>
      {!isSelf && (
        <Pressable
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={onToggleFollow}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function SearchScreen({ navigation }: { navigation: any }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const user = useAppStore((s) => s.user);
  const feed = useAppStore((s) => s.feed);
  const followingHandles = useAppStore((s) => s.followingHandles);
  const toggleFollowForHandle = useAppStore((s) => s.toggleFollowForHandle);

  const suggestedFromFeed = useMemo<SuggestedUser[]>(() => {
    const byHandle = new Map<string, SuggestedUser>();
    for (const post of feed) {
      if (!post.authorHandle || post.authorHandle === user.handle) continue;
      if (byHandle.has(post.authorHandle)) continue;
      byHandle.set(post.authorHandle, {
        id: post.authorId,
        handle: post.authorHandle,
        displayName: post.authorDisplayName,
        wins: 0,
        losses: 0,
        isPublic: true,
      });
    }
    return Array.from(byHandle.values()).slice(0, 20);
  }, [feed, user.handle]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const data = await searchProfiles(trimmed);
      if (!cancelled) {
        setResults(data);
        setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const displayData = query.trim() ? results : suggestedFromFeed;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search ratpac..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id ?? item.handle}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {query.trim() ? "Results" : "Suggested accounts"}
          </Text>
        }
        renderItem={({ item }) => (
          <UserRow
            user={item}
            isFollowing={followingHandles.includes(item.handle)}
            isSelf={item.handle === user.handle}
            onToggleFollow={() => {
              void toggleFollowForHandle(item.handle);
            }}
          />
        )}
        ListEmptyComponent={
          isSearching ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No accounts found for "{query}"</Text>
          )
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
    alignItems: "center",
    gap: 10,
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
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userDisplayName: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 15,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userHandle: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  privateBadge: {
    fontSize: 11,
  },
  userRecord: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
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
    fontWeight: "700",
    fontSize: 13,
  },
  followingBtnText: {
    color: theme.colors.textSecondary,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingTop: 40,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 10,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
});
