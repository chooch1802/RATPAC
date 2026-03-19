import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { theme } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The value encoded in the QR code — a deep link or URL */
  qrValue: string;
  /** Large title e.g. "Golf Boys" or "Wager Challenge" */
  title: string;
  /** Sub-line e.g. "Scan to join the group" */
  subtitle: string;
  /** Short code shown as fallback e.g. "KGTKNK" */
  code?: string;
  /** Label for the code e.g. "Group code" */
  codeLabel?: string;
  /** Text passed to the system share sheet */
  shareMessage?: string;
};

export function QRShareModal({
  visible,
  onClose,
  qrValue,
  title,
  subtitle,
  code,
  codeLabel = "Code",
  shareMessage,
}: Props) {
  async function handleShare() {
    const msg = shareMessage ?? `Join me on Ratpac! ${qrValue}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // user cancelled share sheet
    }
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* QR Code */}
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrValue || "ratpac://"}
              size={200}
              backgroundColor="#FFFFFF"
              color="#000000"
              quietZone={16}
            />
          </View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Divider + Code fallback */}
          {code && (
            <>
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>
              <Text style={styles.codeLabel}>{codeLabel}</Text>
              <Text style={styles.code}>{code}</Text>
            </>
          )}

          {/* Actions */}
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share invite</Text>
          </Pressable>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    gap: 10,
  },
  qrWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginVertical: 4,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  orText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  codeLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  code: {
    color: theme.colors.accent,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 6,
    fontVariant: ["tabular-nums"],
  },
  shareBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  shareBtnText: {
    color: "#001B10",
    fontWeight: "800",
    fontSize: 15,
  },
  closeBtn: {
    paddingVertical: 10,
    alignItems: "center",
    width: "100%",
  },
  closeBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
});
