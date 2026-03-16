import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "../services/subscription";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

const FEATURES = [
  "Create and accept wagers",
  "P2P settlement via Venmo, Cash App & PayPal",
  "Group & pool wagers",
  "Teams",
  "Public feed & social profile",
];

export function PaywallModal() {
  const showPaywall = useAppStore((s) => s.showPaywall);
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

  const priceString = pkg?.product.priceString ?? "$4.99";
  const hasFreeTrial = !!pkg?.product.introPrice;

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

          <Text style={styles.title}>Ratpac Pro</Text>
          <View style={styles.trialBadge}>
            <Text style={styles.trialBadgeText}>First month free</Text>
          </View>

          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

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
                  {hasFreeTrial ? "Start free trial" : `Subscribe — ${priceString} / month`}
                </Text>
                <Text style={styles.subscribeBtnSub}>
                  {hasFreeTrial
                    ? `Free for 1 month, then ${priceString}/mo · Cancel anytime`
                    : "Cancel anytime"}
                </Text>
              </>
            )}
          </Pressable>

          {message.length > 0 && (
            <Text style={styles.message}>{message}</Text>
          )}

          <Pressable
            style={styles.restoreBtn}
            onPress={onRestore}
            disabled={restoring}
          >
            <Text style={styles.restoreBtnText}>
              {restoring ? "Restoring..." : "Restore purchases"}
            </Text>
          </Pressable>

          <Pressable style={styles.dismissBtn} onPress={() => setPaywallVisible(false)}>
            <Text style={styles.dismissBtnText}>Not now</Text>
          </Pressable>
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
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  trialBadge: {
    alignSelf: "center",
    backgroundColor: `${theme.colors.accent}20`,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}50`,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  trialBadgeText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  featureList: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureCheck: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "700",
    width: 20,
  },
  featureText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
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
