import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

export default function EditProfileScreen({ navigation }: { navigation: any }) {
  const user = useAppStore((s) => s.user);
  const updateUserProfile = useAppStore((s) => s.updateUserProfile);

  const [handle, setHandle] = useState(user.handle.replace(/^@/, ""));
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const trimmedHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const trimmedName = displayName.trim();

    if (trimmedHandle.length < 2) {
      Alert.alert("Invalid handle", "Handle must be at least 2 characters.");
      return;
    }
    if (trimmedName.length < 1) {
      Alert.alert("Invalid name", "Display name can't be empty.");
      return;
    }

    setSaving(true);
    const result = await updateUserProfile(trimmedHandle, trimmedName);
    setSaving(false);

    if (result.ok) {
      navigation.goBack();
    } else {
      Alert.alert("Update failed", result.message);
    }
  }

  const hasChanges =
    handle.trim() !== user.handle.replace(/^@/, "") ||
    displayName.trim() !== user.displayName;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#001B10" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={40}
            autoCorrect={false}
          />
          <Text style={styles.fieldHint}>Shown on your profile and wager cards.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Handle</Text>
          <View style={styles.handleRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={[styles.input, styles.handleInput]}
              value={handle}
              onChangeText={(t) => setHandle(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yourhandle"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
          </View>
          <Text style={styles.fieldHint}>Lowercase letters, numbers, and underscores only.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  saveBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: "#001B10",
    fontWeight: "700",
    fontSize: 14,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  section: {
    marginBottom: 24,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingLeft: 14,
  },
  atSign: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: "500",
  },
  handleInput: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingLeft: 2,
  },
  fieldHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
});
