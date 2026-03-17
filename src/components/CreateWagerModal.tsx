import React, { useEffect, useState } from "react";
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
import { Group, PaymentMethod } from "../types";

const PAYMENT_METHODS: { id: PaymentMethod; icon: string; hint: string }[] = [
  { id: "Venmo", icon: "💙", hint: "🇺🇸" },
  { id: "Cash App", icon: "💚", hint: "🇺🇸🇬🇧" },
  { id: "PayPal", icon: "🔵", hint: "🌍" },
  { id: "Zelle", icon: "💛", hint: "🇺🇸" },
  { id: "Revolut", icon: "🌀", hint: "🇬🇧🇦🇺" },
  { id: "PayID", icon: "🇦🇺", hint: "🇦🇺🇳🇿" },
  { id: "Interac", icon: "🇨🇦", hint: "🇨🇦" },
  { id: "Bank Transfer", icon: "🏦", hint: "🌍" },
  { id: "Other", icon: "💸", hint: "" },
];

function getPaymentHandlePlaceholder(method: PaymentMethod): string {
  switch (method) {
    case "Venmo": return "@yourhandle";
    case "Cash App": return "$yourcashtag";
    case "PayPal": return "paypal.me/username";
    case "Zelle": return "Phone or email";
    case "Revolut": return "@revtag or phone";
    case "PayID": return "Email, phone, or ABN";
    case "Interac": return "Email or phone number";
    case "Bank Transfer": return "BSB/Account or IBAN";
    default: return "Your handle or details";
  }
}

type Sport = {
  id: string;
  name: string;
  icon: string;
};

type BetTypeOption = {
  id: string;
  name: string;
  description: string;
};

const SPORTS: Sport[] = [
  { id: "golf", name: "Golf", icon: "⛳" },
  { id: "tennis", name: "Tennis", icon: "🎾" },
  { id: "pickleball", name: "Pickleball", icon: "🏓" },
  { id: "pool", name: "Pool", icon: "🎱" },
  { id: "darts", name: "Darts", icon: "🎯" },
  { id: "padel", name: "Padel", icon: "🏸" },
  { id: "poker", name: "Poker", icon: "♠️" },
  { id: "custom", name: "Custom", icon: "🤝" },
];

const BET_TYPES: Record<string, BetTypeOption[]> = {
  golf: [
    { id: "nassau", name: "Nassau", description: "Three separate bets: front 9, back 9, overall 18" },
    { id: "skins", name: "Skins", description: "Win each hole outright to earn skins" },
    { id: "match_play", name: "Match Play", description: "Win holes to win the match" },
    { id: "stroke_play", name: "Stroke Play", description: "Lowest total score wins" },
    { id: "wolf", name: "Wolf", description: "Rotating captain picks partner each hole" },
    { id: "custom", name: "Custom", description: "Define your own bet terms" },
  ],
  tennis: [
    { id: "match_winner", name: "Match Winner", description: "Bet on who wins the full match" },
    { id: "set_betting", name: "Set Betting", description: "Predict the exact set score" },
    { id: "handicap", name: "Handicap", description: "Bet with a game or set handicap applied" },
    { id: "custom", name: "Custom", description: "Define your own bet terms" },
  ],
  pickleball: [
    { id: "match_winner", name: "Match Winner", description: "Bet on who wins the match" },
    { id: "game_by_game", name: "Game by Game", description: "Bet on individual game outcomes" },
    { id: "custom", name: "Custom", description: "Define your own bet terms" },
  ],
  pool: [
    { id: "match_winner", name: "Match Winner", description: "Bet on who wins the match" },
    { id: "race_to_n", name: "Race to N", description: "First to win N racks takes the bet" },
    { id: "custom", name: "Custom", description: "Define your own bet terms" },
  ],
  darts: [
    { id: "match_winner", name: "Match Winner", description: "Bet on who wins the match" },
    { id: "best_of_legs", name: "Best of Legs", description: "Bet on best of a set number of legs" },
    { id: "custom", name: "Custom", description: "Define your own bet terms" },
  ],
  padel: [
    { id: "match_winner", name: "Match Winner", description: "Bet on who wins the match" },
    { id: "custom", name: "Custom", description: "Define your own bet terms" },
  ],
  poker: [
    { id: "session_winner", name: "Session Winner", description: "Bet on who finishes with the most chips" },
    { id: "prop_bet", name: "Prop Bet", description: "Side bet on a specific in-game outcome" },
    { id: "custom", name: "Custom", description: "Define your own bet terms" },
  ],
  custom: [
    { id: "custom", name: "Custom Bet", description: "Name and describe your own wager" },
  ],
};

function getTermsPlaceholder(sportId: string, betTypeId: string): string {
  if (sportId === "golf") {
    if (betTypeId === "nassau") return "e.g. $5 Nassau at Torrey Pines, full handicap";
    if (betTypeId === "skins") return "e.g. Skins game, $2 per skin at Augusta National";
    return "e.g. Lowest gross score over 18 holes";
  }
  if (sportId === "tennis") return "e.g. Best of 3 sets at the local club, no handicap";
  if (sportId === "pickleball") return "e.g. Best of 3 games, first to 11 wins";
  if (sportId === "pool") return "e.g. 8-ball, race to 5 racks";
  if (sportId === "darts") return "e.g. 501, straight in straight out, best of 5 legs";
  if (sportId === "padel") return "e.g. Best of 3 sets at the padel club";
  if (sportId === "poker") return "e.g. Home game this Friday, whoever finishes with most chips";
  return "Describe the wager terms...";
}

type Step = 1 | 2 | 3 | 4;

export function CreateWagerModal() {
  const showCreateWager = useAppStore((s) => s.showCreateWager);
  const setCreateWagerVisible = useAppStore((s) => s.setCreateWagerVisible);
  const createWager = useAppStore((s) => s.createWager);
  const user = useAppStore((s) => s.user);
  const groups = useAppStore((s) => s.groups);
  const createWagerContext = useAppStore((s) => s.createWagerContext);
  const setCreateWagerContext = useAppStore((s) => s.setCreateWagerContext);

  const [step, setStep] = useState<Step>(1);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<BetTypeOption | null>(null);
  const [betName, setBetName] = useState("");
  const [termsText, setTermsText] = useState("");
  const [amount, setAmount] = useState("");
  const [opponent, setOpponent] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Venmo");
  const [paymentHandle, setPaymentHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read context from store when modal opens
  useEffect(() => {
    if (showCreateWager && createWagerContext) {
      if (createWagerContext.groupId) {
        setSelectedGroupId(createWagerContext.groupId);
      }
    }
  }, [showCreateWager, createWagerContext]);

  function reset() {
    setStep(1);
    setSelectedSport(null);
    setSelectedBetType(null);
    setBetName("");
    setTermsText("");
    setAmount("");
    setOpponent("");
    setSelectedGroupId(null);
    setShowGroupPicker(false);
    setIsPublic(true);
    setPaymentMethod("Venmo");
    setPaymentHandle("");
  }

  function close() {
    reset();
    setCreateWagerContext(null);
    setCreateWagerVisible(false);
  }

  async function submit() {
    if (!selectedSport || !selectedBetType) return;
    setIsSubmitting(true);

    const isCustomBetType = selectedBetType.id === "custom";
    const activityName =
      isCustomBetType && betName.trim()
        ? betName.trim()
        : selectedBetType.name !== "Custom Bet"
        ? `${selectedSport.name} — ${selectedBetType.name}`
        : selectedSport.name;

    try {
      await createWager({
        activity: activityName,
        amount: parseFloat(amount) || 0,
        opponentHandle: opponent.trim(),
        termsText: termsText.trim(),
        isPublic,
        paymentMethod,
        paymentHandle,
        sport: selectedSport.id,
        betType: selectedBetType.id,
        groupId: selectedGroupId ?? undefined,
        parentWagerId: createWagerContext?.parentWagerId ?? undefined,
      });
    } catch {
      // error handled by store
    }
    setIsSubmitting(false);
    reset();
    setCreateWagerContext(null);
  }

  const canAdvanceStep1 = selectedSport !== null;
  const canAdvanceStep2 =
    selectedBetType !== null &&
    (selectedBetType.id !== "custom" || betName.trim().length > 0);
  const canAdvanceStep3 =
    parseFloat(amount) >= 1 && opponent.trim().length > 0;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
  const betTypeOptions = selectedSport ? BET_TYPES[selectedSport.id] ?? [] : [];

  function getStepTitle(): string {
    switch (step) {
      case 1: return "Select Sport";
      case 2: return "Bet Type";
      case 3: return "Amount & Opponent";
      case 4: return "Review & Send";
    }
  }

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
            <Text style={styles.sheetTitle}>{getStepTitle()}</Text>
            <Text style={styles.stepIndicator}>{step} / 4</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Sport */}
            {step === 1 && (
              <View style={styles.sportGrid}>
                {SPORTS.map((sport) => (
                  <Pressable
                    key={sport.id}
                    style={[
                      styles.sportItem,
                      selectedSport?.id === sport.id && styles.sportItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedSport(sport);
                      setSelectedBetType(null);
                      setBetName("");
                    }}
                  >
                    <Text style={styles.sportIcon}>{sport.icon}</Text>
                    <Text
                      style={[
                        styles.sportName,
                        selectedSport?.id === sport.id && styles.sportNameSelected,
                      ]}
                    >
                      {sport.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Step 2: Bet Type */}
            {step === 2 && selectedSport && (
              <View>
                {betTypeOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.betTypeRow,
                      selectedBetType?.id === option.id && styles.betTypeRowSelected,
                    ]}
                    onPress={() => setSelectedBetType(option)}
                  >
                    <View style={styles.betTypeContent}>
                      <Text
                        style={[
                          styles.betTypeName,
                          selectedBetType?.id === option.id && styles.betTypeNameSelected,
                        ]}
                      >
                        {option.name}
                      </Text>
                      <Text style={styles.betTypeDesc}>{option.description}</Text>
                    </View>
                    {selectedBetType?.id === option.id && (
                      <View style={styles.betTypeCheck}>
                        <Text style={styles.betTypeCheckText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                ))}

                {selectedBetType?.id === "custom" && (
                  <TextInput
                    value={betName}
                    onChangeText={setBetName}
                    placeholder="Bet name (e.g. Side action on the 9th hole)"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, { marginTop: 12 }]}
                    autoCapitalize="sentences"
                  />
                )}

                {selectedBetType && (
                  <TextInput
                    value={termsText}
                    onChangeText={setTermsText}
                    placeholder={
                      selectedSport
                        ? getTermsPlaceholder(selectedSport.id, selectedBetType.id)
                        : "Describe the wager terms..."
                    }
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, styles.inputMultiline]}
                    multiline
                    numberOfLines={4}
                    autoCapitalize="sentences"
                  />
                )}
              </View>
            )}

            {/* Step 3: Amount, Opponent, Group */}
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
                <View style={styles.atRow}>
                  <Text style={styles.atPrefix}>@</Text>
                  <TextInput
                    value={opponent}
                    onChangeText={setOpponent}
                    placeholder="username"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, styles.opponentInput]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.stepLabel}>Group (optional)</Text>
                {!showGroupPicker ? (
                  <Pressable
                    style={styles.groupPickerBtn}
                    onPress={() => setShowGroupPicker(true)}
                  >
                    {selectedGroup ? (
                      <View style={styles.groupPickerSelected}>
                        <View
                          style={[
                            styles.groupDot,
                            { backgroundColor: selectedGroup.avatarColor },
                          ]}
                        />
                        <Text style={styles.groupPickerText}>{selectedGroup.name}</Text>
                      </View>
                    ) : (
                      <Text style={styles.groupPickerPlaceholder}>Add to group...</Text>
                    )}
                    <Text style={styles.groupPickerArrow}>›</Text>
                  </Pressable>
                ) : (
                  <View style={styles.groupList}>
                    <Pressable
                      style={[
                        styles.groupListItem,
                        selectedGroupId === null && styles.groupListItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedGroupId(null);
                        setShowGroupPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.groupListItemText,
                          selectedGroupId === null && styles.groupListItemTextSelected,
                        ]}
                      >
                        None
                      </Text>
                    </Pressable>
                    {groups.map((g) => (
                      <Pressable
                        key={g.id}
                        style={[
                          styles.groupListItem,
                          selectedGroupId === g.id && styles.groupListItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedGroupId(g.id);
                          setShowGroupPicker(false);
                        }}
                      >
                        <View style={[styles.groupDot, { backgroundColor: g.avatarColor }]} />
                        <Text
                          style={[
                            styles.groupListItemText,
                            selectedGroupId === g.id && styles.groupListItemTextSelected,
                          ]}
                        >
                          {g.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Step 4: Review + Payment + Share */}
            {step === 4 && selectedSport && selectedBetType && (
              <View>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Sport</Text>
                    <Text style={styles.reviewValue}>
                      {selectedSport.icon} {selectedSport.name}
                    </Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Bet Type</Text>
                    <Text style={styles.reviewValue}>{selectedBetType.name}</Text>
                  </View>
                  {selectedBetType.id === "custom" && betName.trim().length > 0 && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Bet Name</Text>
                        <Text style={styles.reviewValue}>{betName.trim()}</Text>
                      </View>
                    </>
                  )}
                  {termsText.trim().length > 0 && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Terms</Text>
                        <Text style={[styles.reviewValue, styles.reviewValueSmall]}>
                          {termsText.trim()}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={styles.detailDivider} />
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Your stake</Text>
                    <Text style={[styles.reviewValue, styles.reviewValueAccent]}>
                      ${parseFloat(amount || "0").toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Vs</Text>
                    <Text style={styles.reviewValue}>
                      {opponent.startsWith("@") ? opponent : `@${opponent}`}
                    </Text>
                  </View>
                  {selectedGroup && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Group</Text>
                        <View style={styles.reviewGroupValue}>
                          <View
                            style={[
                              styles.groupDot,
                              { backgroundColor: selectedGroup.avatarColor },
                            ]}
                          />
                          <Text style={styles.reviewValue}>{selectedGroup.name}</Text>
                        </View>
                      </View>
                    </>
                  )}
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
                        numberOfLines={1}
                      >
                        {m.id}
                      </Text>
                      {m.hint ? (
                        <Text style={styles.paymentChipHint}>{m.hint}</Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
                {paymentMethod !== "Other" && (
                  <TextInput
                    value={paymentHandle}
                    onChangeText={setPaymentHandle}
                    placeholder={getPaymentHandlePlaceholder(paymentMethod)}
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
                <Text style={styles.paymentHint}>
                  The loser pays the winner directly — no money passes through Ratpac.
                </Text>

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

          {/* Navigation */}
          <View style={styles.navRow}>
            {step > 1 && (
              <Pressable
                style={styles.backBtn}
                onPress={() => setStep((s) => (s - 1) as Step)}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            )}

            {step < 4 && (
              <Pressable
                style={[
                  styles.nextBtn,
                  step === 1 && !canAdvanceStep1 && styles.nextBtnDisabled,
                  step === 2 && !canAdvanceStep2 && styles.nextBtnDisabled,
                  step === 3 && !canAdvanceStep3 && styles.nextBtnDisabled,
                ]}
                onPress={() => setStep((s) => (s + 1) as Step)}
                disabled={
                  (step === 1 && !canAdvanceStep1) ||
                  (step === 2 && !canAdvanceStep2) ||
                  (step === 3 && !canAdvanceStep3)
                }
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </Pressable>
            )}

            {step === 4 && (
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
    maxHeight: "92%",
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
  // Step 1 — Sport grid
  sportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  sportItem: {
    width: "30%",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  sportItemSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}15`,
  },
  sportIcon: {
    fontSize: 28,
  },
  sportName: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  sportNameSelected: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  // Step 2 — Bet type list
  betTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  betTypeRowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}10`,
  },
  betTypeContent: {
    flex: 1,
    gap: 3,
  },
  betTypeName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  betTypeNameSelected: {
    color: theme.colors.accent,
  },
  betTypeDesc: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  betTypeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  betTypeCheckText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 13,
  },
  // Shared inputs
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
  // Step 3 — Amount & Opponent
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  currencyPrefix: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    marginRight: 6,
    marginTop: -2,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginBottom: 0,
  },
  atRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  atPrefix: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginRight: 4,
    marginTop: -2,
  },
  opponentInput: {
    flex: 1,
    marginBottom: 0,
  },
  groupPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
  },
  groupPickerSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupPickerText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  groupPickerPlaceholder: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  groupPickerArrow: {
    color: theme.colors.textMuted,
    fontSize: 18,
  },
  groupList: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
  },
  groupListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupListItemSelected: {
    backgroundColor: `${theme.colors.accent}15`,
  },
  groupListItemText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  groupListItemTextSelected: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Step 4 — Review
  reviewCard: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
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
  reviewGroupValue: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  detailDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  paymentChip: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 3,
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
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  paymentChipTextSelected: {
    color: theme.colors.accent,
  },
  paymentChipHint: {
    fontSize: 9,
    color: theme.colors.textMuted,
  },
  paymentHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
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
  // Nav
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
