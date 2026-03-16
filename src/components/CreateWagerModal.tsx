import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { PaymentMethod } from "../types";

const PAYMENT_METHODS: { id: PaymentMethod; icon: string }[] = [
  { id: "Venmo", icon: "💙" },
  { id: "Cash App", icon: "💚" },
  { id: "PayPal", icon: "🔵" },
  { id: "Other", icon: "💸" },
];

type Step = 1 | 2 | 3 | 4 | 5;

export function CreateWagerModal() {
  const showCreateWager = useAppStore((s) => s.showCreateWager);
  const setCreateWagerVisible = useAppStore((s) => s.setCreateWagerVisible);
  const createWager = useAppStore((s) => s.createWager);
  const allowedActivities = useAppStore((s) => s.allowedActivities);
  const user = useAppStore((s) => s.user);

  const [step, setStep] = useState<Step>(1);
  const [selectedActivity, setSelectedActivity] = useState("");
  const [customActivityName, setCustomActivityName] = useState("");
  const [termsText, setTermsText] = useState("");
  const [amount, setAmount] = useState("");
  const [opponent, setOpponent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Venmo");
  const [paymentHandle, setPaymentHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setStep(1);
    setSelectedActivity("");
    setCustomActivityName("");
    setTermsText("");
    setAmount("");
    setOpponent("");
    setIsPublic(true);
    setPaymentMethod("Venmo");
    setPaymentHandle("");
  }

  function close() {
    reset();
    setCreateWagerVisible(false);
  }

  async function submit() {
    setIsSubmitting(true);
    const activityName =
      selectedActivity === "Custom" && customActivityName.trim()
        ? customActivityName.trim()
        : selectedActivity;
    await createWager({
      activity: activityName,
      amount: parseFloat(amount) || 0,
      opponentHandle: opponent.trim(),
      termsText: termsText.trim(),
      isPublic,
      paymentMethod,
      paymentHandle,
    });
    setIsSubmitting(false);
    reset();
  }

  const canAdvanceStep1 = selectedActivity.length > 0 &&
    (selectedActivity !== "Custom" || customActivityName.trim().length > 0);
  const canAdvanceStep3 =
    parseFloat(amount) >= 1 && opponent.trim().length > 0;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={showCreateWager}
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {step === 1 && "Select Activity"}
              {step === 2 && "Set Terms"}
              {step === 3 && "Amount & Opponent"}
              {step === 4 && "Review & Confirm"}
              {step === 5 && "Share to Feed"}
            </Text>
            <Text style={styles.stepIndicator}>{step} / 5</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Step 1: Activity */}
            {step === 1 && (
              <View>
                <View style={styles.activityGrid}>
                  {allowedActivities.map((a) => (
                    <Pressable
                      key={a.id}
                      style={[
                        styles.activityItem,
                        selectedActivity === a.name && styles.activityItemSelected,
                      ]}
                      onPress={() => setSelectedActivity(a.name)}
                    >
                      <Text style={styles.activityIcon}>{a.icon}</Text>
                      <Text
                        style={[
                          styles.activityName,
                          selectedActivity === a.name && styles.activityNameSelected,
                        ]}
                      >
                        {a.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {selectedActivity === "Custom" && (
                  <TextInput
                    value={customActivityName}
                    onChangeText={setCustomActivityName}
                    placeholder="Describe your activity..."
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                    autoCapitalize="sentences"
                  />
                )}
              </View>
            )}

            {/* Step 2: Terms */}
            {step === 2 && (
              <View>
                <Text style={styles.stepLabel}>
                  {selectedActivity === "Custom"
                    ? "What's the bet?"
                    : `What are the terms for your ${selectedActivity} wager?`}
                </Text>
                <TextInput
                  value={termsText}
                  onChangeText={setTermsText}
                  placeholder={
                    selectedActivity === "Golf"
                      ? "e.g. Lowest score over 18 holes at Royal Melbourne"
                      : selectedActivity === "Darts"
                      ? "e.g. 501, straight out — best of 3 legs"
                      : "Describe the wager terms..."
                  }
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                  numberOfLines={4}
                  autoCapitalize="sentences"
                />
              </View>
            )}

            {/* Step 3: Amount & Opponent */}
            {step === 3 && (
              <View>
                <Text style={styles.stepLabel}>Wager amount</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, styles.amountInput]}
                  />
                </View>
                <Text style={styles.stepLabel}>Challenge opponent</Text>
                <TextInput
                  value={opponent}
                  onChangeText={setOpponent}
                  placeholder="@username"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <View>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Activity</Text>
                    <Text style={styles.reviewValue}>
                      {selectedActivity === "Custom" ? customActivityName : selectedActivity}
                    </Text>
                  </View>
                  {termsText.trim().length > 0 && (
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Terms</Text>
                      <Text style={[styles.reviewValue, styles.reviewValueSmall]}>{termsText}</Text>
                    </View>
                  )}
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Your stake</Text>
                    <Text style={[styles.reviewValue, styles.reviewValueAccent]}>
                      ${parseFloat(amount || "0").toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Vs</Text>
                    <Text style={styles.reviewValue}>{opponent}</Text>
                  </View>
                </View>
                <Text style={styles.stepLabel}>How will you settle up?</Text>
                <View style={styles.paymentGrid}>
                  {PAYMENT_METHODS.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[
                        styles.paymentChip,
                        paymentMethod === m.id && styles.paymentChipSelected,
                      ]}
                      onPress={() => setPaymentMethod(m.id)}
                    >
                      <Text style={styles.paymentChipIcon}>{m.icon}</Text>
                      <Text
                        style={[
                          styles.paymentChipText,
                          paymentMethod === m.id && styles.paymentChipTextSelected,
                        ]}
                      >
                        {m.id}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {paymentMethod !== "Other" && (
                  <TextInput
                    value={paymentHandle}
                    onChangeText={setPaymentHandle}
                    placeholder={
                      paymentMethod === "Venmo"
                        ? "@yourhandle"
                        : paymentMethod === "Cash App"
                        ? "$yourcashtag"
                        : "paypal.me/username"
                    }
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
                <Text style={styles.paymentHint}>
                  The loser pays the winner directly — no money passes through Ratpac.
                </Text>
              </View>
            )}

            {/* Step 5: Share */}
            {step === 5 && (
              <View>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleTitle}>Share to feed</Text>
                    <Text style={styles.toggleDesc}>
                      {isPublic
                        ? "Your wager will appear on your public feed"
                        : "Only you and your opponent will see this wager"}
                    </Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{ false: theme.colors.bgTertiary, true: theme.colors.accent }}
                    thumbColor={isPublic ? "#001B10" : theme.colors.textMuted}
                  />
                </View>
                <Text style={styles.shareHint}>
                  {user.isPrivate
                    ? "Your account is private — only your followers will see this."
                    : "Your account is public — anyone can see shared wagers."}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Navigation buttons */}
          <View style={styles.navRow}>
            {step > 1 && (
              <Pressable style={styles.backBtn} onPress={() => setStep((s) => (s - 1) as Step)}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            )}

            {step < 5 && (
              <Pressable
                style={[
                  styles.nextBtn,
                  step === 1 && !canAdvanceStep1 && styles.nextBtnDisabled,
                  step === 3 && !canAdvanceStep3 && styles.nextBtnDisabled,
                ]}
                onPress={() => setStep((s) => (s + 1) as Step)}
                disabled={(step === 1 && !canAdvanceStep1) || (step === 3 && !canAdvanceStep3)}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </Pressable>
            )}

            {step === 5 && (
              <Pressable
                style={[styles.nextBtn, isSubmitting && styles.nextBtnDisabled]}
                onPress={submit}
                disabled={isSubmitting}
              >
                <Text style={styles.nextBtnText}>
                  {isSubmitting ? "Sending..." : "Send Challenge"}
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  stepIndicator: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  activityItem: {
    width: "30%",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  activityItemSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}15`,
  },
  activityIcon: {
    fontSize: 28,
  },
  activityName: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  activityNameSelected: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  stepLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: "top",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  currencyPrefix: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginRight: 6,
    marginTop: -2,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginBottom: 0,
  },
  reviewCard: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reviewLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  reviewValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  reviewValueSmall: {
    fontSize: 13,
    fontWeight: "400",
  },
  reviewValueAccent: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  paymentGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  paymentChip: {
    flex: 1,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  paymentChipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}15`,
  },
  paymentChipIcon: {
    fontSize: 20,
  },
  paymentChipText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  paymentChipTextSelected: {
    color: theme.colors.accent,
  },
  paymentHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  toggleDesc: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  shareHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  backBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  nextBtn: {
    flex: 2,
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 15,
  },
});
