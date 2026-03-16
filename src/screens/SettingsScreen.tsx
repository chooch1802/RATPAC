import React from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { registerAndSaveToken, removeDeviceToken, registerForPushNotifications } from "../services/pushNotifications";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

function SettingsRow({
  label,
  value,
  onPress,
  chevron = true,
  danger = false,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {right ? right : chevron && onPress ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

const PRIVACY_POLICY_URL = "https://chooch1802.github.io/RATPAC/privacy-policy";
const TERMS_URL = "https://chooch1802.github.io/RATPAC/privacy-policy";
const HELP_EMAIL = "mailto:support@ratpac.app";

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const user = useAppStore((s) => s.user);
  const setDraftPrivacy = useAppStore((s) => s.setDraftPrivacy);
  const setAuth = useAppStore((s) => s.setAuth);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const challengeAlertsEnabled = useAppStore((s) => s.challengeAlertsEnabled);
  const settlementAlertsEnabled = useAppStore((s) => s.settlementAlertsEnabled);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const setChallengeAlertsEnabled = useAppStore((s) => s.setChallengeAlertsEnabled);
  const setSettlementAlertsEnabled = useAppStore((s) => s.setSettlementAlertsEnabled);

  async function onToggleNotifications(val: boolean) {
    setNotificationsEnabled(val);
    if (val) {
      await registerAndSaveToken();
    } else {
      const token = await registerForPushNotifications();
      if (token) await removeDeviceToken(token);
    }
  }

  function onSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => setAuth(false),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingsRow label="Handle" value={user.handle} chevron={false} />
          <View style={styles.divider} />
          <SettingsRow
            label="Account privacy"
            right={
              <Switch
                value={user.isPrivate}
                onValueChange={(val) => setDraftPrivacy(val)}
                trackColor={{ false: theme.colors.bgTertiary, true: theme.colors.accent }}
                thumbColor={user.isPrivate ? "#001B10" : theme.colors.textMuted}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow label="Edit profile" onPress={() => navigation.navigate("EditProfile")} />
        </View>

        {/* Subscription */}
        <SectionHeader title="Subscription" />
        <View style={styles.section}>
          <SettingsRow
            label="Status"
            value={user.isSubscribed ? "Ratpac Pro — Active" : "Free tier"}
            chevron={false}
          />
          <View style={styles.divider} />
          {user.isSubscribed ? (
            <SettingsRow
              label="Manage subscription"
              onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")}
            />
          ) : (
            <SettingsRow
              label="Subscribe — $4.99/mo"
              onPress={() => navigation.goBack()}
            />
          )}
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <SettingsRow
            label="Push notifications"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={onToggleNotifications}
                trackColor={{ false: theme.colors.bgTertiary, true: theme.colors.accent }}
                thumbColor={notificationsEnabled ? "#001B10" : theme.colors.textMuted}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Challenge alerts"
            right={
              <Switch
                value={notificationsEnabled && challengeAlertsEnabled}
                onValueChange={setChallengeAlertsEnabled}
                disabled={!notificationsEnabled}
                trackColor={{ false: theme.colors.bgTertiary, true: theme.colors.accent }}
                thumbColor={challengeAlertsEnabled && notificationsEnabled ? "#001B10" : theme.colors.textMuted}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Settlement alerts"
            right={
              <Switch
                value={notificationsEnabled && settlementAlertsEnabled}
                onValueChange={setSettlementAlertsEnabled}
                disabled={!notificationsEnabled}
                trackColor={{ false: theme.colors.bgTertiary, true: theme.colors.accent }}
                thumbColor={settlementAlertsEnabled && notificationsEnabled ? "#001B10" : theme.colors.textMuted}
              />
            }
          />
        </View>

        {/* Responsible gambling */}
        <SectionHeader title="Responsible Gambling" />
        <View style={styles.section}>
          <SettingsRow
            label="Wager limits & self-exclusion"
            onPress={() => navigation.navigate("GamblingControls")}
          />
        </View>

        {/* Help */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingsRow label="Help & FAQ" onPress={() => Linking.openURL(HELP_EMAIL)} />
          <View style={styles.divider} />
          <SettingsRow label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
          <View style={styles.divider} />
          <SettingsRow label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
        </View>

        {/* Danger zone */}
        <View style={[styles.section, styles.sectionLast]}>
          <SettingsRow
            label="Sign out"
            onPress={onSignOut}
            danger
          />
        </View>

        <Text style={styles.version}>Ratpac v1.0</Text>
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
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionLast: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowLeft: {
    flex: 1,
  },
  rowLabel: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  rowLabelDanger: {
    color: theme.colors.destructive,
  },
  rowValue: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: theme.colors.textMuted,
    fontSize: 20,
    fontWeight: "300",
  },
  version: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
  },
});
