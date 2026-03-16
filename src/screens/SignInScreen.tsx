import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isSupabaseConfigured } from "../lib/supabase";
import { sendPhoneOtp, signInWithOAuth, verifyPhoneOtp } from "../services/auth";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

export default function SignInScreen() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<"" | "apple" | "google">("");
  const [statusMessage, setStatusMessage] = useState("");

  async function onSendOtp() {
    const normalized = phone.trim();
    if (!normalized.startsWith("+")) {
      setStatusMessage("Enter your number in E.164 format, e.g. +16505551234");
      return;
    }
    setIsSending(true);
    const res = await sendPhoneOtp(normalized);
    setStatusMessage(res.message);
    setOtpSent(res.ok);
    setIsSending(false);
  }

  async function onVerifyOtp() {
    setIsVerifying(true);
    const res = await verifyPhoneOtp(phone.trim(), code.trim());
    setStatusMessage(res.message);
    if (res.ok) setAuth(true);
    setIsVerifying(false);
  }

  async function onOAuth(provider: "apple" | "google") {
    setIsOAuthLoading(provider);
    const res = await signInWithOAuth(provider);
    setStatusMessage(res.message);
    if (res.ok) setAuth(true);
    setIsOAuthLoading("");
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require("../../assets/ratpac-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Bet on your people</Text>
          </View>

          {/* Auth card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>

            {/* Phone OTP */}
            <Text style={styles.inputLabel}>Phone number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 650 555 1234"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
              style={styles.input}
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.primaryBtn, isSending && styles.disabledBtn]}
              onPress={onSendOtp}
              disabled={isSending}
            >
              <Text style={styles.primaryBtnText}>
                {isSending ? "Sending..." : "Send code"}
              </Text>
            </Pressable>

            {otpSent && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                  Enter 6-digit code
                </Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="• • • • • •"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, styles.codeInput]}
                  autoCapitalize="none"
                  maxLength={6}
                />
                <Pressable
                  style={[styles.primaryBtn, isVerifying && styles.disabledBtn]}
                  onPress={onVerifyOtp}
                  disabled={isVerifying}
                >
                  <Text style={styles.primaryBtnText}>
                    {isVerifying ? "Verifying..." : "Verify & Sign In"}
                  </Text>
                </Pressable>
              </>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Apple */}
            <Pressable
              style={styles.socialBtn}
              onPress={() => onOAuth("apple")}
              disabled={isOAuthLoading.length > 0}
            >
              <Text style={styles.socialBtnIcon}>🍎</Text>
              <Text style={styles.socialBtnText}>
                {isOAuthLoading === "apple" ? "Connecting..." : "Continue with Apple"}
              </Text>
            </Pressable>

            {/* Google */}
            <Pressable
              style={styles.socialBtn}
              onPress={() => onOAuth("google")}
              disabled={isOAuthLoading.length > 0}
            >
              <Text style={styles.socialBtnIcon}>G</Text>
              <Text style={styles.socialBtnText}>
                {isOAuthLoading === "google" ? "Connecting..." : "Continue with Google"}
              </Text>
            </Pressable>

            {statusMessage.length > 0 && (
              <Text style={styles.statusMsg}>{statusMessage}</Text>
            )}
          </View>

          {/* Demo / skip */}
          {!isSupabaseConfigured && (
            <Pressable style={styles.demoBtn} onPress={() => setAuth(true)}>
              <Text style={styles.demoBtnText}>Continue in demo mode</Text>
            </Pressable>
          )}

          <Text style={styles.legalText}>
            By continuing you agree to our Terms of Service and Privacy Policy.
            Must be 18+ to use Ratpac.
          </Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 220,
    height: 160,
    marginBottom: 8,
  },
  logoDivider: {
    width: 120,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
    marginTop: 4,
  },
  tagline: {
    color: theme.colors.textMuted,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 12,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
  },
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  socialBtnIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  socialBtnText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 15,
  },
  statusMsg: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  demoBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  demoBtnText: {
    color: theme.colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  legalText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
