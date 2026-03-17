import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { Notification, NotificationType } from "../types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TYPE_ICONS: Record<NotificationType, IoniconName> = {
  CHALLENGE_RECEIVED: "flash-outline",
  CHALLENGE_ACCEPTED: "checkmark-circle-outline",
  CHALLENGE_DECLINED: "close-circle-outline",
  WAGER_SETTLED_WIN: "trophy-outline",
  WAGER_SETTLED_LOSS: "sad-outline",
  WAGER_VOIDED: "return-up-back-outline",
  RESULT_CONFIRM_REQUEST: "time-outline",
  RESULT_DISPUTED: "warning-outline",
  WAGER_EXPIRED: "hourglass-outline",
  NEW_FOLLOWER: "person-add-outline",
  FOLLOW_REQUEST: "person-outline",
  COMMENT: "chatbubble-outline",
  TEAM_INVITE: "people-outline",
  PAYMENT_NUDGE: "cash-outline",
};

function NotifRow({
  notif,
  onPress,
}: {
  notif: Notification;
  onPress: () => void;
}) {
  const iconName = TYPE_ICONS[notif.type] ?? "notifications-outline";
  const isWin = notif.type === "WAGER_SETTLED_WIN";
  const isDispute = notif.type === "RESULT_DISPUTED";
  const iconColor = isWin
    ? theme.colors.accent
    : isDispute
    ? theme.colors.destructive
    : theme.colors.textSecondary;

  return (
    <Pressable
      style={[styles.row, !notif.read && styles.rowUnread]}
      onPress={onPress}
    >
      {!notif.read && <View style={styles.unreadDot} />}
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{notif.title}</Text>
          <Text style={styles.rowTime}>{timeAgo(notif.createdAt)}</Text>
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>
          {notif.body}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen({ navigation }: { navigation: any }) {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable
            style={styles.markAllBtn}
            onPress={() => {
              void markAllNotificationsRead();
            }}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <NotifRow
            notif={item}
            onPress={() => {
              void markNotificationRead(item.id);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDesc}>You're all caught up.</Text>
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
  },
  backBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 20,
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  markAllText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  rowUnread: {
    borderColor: `${theme.colors.accent}40`,
    backgroundColor: `${theme.colors.accent}08`,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontSize: 18,
  },
  rowContent: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  rowTime: {
    color: theme.colors.textMuted,
    fontSize: 11,
    flexShrink: 0,
  },
  rowBody: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
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
  },
});
