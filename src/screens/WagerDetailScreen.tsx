import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchWagerById } from "../services/wagers";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import { PaymentMethod, Wager, WagerStatus } from "../types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const PAYMENT_CONFIG: Record<
  PaymentMethod,
  { icon: string; url: (amount: number, handle?: string) => string }
> = {
  Venmo: {
    icon: "💙",
    url: (a, h) =>
      h
        ? `venmo://paycharge?txn=pay&recipients=${h.replace("@", "")}&amount=${a}&note=Ratpac+Wager`
        : `venmo://paycharge?txn=pay&amount=${a}&note=Ratpac+Wager`,
  },
  "Cash App": {
    icon: "💚",
    url: (a, h) =>
      h ? `https://cash.app/${h.startsWith("$") ? h : `$${h}`}/${a}` : `cashapp://`,
  },
  PayPal: {
    icon: "🔵",
    url: (a, h) =>
      h ? `https://paypal.me/${h.replace("paypal.me/", "")}/${a}` : `paypal://`,
  },
  Other: { icon: "💸", url: () => `` },
};

const STATUS_CONFIG: Record<WagerStatus, { label: string; color: string; desc: string }> = {
  PENDING: {
    label: "Pending",
    color: theme.colors.pending,
    desc: "Waiting for your opponent to accept the challenge.",
  },
  ACTIVE: {
    label: "Active",
    color: theme.colors.accent,
    desc: "Wager accepted — let the games begin. Good luck!",
  },
  AWAITING_RESULT: {
    label: "Awaiting Result",
    color: theme.colors.pending,
    desc: "The event has ended. Mark the result to settle up.",
  },
  DISPUTED: {
    label: "Disputed",
    color: theme.colors.destructive,
    desc: "The result is disputed. Reach out to your opponent to resolve.",
  },
  SETTLED: {
    label: "Settled",
    color: theme.colors.textMuted,
    desc: "Wager settled. Don't forget to pay up!",
  },
  VOIDED: {
    label: "Voided",
    color: theme.colors.textMuted,
    desc: "Wager voided.",
  },
  EXPIRED: {
    label: "Expired",
    color: theme.colors.textMuted,
    desc: "Challenge was not accepted within 48 hours.",
  },
};

export default function WagerDetailScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const wagerId: string = route.params?.wagerId;
  const wagers = useAppStore((s) => s.wagers);
  const upsertWager = useAppStore((s) => s.upsertWager);
  const user = useAppStore((s) => s.user);
  const respondToChallenge = useAppStore((s) => s.respondToChallenge);
  const declareResult = useAppStore((s) => s.declareResult);
  const confirmResult = useAppStore((s) => s.confirmResult);
  const disputeResult = useAppStore((s) => s.disputeResult);

  const [challengeActionLoading, setChallengeActionLoading] = useState<
    "" | "accept" | "decline"
  >("");
  const [resultActionLoading, setResultActionLoading] = useState<
    "" | "won" | "lost" | "confirm" | "dispute"
  >("");
  const [isFetching, setIsFetching] = useState(false);

  const storeWager = wagers.find((w) => w.id === wagerId);

  // Fetch from backend if not in local store (e.g. navigated from a push notification)
  useEffect(() => {
    if (!storeWager && wagerId) {
      setIsFetching(true);
      fetchWagerById(wagerId).then((fetched) => {
        if (fetched) upsertWager(fetched);
        setIsFetching(false);
      });
    }
  }, [wagerId, storeWager]);

  const wager = storeWager ?? null;

  if (isFetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!wager) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Wager not found.</Text>
      </SafeAreaView>
    );
  }

  const config = STATUS_CONFIG[wager.status] ?? STATUS_CONFIG.PENDING;
  const isWin = wager.status === "SETTLED" && wager.winnerHandle === user.handle;
  const isLoss = wager.status === "SETTLED" && wager.winnerHandle != null && wager.winnerHandle !== user.handle;
  const isChallengeToMe =
    wager.status === "PENDING" && wager.opponentHandle === user.handle;
  const isPendingOutgoing =
    wager.status === "PENDING" && wager.opponentHandle !== user.handle;

  // Two-step settlement helpers
  const isAwaitingResult = wager.status === "AWAITING_RESULT";
  const iDeclared = isAwaitingResult && wager.declarerHandle === user.handle;
  const opponentShouldConfirm = isAwaitingResult && !iDeclared;
  const declaredWinnerName =
    wager.winnerHandle === user.handle
      ? "you"
      : wager.opponentDisplayName ?? wager.opponentHandle;

  const statusDescription = isChallengeToMe
    ? "This challenge is waiting on your response."
    : isPendingOutgoing
    ? "Waiting for your opponent to accept the challenge."
    : iDeclared
    ? `You declared ${declaredWinnerName} the winner. Waiting for confirmation.`
    : opponentShouldConfirm
    ? `${wager.declarerHandle ?? "Your opponent"} declared ${declaredWinnerName} the winner. Confirm or dispute.`
    : config.desc;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Wager Detail</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Result banner */}
        {(isWin || isLoss) && (
          <View style={[styles.resultBanner, isWin ? styles.resultBannerWin : styles.resultBannerLoss]}>
            <Text style={styles.resultBannerText}>
              {isWin ? "You won this wager" : "You lost this wager"}
            </Text>
          </View>
        )}

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={[styles.amountValue, { color: config.color }]}>
            ${wager.amount.toFixed(2)}
          </Text>
          <Text style={styles.amountLabel}>Wager amount</Text>
        </View>

        {/* VS Row */}
        <View style={styles.vsCard}>
          <View style={styles.vsSide}>
            <View style={styles.vsAvatar}>
              <Text style={styles.vsAvatarText}>
                {user.handle.replace("@", "")[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <Text style={styles.vsName}>{user.displayName}</Text>
            <Text style={styles.vsHandle}>{user.handle}</Text>
          </View>
          <Text style={styles.vsLabel}>VS</Text>
          <View style={styles.vsSide}>
            <View style={[styles.vsAvatar, styles.vsAvatarOpp]}>
              <Text style={styles.vsAvatarText}>
                {wager.opponentHandle.replace("@", "")[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <Text style={styles.vsName}>
              {wager.opponentDisplayName ?? wager.opponentHandle}
            </Text>
            <Text style={styles.vsHandle}>{wager.opponentHandle}</Text>
          </View>
        </View>

        {/* Status card */}
        <View style={[styles.statusCard, { borderColor: `${config.color}50` }]}>
          <View style={[styles.statusBadge, { borderColor: config.color, backgroundColor: `${config.color}1A` }]}>
            <Text style={[styles.statusBadgeText, { color: config.color }]}>
              {config.label.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.statusDesc}>{statusDescription}</Text>
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Activity</Text>
            <Text style={styles.detailValue}>{wager.activity}</Text>
          </View>
          {wager.termsText && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Terms</Text>
                <Text style={[styles.detailValue, styles.detailValueWrap]}>{wager.termsText}</Text>
              </View>
            </>
          )}
          {wager.paymentMethod && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Settle via</Text>
                <Text style={styles.detailValue}>
                  {PAYMENT_CONFIG[wager.paymentMethod]?.icon} {wager.paymentMethod}
                </Text>
              </View>
            </>
          )}
          {wager.createdAt && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{timeAgo(wager.createdAt)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Accept / decline an incoming challenge */}
        {isChallengeToMe && (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Challenge Response</Text>
            <Pressable
              style={[styles.confirmBtn, challengeActionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={challengeActionLoading.length > 0}
              onPress={async () => {
                setChallengeActionLoading("accept");
                await respondToChallenge(wager.id, "accept");
                setChallengeActionLoading("");
              }}
            >
              <Text style={styles.confirmBtnText}>
                {challengeActionLoading === "accept" ? "Accepting…" : "Accept Challenge"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.disputeBtn, challengeActionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={challengeActionLoading.length > 0}
              onPress={async () => {
                setChallengeActionLoading("decline");
                await respondToChallenge(wager.id, "decline");
                setChallengeActionLoading("");
              }}
            >
              <Text style={styles.disputeBtnText}>
                {challengeActionLoading === "decline" ? "Declining…" : "Decline"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step 1: Declare result for active wagers */}
        {wager.status === "ACTIVE" && (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Declare Result</Text>
            <Text style={styles.actionsSubtitle}>
              Your opponent will be notified and asked to confirm.
            </Text>
            <Pressable
              style={[styles.confirmBtn, resultActionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={resultActionLoading.length > 0}
              onPress={async () => {
                setResultActionLoading("won");
                await declareResult(wager.id, user.handle);
                setResultActionLoading("");
              }}
            >
              <Text style={styles.confirmBtnText}>
                {resultActionLoading === "won" ? "Declaring…" : "I Won"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.disputeBtn, resultActionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={resultActionLoading.length > 0}
              onPress={async () => {
                setResultActionLoading("lost");
                await declareResult(wager.id, wager.opponentHandle);
                setResultActionLoading("");
              }}
            >
              <Text style={styles.disputeBtnText}>
                {resultActionLoading === "lost" ? "Declaring…" : "I Lost"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Confirm or dispute a declared result */}
        {opponentShouldConfirm && (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Confirm Result</Text>
            <Text style={styles.actionsSubtitle}>
              {wager.declarerHandle ?? "Your opponent"} declared {declaredWinnerName} the winner.
              Do you agree?
            </Text>
            <Pressable
              style={[styles.confirmBtn, resultActionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={resultActionLoading.length > 0}
              onPress={async () => {
                setResultActionLoading("confirm");
                await confirmResult(wager.id);
                setResultActionLoading("");
              }}
            >
              <Text style={styles.confirmBtnText}>
                {resultActionLoading === "confirm" ? "Confirming…" : "Confirm — That's Right"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.disputeBtn, resultActionLoading.length > 0 && styles.actionBtnDisabled]}
              disabled={resultActionLoading.length > 0}
              onPress={async () => {
                setResultActionLoading("dispute");
                await disputeResult(wager.id);
                setResultActionLoading("");
              }}
            >
              <Text style={styles.disputeBtnText}>
                {resultActionLoading === "dispute" ? "Disputing…" : "Dispute Result"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Waiting state — you declared, pending confirmation */}
        {iDeclared && (
          <View style={[styles.actionsCard, { alignItems: "center" }]}>
            <ActivityIndicator color={theme.colors.accent} style={{ marginBottom: 8 }} />
            <Text style={styles.actionsTitle}>Waiting for Confirmation</Text>
            <Text style={styles.actionsSubtitle}>
              Your opponent has been notified and needs to confirm the result.
            </Text>
          </View>
        )}

        {/* Pay up section */}
        {(wager.status === "SETTLED" || wager.status === "AWAITING_RESULT") && wager.paymentMethod && (
          <View style={styles.payCard}>
            <Text style={styles.actionsTitle}>Settle Up</Text>
            <Text style={styles.paySubtitle}>
              {wager.paymentHandle
                ? `Send $${wager.amount.toFixed(2)} to ${wager.paymentHandle} via ${wager.paymentMethod}`
                : `Send $${wager.amount.toFixed(2)} to the winner via ${wager.paymentMethod}`}
            </Text>
            {wager.paymentMethod !== "Other" ? (
              <Pressable
                style={styles.payBtn}
                onPress={() => {
                  const cfg = PAYMENT_CONFIG[wager.paymentMethod as PaymentMethod];
                  const url = cfg.url(wager.amount, wager.paymentHandle);
                  if (url) Linking.openURL(url);
                }}
              >
                <Text style={styles.payBtnText}>
                  {PAYMENT_CONFIG[wager.paymentMethod as PaymentMethod].icon}{" "}
                  {wager.paymentHandle
                    ? `Pay ${wager.paymentHandle} $${wager.amount.toFixed(2)}`
                    : `Open ${wager.paymentMethod}`}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.payHint}>
                Arrange payment directly with your opponent.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
  },
  notFound: {
    color: theme.colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
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
  resultBanner: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  resultBannerWin: {
    backgroundColor: `${theme.colors.win}20`,
    borderWidth: 1,
    borderColor: `${theme.colors.win}60`,
  },
  resultBannerLoss: {
    backgroundColor: `${theme.colors.loss}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.loss}40`,
  },
  resultBannerText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  amountCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  amountLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  vsCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  vsSide: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  vsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7B5EA7",
    alignItems: "center",
    justifyContent: "center",
  },
  vsAvatarOpp: {
    backgroundColor: "#2980B9",
  },
  vsAvatarText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 20,
  },
  vsName: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  vsHandle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  vsLabel: {
    color: theme.colors.textMuted,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 2,
    paddingHorizontal: 8,
  },
  statusCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusDesc: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  detailDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    flex: 2,
    textAlign: "right",
  },
  detailValueWrap: {
    fontWeight: "400",
    fontSize: 13,
  },
  actionsCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  actionsTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },
  actionsSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  confirmBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 15,
  },
  disputeBtn: {
    backgroundColor: `${theme.colors.destructive}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.destructive}60`,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  disputeBtnText: {
    color: theme.colors.destructive,
    fontWeight: "700",
    fontSize: 15,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  payCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  paySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  payBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  payBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 15,
  },
  payHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
