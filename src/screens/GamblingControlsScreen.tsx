import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

const EXCLUSION_OPTIONS = [
  { label: "24 hours", days: 1 },
  { label: "1 week", days: 7 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
];

function LimitInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.limitRow}>
      <Text style={styles.limitLabel}>{label}</Text>
      <View style={styles.limitInputWrap}>
        <Text style={styles.limitDollar}>$</Text>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ""))}
          placeholder="No limit"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.limitInput}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );
}

export default function GamblingControlsScreen({ navigation }: { navigation: any }) {
  const gamblingSettings = useAppStore((s) => s.gamblingSettings);
  const wageredTotals = useAppStore((s) => s.wageredTotals);
  const saveGamblingLimits = useAppStore((s) => s.saveGamblingLimits);
  const activateSelfExclusion = useAppStore((s) => s.activateSelfExclusion);
  const refreshGamblingSettings = useAppStore((s) => s.refreshGamblingSettings);

  const [daily, setDaily] = useState(gamblingSettings?.dailyLimit?.toString() ?? "");
  const [weekly, setWeekly] = useState(gamblingSettings?.weeklyLimit?.toString() ?? "");
  const [monthly, setMonthly] = useState(gamblingSettings?.monthlyLimit?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    refreshGamblingSettings();
  }, []);

  useEffect(() => {
    if (gamblingSettings) {
      setDaily(gamblingSettings.dailyLimit?.toString() ?? "");
      setWeekly(gamblingSettings.weeklyLimit?.toString() ?? "");
      setMonthly(gamblingSettings.monthlyLimit?.toString() ?? "");
    }
  }, [gamblingSettings]);

  const isExcluded =
    !!gamblingSettings?.excludedUntil &&
    new Date(gamblingSettings.excludedUntil) > new Date();

  const excludedUntilFormatted = gamblingSettings?.excludedUntil
    ? new Date(gamblingSettings.excludedUntil).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  async function onSaveLimits() {
    setSaving(true);
    setSaveMsg("");
    const result = await saveGamblingLimits(
      daily.trim() ? parseFloat(daily) : null,
      weekly.trim() ? parseFloat(weekly) : null,
      monthly.trim() ? parseFloat(monthly) : null,
    );
    setSaveMsg(result.message);
    setSaving(false);
  }

  function onSelfExclude(option: { label: string; days: number }) {
    Alert.alert(
      "Self-exclusion",
      `You are about to exclude yourself from wagering for ${option.label}. This cannot be undone through the app.\n\nAre you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Exclude for ${option.label}`,
          style: "destructive",
          onPress: async () => {
            const result = await activateSelfExclusion(option.days);
            if (result.ok) {
              Alert.alert(
                "Self-exclusion activated",
                `You are excluded from wagering until ${new Date(
                  Date.now() + option.days * 24 * 60 * 60 * 1000
                ).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.`
              );
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Responsible Gambling</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Active exclusion banner */}
        {isExcluded && (
          <View style={styles.exclusionBanner}>
            <Ionicons name="ban-outline" size={20} color="#FF4444" />
            <View style={styles.exclusionBannerText}>
              <Text style={styles.exclusionBannerTitle}>Self-exclusion active</Text>
              <Text style={styles.exclusionBannerDesc}>
                Wagering is disabled until {excludedUntilFormatted}.
              </Text>
            </View>
          </View>
        )}

        {/* Current period totals */}
        <Text style={styles.sectionHeader}>This period</Text>
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Today</Text>
            <Text style={styles.totalValue}>${wageredTotals.daily.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>This week</Text>
            <Text style={styles.totalValue}>${wageredTotals.weekly.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>This month</Text>
            <Text style={styles.totalValue}>${wageredTotals.monthly.toFixed(2)}</Text>
          </View>
        </View>

        {/* Wager limits */}
        <Text style={styles.sectionHeader}>Wager limits</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            Set a maximum total you can wager per period. Leave blank for no limit.
          </Text>
          <LimitInput label="Daily limit" value={daily} onChange={setDaily} />
          <View style={styles.divider} />
          <LimitInput label="Weekly limit" value={weekly} onChange={setWeekly} />
          <View style={styles.divider} />
          <LimitInput label="Monthly limit" value={monthly} onChange={setMonthly} />

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={onSaveLimits}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save limits"}</Text>
          </Pressable>
          {saveMsg.length > 0 && <Text style={styles.saveMsg}>{saveMsg}</Text>}
        </View>

        {/* Self-exclusion */}
        <Text style={styles.sectionHeader}>Self-exclusion</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            Temporarily block yourself from creating or accepting wagers. This cannot be reversed through the app.
          </Text>
          {isExcluded ? (
            <View style={styles.excludedNote}>
              <Text style={styles.excludedNoteText}>
                Self-exclusion is active until {excludedUntilFormatted}.
              </Text>
            </View>
          ) : (
            EXCLUSION_OPTIONS.map((opt, i) => (
              <React.Fragment key={opt.days}>
                {i > 0 && <View style={styles.divider} />}
                <Pressable style={styles.exclusionRow} onPress={() => onSelfExclude(opt)}>
                  <Text style={styles.exclusionLabel}>{opt.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </Pressable>
              </React.Fragment>
            ))
          )}
        </View>

        {/* Help */}
        <View style={styles.helpBox}>
          <Text style={styles.helpText}>
            If you are concerned about your gambling, free help is available at{" "}
            <Text style={styles.helpLink}>www.gamblinghelponline.org.au</Text>
            {" "}or call 1800 858 858.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1, borderColor: theme.colors.border,
    alignItems: "center", justifyContent: "center",
  },
  backBtnText: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "600", lineHeight: 20 },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 48 },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 12, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  section: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 12, overflow: "hidden",
  },
  sectionDesc: {
    color: theme.colors.textMuted,
    fontSize: 13, lineHeight: 18,
    padding: 16, paddingBottom: 12,
  },
  divider: { height: 1, backgroundColor: theme.colors.border, marginLeft: 16 },
  // Exclusion banner
  exclusionBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FF444415",
    borderWidth: 1, borderColor: "#FF444440",
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  exclusionBannerText: { flex: 1 },
  exclusionBannerTitle: { color: "#FF4444", fontWeight: "700", fontSize: 14 },
  exclusionBannerDesc: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  // Totals
  totalRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  totalLabel: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" },
  totalValue: {
    color: theme.colors.accent, fontSize: 15,
    fontWeight: "700", fontVariant: ["tabular-nums"],
  },
  // Limits
  limitRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  limitLabel: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" },
  limitInputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 2,
  },
  limitDollar: { color: theme.colors.textMuted, fontSize: 15, fontWeight: "600" },
  limitInput: {
    color: theme.colors.textPrimary, fontSize: 15,
    fontWeight: "600", minWidth: 80, textAlign: "right",
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    margin: 16, borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  saveMsg: {
    color: theme.colors.textMuted, fontSize: 12,
    textAlign: "center", marginBottom: 12,
  },
  // Self-exclusion
  exclusionRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  exclusionLabel: { color: theme.colors.destructive, fontSize: 15, fontWeight: "500" },
  excludedNote: { padding: 16 },
  excludedNoteText: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  // Help
  helpBox: {
    marginTop: 24, padding: 16,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 12,
  },
  helpText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  helpLink: { color: theme.colors.accent, fontWeight: "600" },
});
