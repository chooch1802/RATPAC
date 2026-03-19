import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { redeemReferralCode } from "../services/auth";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

const INTRO_SLIDES = [
  {
    icon: "⚡",
    title: "Challenge Anyone",
    body: "Create a wager with friends for your rounds, matches and games.",
  },
  {
    icon: "🏆",
    title: "Track Your Record",
    body: "Every win and loss on your public profile. Your reputation is on the line.",
  },
  {
    icon: "💸",
    title: "No Middleman",
    body: "Ratpac never touches your money. Losers pay winners directly.",
  },
];

function calculateAge(day: number, month: number, year: number): number {
  const today = new Date();
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function OnboardingScreen() {
  const [showIntro, setShowIntro] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);

  const draft = useAppStore((s) => s.onboardingDraft);
  const setDraftHandle = useAppStore((s) => s.setDraftHandle);
  const setDraftPrivacy = useAppStore((s) => s.setDraftPrivacy);
  const setDraftDob = useAppStore((s) => s.setDraftDob);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  // DOB fields
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // Referral
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "ok" | "error">("idle");
  const [referralMessage, setReferralMessage] = useState("");

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Age check
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  const dobComplete = day.length === 2 && month.length === 2 && year.length === 4
    && dayNum >= 1 && dayNum <= 31
    && monthNum >= 1 && monthNum <= 12
    && yearNum >= 1900;
  const age = dobComplete ? calculateAge(dayNum, monthNum, yearNum) : null;
  const isUnderAge = age !== null && age < 18;
  const isAgeVerified = age !== null && age >= 18;

  const canContinue =
    isAgeVerified &&
    draft.handle.trim().length >= 2 &&
    termsAccepted;

  function onDayChange(t: string) {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setDay(v);
    if (v.length === 2) monthRef.current?.focus();
  }

  function onMonthChange(t: string) {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setMonth(v);
    if (v.length === 2) yearRef.current?.focus();
  }

  function onYearChange(t: string) {
    const v = t.replace(/\D/g, "").slice(0, 4);
    setYear(v);
    if (v.length === 4 && dobComplete) {
      const iso = `${v}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      setDraftDob(iso);
    }
  }

  async function onContinue() {
    if (!canContinue) return;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    setDraftDob(iso);

    if (referralCode.trim().length > 0 && referralStatus !== "ok") {
      const result = await redeemReferralCode(referralCode);
      setReferralStatus(result.ok ? "ok" : "error");
      setReferralMessage(result.message);
      if (!result.ok) return;
    }
    completeOnboarding();
  }

  if (showIntro) {
    const slide = INTRO_SLIDES[slideIndex];
    const isLast = slideIndex === INTRO_SLIDES.length - 1;
    return (
      <SafeAreaView style={styles.container}>
        <View style={introStyles.wrap}>
          <Image
            source={require("../../assets/ratpac-logo.png")}
            style={introStyles.logo}
            resizeMode="contain"
          />
          <Text style={introStyles.slideIcon}>{slide.icon}</Text>
          <Text style={introStyles.slideTitle}>{slide.title}</Text>
          <Text style={introStyles.slideBody}>{slide.body}</Text>
          <View style={introStyles.dots}>
            {INTRO_SLIDES.map((_, i) => (
              <View
                key={i}
                style={[introStyles.dot, i === slideIndex && introStyles.dotActive]}
              />
            ))}
          </View>
          <Pressable
            style={introStyles.btn}
            onPress={() => {
              if (isLast) {
                setShowIntro(false);
              } else {
                setSlideIndex((n) => n + 1);
              }
            }}
          >
            <Text style={introStyles.btnText}>{isLast ? "Get Started" : "Next"}</Text>
          </Pressable>
          {!isLast && (
            <Pressable onPress={() => setShowIntro(false)}>
              <Text style={introStyles.skip}>Skip</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require("../../assets/ratpac-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.stepText}>Set up your profile</Text>
          </View>

          {/* Step 1: Age verification */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>Age verification</Text>
            </View>
            <Text style={styles.sectionDesc}>
              You must be 18 or older to use Ratpac. Enter your date of birth.
            </Text>
            <View style={styles.dobRow}>
              <View style={styles.dobField}>
                <Text style={styles.dobLabel}>Day</Text>
                <TextInput
                  value={day}
                  onChangeText={onDayChange}
                  placeholder="DD"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.dobInput, isUnderAge && styles.dobInputError]}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.dobField}>
                <Text style={styles.dobLabel}>Month</Text>
                <TextInput
                  ref={monthRef}
                  value={month}
                  onChangeText={onMonthChange}
                  placeholder="MM"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.dobInput, isUnderAge && styles.dobInputError]}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={[styles.dobField, styles.dobFieldYear]}>
                <Text style={styles.dobLabel}>Year</Text>
                <TextInput
                  ref={yearRef}
                  value={year}
                  onChangeText={onYearChange}
                  placeholder="YYYY"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.dobInput, isUnderAge && styles.dobInputError]}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>

            {isUnderAge && (
              <View style={styles.blockedBanner}>
                <Ionicons name="ban-outline" size={16} color="#FF4444" />
                <Text style={styles.blockedText}>
                  You must be 18 or older to use Ratpac.
                </Text>
              </View>
            )}
            {isAgeVerified && (
              <View style={styles.verifiedBanner}>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.verifiedText}>Age verified</Text>
              </View>
            )}
          </View>

          {/* Step 2: Handle */}
          <View style={[styles.section, !isAgeVerified && styles.sectionLocked]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, !isAgeVerified && styles.stepBadgeLocked]}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>Choose your handle</Text>
            </View>
            <Text style={styles.sectionDesc}>
              This is your unique @username on Ratpac. You can't change it later.
            </Text>
            <View style={styles.handleInputRow}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                value={draft.handle.startsWith("@") ? draft.handle.slice(1) : draft.handle}
                onChangeText={(t) => setDraftHandle(t.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                placeholder="yourhandle"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.handleInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                editable={isAgeVerified}
              />
            </View>
            {draft.handle.trim().length > 0 && (
              <Text style={styles.handlePreview}>
                Your profile will be @
                {draft.handle.startsWith("@") ? draft.handle.slice(1) : draft.handle}
              </Text>
            )}
          </View>

          {/* Step 3: Privacy */}
          <View style={[styles.section, !isAgeVerified && styles.sectionLocked]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, !isAgeVerified && styles.stepBadgeLocked]}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Account privacy</Text>
            </View>
            <View style={styles.privacyRow}>
              <Pressable
                style={[styles.privacyOption, !draft.isPrivate && styles.privacyOptionSelected]}
                onPress={() => isAgeVerified && setDraftPrivacy(false)}
              >
                <Ionicons name="earth-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={[styles.privacyOptionTitle, !draft.isPrivate && styles.privacyOptionTitleSelected]}>
                  Public
                </Text>
                <Text style={styles.privacyOptionDesc}>
                  Anyone can follow and see your wagers
                </Text>
              </Pressable>
              <Pressable
                style={[styles.privacyOption, draft.isPrivate && styles.privacyOptionSelected]}
                onPress={() => isAgeVerified && setDraftPrivacy(true)}
              >
                <Ionicons name="lock-closed-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={[styles.privacyOptionTitle, draft.isPrivate && styles.privacyOptionTitleSelected]}>
                  Private
                </Text>
                <Text style={styles.privacyOptionDesc}>
                  Only approved followers see your activity
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Step 4: Invite code */}
          <View style={[styles.section, !isAgeVerified && styles.sectionLocked]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, !isAgeVerified && styles.stepBadgeLocked]}>
                <Text style={styles.stepBadgeText}>4</Text>
              </View>
              <Text style={styles.sectionTitle}>Invite code</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Have a code from a friend or creator? Enter it below (optional).
            </Text>
            <TextInput
              value={referralCode}
              onChangeText={(t) => {
                setReferralCode(t.toUpperCase());
                setReferralStatus("idle");
              }}
              placeholder="e.g. JAKE10"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.codeInput,
                referralStatus === "ok" && styles.codeInputValid,
                referralStatus === "error" && styles.codeInputError,
              ]}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              editable={isAgeVerified}
            />
            {referralStatus === "ok" && (
              <Text style={styles.codeStatusOk}>{referralMessage}</Text>
            )}
            {referralStatus === "error" && (
              <Text style={styles.codeStatusError}>Invalid code — check and try again.</Text>
            )}
          </View>

          {/* Terms */}
          <Pressable
            style={styles.termsRow}
            onPress={() => isAgeVerified && setTermsAccepted(!termsAccepted)}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I confirm I am 18 or older and agree to the{" "}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL("https://chooch1802.github.io/RATPAC/docs/terms.html")}
              >
                Terms of Service
              </Text>
              {" "}and{" "}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL("https://chooch1802.github.io/RATPAC/docs/privacy-policy.html")}
              >
                Privacy Policy
              </Text>
              . Ratpac does not hold funds — all payments are peer-to-peer.
            </Text>
          </Pressable>

          {/* CTA */}
          <Pressable
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text style={styles.continueBtnText}>Let's go</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  logoImage: {
    width: 160,
    height: 40,
    marginBottom: 4,
  },
  stepText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  section: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionLocked: {
    opacity: 0.45,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeLocked: {
    backgroundColor: theme.colors.border,
  },
  stepBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  sectionDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  // DOB
  dobRow: {
    flexDirection: "row",
    gap: 10,
  },
  dobField: {
    flex: 1,
  },
  dobFieldYear: {
    flex: 1.6,
  },
  dobLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dobInput: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  dobInputError: {
    borderColor: "#FF4444",
  },
  blockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF444420",
    borderWidth: 1,
    borderColor: "#FF444450",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  blockedText: {
    color: "#FF4444",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  verifiedText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  // Handle
  handleInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  atSign: {
    color: theme.colors.accent,
    fontWeight: "700",
    fontSize: 18,
  },
  handleInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  handlePreview: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  // Privacy
  privacyRow: {
    flexDirection: "row",
    gap: 10,
  },
  privacyOption: {
    flex: 1,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  privacyOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}15`,
  },
  privacyOptionTitle: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
  },
  privacyOptionTitleSelected: {
    color: theme.colors.accent,
  },
  privacyOptionDesc: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  // Invite code
  codeInput: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
  },
  codeInputValid: {
    borderColor: theme.colors.accent,
  },
  codeInputError: {
    borderColor: "#FF4444",
  },
  codeStatusOk: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  codeStatusError: {
    color: "#FF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  // Terms
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  termsText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
  // CTA
  continueBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});

const introStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: theme.colors.bgPrimary,
  },
  logo: {
    width: 140,
    height: 35,
    marginBottom: 24,
  },
  slideIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  slideTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  slideBody: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
    width: 24,
  },
  btn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  btnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 16,
  },
  skip: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 8,
  },
});
