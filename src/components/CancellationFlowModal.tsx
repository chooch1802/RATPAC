import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import { logCancellationSurvey } from "../services/auth";
import { getWinBackOffering, purchasePackage } from "../services/subscription";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

const CANCEL_REASONS = [
  { id: "too_expensive", label: "Too expensive" },
  { id: "not_using", label: "Not using it enough" },
  { id: "missing_feature", label: "Missing a feature I need" },
  { id: "found_alternative", label: "Found a better alternative" },
  { id: "technical_issues", label: "Technical issues" },
  { id: "other", label: "Something else" },
];

type Step = "survey" | "winback";

export function CancellationFlowModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const user = useAppStore((s) => s.user);
  const setSubscribed = useAppStore((s) => s.setSubscribed);
  const [step, setStep] = useState<Step>("survey");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [winBackPackage, setWinBackPackage] = useState<PurchasesPackage | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep("survey");
      setSelectedReason(null);
      setWinBackPackage(null);
    }
  }, [visible]);

  async function onContinue() {
    if (!selectedReason) return;
    void logCancellationSurvey(selectedReason);
    setLoadingOffer(true);
    const pkg = await getWinBackOffering();
    setWinBackPackage(pkg);
    setLoadingOffer(false);
    setStep("winback");
  }

  async function onClaimOffer() {
    if (!winBackPackage) return;
    setPurchasing(true);
    const result = await purchasePackage(winBackPackage);
    setPurchasing(false);
    if (result.ok) {
      setSubscribed(true);
      Alert.alert(
        "Offer claimed!",
        "Your discounted rate is now active. Thanks for sticking with Ratpac!"
      );
      onClose();
    } else if (result.message !== "Purchase cancelled.") {
      Alert.alert("Something went wrong", result.message);
    }
  }

  function onCancelAnyway() {
    onClose();
    Linking.openURL("https://apps.apple.com/account/subscriptions");
  }

  const winRate =
    user.wins + user.losses > 0
      ? Math.round((user.wins / (user.wins + user.losses)) * 100)
      : 0;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {step === "survey" ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>Before you go...</Text>
              <Text style={styles.subtitle}>
                Help us improve Ratpac. Why are you thinking of leaving?
              </Text>

              <View style={styles.reasonsList}>
                {CANCEL_REASONS.map((r) => (
                  <Pressable
                    key={r.id}
                    style={[
                      styles.reasonRow,
                      selectedReason === r.id && styles.reasonRowSelected,
                    ]}
                    onPress={() => setSelectedReason(r.id)}
                  >
                    <View style={[styles.radio, selectedReason === r.id && styles.radioSelected]}>
                      {selectedReason === r.id && <View style={styles.radioDot} />}
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        selectedReason === r.id && styles.reasonTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.primaryBtn, (!selectedReason || loadingOffer) && styles.primaryBtnDisabled]}
                onPress={onContinue}
                disabled={!selectedReason || loadingOffer}
              >
                {loadingOffer ? (
                  <ActivityIndicator color="#001B10" />
                ) : (
                  <Text style={styles.primaryBtnText}>Continue</Text>
                )}
              </Pressable>

              <Pressable style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostBtnText}>Keep my subscription</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>EXCLUSIVE OFFER</Text>
              </View>

              <Text style={styles.title}>Stay for less</Text>
              <Text style={styles.subtitle}>
                We don't want to lose you. Here's a special rate just for you.
              </Text>

              {/* Stats — remind them what they'd lose */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{user.wins + user.losses}</Text>
                  <Text style={styles.statLabel}>Wagers{"\n"}tracked</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{winRate}%</Text>
                  <Text style={styles.statLabel}>Win{"\n"}rate</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>${user.totalWagered.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Total{"\n"}wagered</Text>
                </View>
              </View>

              {/* Offer card */}
              <View style={styles.offerCard}>
                <Text style={styles.offerPrice}>
                  $0.99
                  <Text style={styles.offerPricePer}>/week</Text>
                </Text>
                <Text style={styles.offerDetail}>for your next 4 weeks</Text>
                <View style={styles.offerDivider} />
                <Text style={styles.offerThen}>then $1.99/week · cancel anytime</Text>
              </View>

              {winBackPackage ? (
                <Pressable
                  style={[styles.primaryBtn, purchasing && styles.primaryBtnDisabled]}
                  onPress={onClaimOffer}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#001B10" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Claim this offer</Text>
                  )}
                </Pressable>
              ) : (
                /* Offer not available (RevenueCat not set up) — just keep them */
                <Pressable style={styles.primaryBtn} onPress={onClose}>
                  <Text style={styles.primaryBtnText}>Keep my subscription</Text>
                </Pressable>
              )}

              <Pressable style={styles.ghostBtn} onPress={onCancelAnyway}>
                <Text style={styles.ghostBtnDanger}>No thanks, cancel anyway</Text>
              </Pressable>
            </ScrollView>
          )}
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
    padding: 20,
    paddingBottom: 48,
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  // Survey
  reasonsList: {
    gap: 8,
    marginBottom: 20,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reasonRowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}12`,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: theme.colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  reasonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  reasonTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  // Win-back
  offerBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${theme.colors.accent}20`,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}60`,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  offerBadgeText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: theme.colors.accent,
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  offerCard: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    gap: 4,
  },
  offerPrice: {
    color: theme.colors.textPrimary,
    fontSize: 48,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  offerPricePer: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  offerDetail: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  offerDivider: {
    height: 1,
    width: "60%",
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  offerThen: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  // Buttons
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 16,
  },
  ghostBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  ghostBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  ghostBtnDanger: {
    color: theme.colors.textMuted,
    fontWeight: "500",
    fontSize: 13,
  },
});
