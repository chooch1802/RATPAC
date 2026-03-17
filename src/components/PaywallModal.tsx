import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "../services/subscription";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

const FREE_FEATURES = [
  "View the public feed",
  "Accept & decline challenges",
  "Up to 3 active wagers",
  "Join groups",
];

const PRO_FEATURES = [
  "Unlimited wagers",
  "Create groups",
  "Side bets",
  "All payment methods",
];

const TRIGGER_MESSAGES: Record<string, { title: string; body: string }> = {
  wager_limit: {
    title: "You've hit your free limit",
    body: "Free accounts can track up to 3 active wagers. Upgrade to go unlimited.",
  },
  group_create: {
    title: "Creating groups is a Pro feature",
    body: "Upgrade to create group chats, track group wagers, and invite your mates.",
  },
  side_bet: {
    title: "Side bets are a Pro feature",
    body: "Upgrade to add side bets to any active wager.",
  },
};

export function PaywallModal() {
  const showPaywall = useAppStore((s) => s.showPaywall);
  const paywallTrigger = useAppStore((s) => s.paywallTrigger);
  const setPaywallVisible = useAppStore((s) => s.setPaywallVisible);
  const setSubscribed = useAppStore((s) => s.setSubscribed);

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (showPaywall) {
      setMessage("");
      getOfferings().then(setPkg);
    }
  }, [showPaywall]);

  const priceString = pkg?.product.priceString ?? "$1.99";
  const hasFreeTrial = pkg ? !!pkg.product.introPrice : true;
  const triggerMsg = paywallTrigger ? TRIGGER_MESSAGES[paywallTrigger] : null;

  async function onSubscribe() {
    if (!pkg) return;
    setLoading(true);
    setMessage("");
    const result = await purchasePackage(pkg);
    if (result.ok) {
      setSubscribed(true);
      setPaywallVisible(false);
    } else {
      setMessage(result.message);
    }
    setLoading(false);
  }

  async function onRestore() {
    setRestoring(true);
    setMessage("");
    const result = await restorePurchases();
    if (result.ok) {
      setSubscribed(true);
      setPaywallVisible(false);
    } else {
      setMessage(result.message);
    }
    setRestoring(false);
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={showPaywall}
      onRequestClose={() => setPaywallVisible(false)}
    >
      <Pressable style={styles.backdrop} onPress={() => setPaywallVisible(false)}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Context message if triggered by a specific action */}
            {triggerMsg ? (
              <View style={styles.triggerBanner}>
                <Text style={styles.triggerTitle}>{triggerMsg.title}</Text>
                <Text style={styles.triggerBody}>{triggerMsg.body}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.title}>Ratpac Pro</Text>
                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>7 days free — then {priceString}/week</Text>
                </View>
              </>
            )}

            {/* Free vs Pro comparison */}
            <View style={styles.comparisonRow}>
              {/* Free column */}
              <View style={[styles.comparisonCol, styles.comparisonColFree]}>
                <Text style={styles.comparisonColTitle}>Free</Text>
                {FREE_FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureCheckFree}>✓</Text>
                    <Text style={styles.featureTextFree}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* Pro column */}
              <View style={[styles.comparisonCol, styles.comparisonColPro]}>
                <Text style={styles.comparisonColTitlePro}>Pro</Text>
                <Text style={styles.comparisonColSubtitle}>Everything free, plus:</Text>
                {PRO_FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureCheckPro}>⚡</Text>
                    <Text style={styles.featureTextPro}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Trial badge if triggered */}
            {triggerMsg && (
              <View style={styles.trialBadgeInline}>
                <Text style={styles.trialBadgeText}>7 days free — then {priceString}/week</Text>
              </View>
            )}

            <Pressable
              style={[styles.subscribeBtn, (loading || !pkg) && styles.btnDisabled]}
              onPress={onSubscribe}
              disabled={loading || !pkg}
            >
              {loading ? (
                <ActivityIndicator color="#001B10" />
              ) : (
                <>
                  <Text style={styles.subscribeBtnText}>
                    {hasFreeTrial ? "Start 7-day free trial" : `Subscribe — ${priceString}/week`}
                  </Text>
                  <Text style={styles.subscribeBtnSub}>
                    {hasFreeTrial
                      ? `Free for 7 days, then ${priceString}/week · Cancel anytime`
                      : "Cancel anytime"}
                  </Text>
                </>
              )}
            </Pressable>

            {message.length > 0 && (
              <Text style={styles.message}>{message}</Text>
            )}

            <Pressable style={styles.restoreBtn} onPress={onRestore} disabled={restoring}>
              <Text style={styles.restoreBtnText}>
                {restoring ? "Restoring..." : "Restore purchases"}
              </Text>
            </Pressable>

            <Pressable style={styles.dismissBtn} onPress={() => setPaywallVisible(false)}>
              <Text style={styles.dismissBtnText}>Not now</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  // Generic header (no trigger)
  title: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  trialBadge: {
    alignSelf: "center",
    backgroundColor: `${theme.colors.accent}20`,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}50`,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  trialBadgeInline: {
    alignSelf: "center",
    backgroundColor: `${theme.colors.accent}20`,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}50`,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  trialBadgeText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  // Trigger banner
  triggerBanner: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  triggerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  triggerBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  // Comparison table
  comparisonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  comparisonCol: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  comparisonColFree: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  comparisonColPro: {
    backgroundColor: `${theme.colors.accent}12`,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  comparisonColTitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  comparisonColTitlePro: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  comparisonColSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  featureCheckFree: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  featureTextFree: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  featureCheckPro: {
    fontSize: 12,
    marginTop: 1,
  },
  featureTextPro: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    flex: 1,
  },
  // Subscribe button
  subscribeBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    gap: 2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  subscribeBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 16,
  },
  subscribeBtnSub: {
    color: "#001B1080",
    fontSize: 12,
    fontWeight: "500",
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  restoreBtnText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  dismissBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dismissBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
});
