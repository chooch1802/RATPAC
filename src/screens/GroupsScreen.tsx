import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { Group } from "../types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function GroupCard({
  group,
  onPress,
}: {
  group: Group;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.groupCard} onPress={onPress}>
      <View
        style={[styles.groupAvatar, { backgroundColor: group.avatarColor }]}
      >
        <Text style={styles.groupAvatarText}>{getInitials(group.name)}</Text>
      </View>
      <View style={styles.groupCardBody}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupMeta}>
          {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
          {" · "}
          <Text style={styles.groupCode}>{group.joinCode}</Text>
        </Text>
      </View>
      <View style={styles.groupRoleBadge}>
        <Text style={styles.groupRoleText}>
          {group.myRole === "admin" ? "Admin" : "Member"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function GroupsScreen({ navigation }: { navigation: any }) {
  const groups = useAppStore((s) => s.groups);
  const loadGroups = useAppStore((s) => s.loadGroups);
  const createGroup = useAppStore((s) => s.createGroup);
  const joinGroup = useAppStore((s) => s.joinGroup);

  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setIsLoading(true);
    loadGroups().finally(() => setIsLoading(false));
  }, []);

  function openCreate() {
    setNewGroupName("");
    setErrorMsg("");
    setShowCreate(true);
  }

  function openJoin() {
    setJoinCode("");
    setErrorMsg("");
    setShowJoin(true);
  }

  async function handleCreate() {
    if (!newGroupName.trim()) return;
    setActionLoading(true);
    setErrorMsg("");
    const group = await createGroup(newGroupName.trim());
    setActionLoading(false);
    if (group) {
      setShowCreate(false);
    } else {
      setErrorMsg("Failed to create group. Please try again.");
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setActionLoading(true);
    setErrorMsg("");
    const result = await joinGroup(joinCode.trim());
    setActionLoading(false);
    if (result.ok) {
      setShowJoin(false);
    } else {
      setErrorMsg(result.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerBtn} onPress={openJoin}>
            <Text style={styles.headerBtnText}>Join</Text>
          </Pressable>
          <Pressable style={styles.headerBtnAccent} onPress={openCreate}>
            <Text style={styles.headerBtnAccentText}>+</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator
          color={theme.colors.accent}
          style={{ marginTop: 60 }}
        />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptyDesc}>
            Create a group to bet with your mates, or join one with a code.
          </Text>
          <Pressable style={styles.emptyCreateBtn} onPress={openCreate}>
            <Text style={styles.emptyCreateBtnText}>Create a Group</Text>
          </Pressable>
          <Pressable style={styles.emptyJoinBtn} onPress={openJoin}>
            <Text style={styles.emptyJoinBtnText}>Join with Code</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onPress={() =>
                navigation.navigate("GroupDetail", { groupId: group.id })
              }
            />
          ))}
        </ScrollView>
      )}

      {/* Create Group Modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCreate(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create Group</Text>
            <Text style={styles.modalLabel}>Group name</Text>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. Friday Golf Boys"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.modalInput}
              autoCapitalize="words"
              autoFocus
            />
            {errorMsg.length > 0 && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}
            <Pressable
              style={[
                styles.modalConfirmBtn,
                (!newGroupName.trim() || actionLoading) &&
                  styles.modalConfirmBtnDisabled,
              ]}
              onPress={handleCreate}
              disabled={!newGroupName.trim() || actionLoading}
            >
              <Text style={styles.modalConfirmBtnText}>
                {actionLoading ? "Creating..." : "Create Group"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        visible={showJoin}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoin(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowJoin(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Join Group</Text>
            <Text style={styles.modalLabel}>Enter invite code</Text>
            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="XXXXXX"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.modalInput, styles.codeInput]}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              autoFocus
            />
            {errorMsg.length > 0 && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}
            <Pressable
              style={[
                styles.modalConfirmBtn,
                (!joinCode.trim() || actionLoading) &&
                  styles.modalConfirmBtnDisabled,
              ]}
              onPress={handleJoin}
              disabled={!joinCode.trim() || actionLoading}
            >
              <Text style={styles.modalConfirmBtnText}>
                {actionLoading ? "Joining..." : "Join Group"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerBtn: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  headerBtnAccent: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnAccentText: {
    color: "#001B10",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  groupAvatarText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 17,
  },
  groupCardBody: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  groupMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  groupCode: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    letterSpacing: 1,
  },
  groupRoleBadge: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupRoleText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 4,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDesc: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  emptyCreateBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
  },
  emptyCreateBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 16,
  },
  emptyJoinBtn: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
  },
  emptyJoinBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 16,
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 24,
    paddingBottom: 48,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },
  modalLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 16,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center",
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  modalConfirmBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmBtnDisabled: {
    opacity: 0.45,
  },
  modalConfirmBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 16,
  },
});
