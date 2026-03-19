import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getOfferings, purchasePackage, restorePurchases } from "../services/subscription";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { PurchasesPackage } from "react-native-purchases";

const FEATURES = [
  { icon: "⚡", text: "Unlimited wagers — no cap" },
  { icon: "👥", text: "Create and manage groups" },
  { icon: "🎯", text: "Side bets within wagers" },
  { icon: "🏆", text: "Full stats & leaderboard" },
  { icon: "🔔", text: "Real-time challenge alerts" },
];

function daysLeft(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionWallScreen() {
  const user = useAppStore((s) => s.user);
  const refreshSubscriptionStatus = useAppStore((s) => s.refreshSubscriptionStatus);

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const trialDays = user.trialEndsAt ? daysLeft(user.trialEndsAt) : 0;
  const trialActive = trialDays > 0;

  useEffect(() => {
    getOfferings().then((p) => {
      setPkg(p);
      setLoadingPkg(false);
    });
  }, []);

  async function handleSubscribe() {
    if (!pkg) return;
    setPurchasing(true);
    setErrorMsg("");
    const result = await purchasePackage(pkg);
    if (result.ok) {
      await refreshSubscriptionStatus();
    } else {
      setErrorMsg(result.message);
    }
    setPurchasing(false);
  }

  async function handleRestore() {
    setRestoring(true);
    setErrorMsg("");
    const result = await restorePurchases();
    if (result.ok) {
      await refreshSubscriptionStatus();
    } else {
      setErrorMsg(result.message || "No subscription found.");
    }
    setRestoring(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Logo */}
        <Image
          source={require("../../assets/ratpac-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Headline */}
        {trialActive ? (
          <>
            <Text style={styles.headline}>
              {trialDays} day{trialDays === 1 ? "" : "s"} left in your trial
            </Text>
            <Text style={styles.subline}>
              Subscribe now to keep full access after your trial ends.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.headline}>Your free trial has ended</Text>
            <Text style={styles.subline}>
              Subscribe to keep betting with your mates.
            </Text>
          </>
        )}

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Price CTA */}
        <View style={styles.priceCard}>
          <Text style={styles.priceAmount}>$1.99</Text>
          <Text style={styles.priceFreq}>per week</Text>
          <Text style={styles.priceSub}>Cancel anytime via App Store</Text>
        </View>

        {/* Subscribe button */}
        <Pressable
          style={[styles.subscribeBtn, (purchasing || loadingPkg) && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={purchasing || loadingPkg || !pkg}
        >
          {purchasing ? (
            <ActivityIndicator color="#001B10" />
          ) : (
            <Text style={styles.subscribeBtnText}>
              {trialActive ? "Subscribe — $1.99/week" : "Start Subscription — $1.99/week"}
            </Text>
          )}
        </Pressable>

        {loadingPkg && !purchasing && (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 8 }} />
        )}

        {errorMsg.length > 0 && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {/* Restore */}
        <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>
            {restoring ? "Restoring..." : "Restore purchase"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  logo: {
    width: 150,
    height: 38,
    marginBottom: 8,
  },
  headline: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  subline: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  featureList: {
    width: "100%",
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
    marginVertical: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  featureText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  priceCard: {
    alignItems: "center",
    gap: 2,
  },
  priceAmount: {
    color: theme.colors.accent,
    fontSize: 42,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  priceFreq: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  priceSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  subscribeBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
    marginTop: 4,
  },
  subscribeBtnDisabled: {
    opacity: 0.5,
  },
  subscribeBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: 13,
    textAlign: "center",
  },
  restoreBtn: {
    paddingVertical: 8,
  },
  restoreText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
});
