import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";

export default function EditProfileScreen({ navigation }: { navigation: any }) {
  const user = useAppStore((s) => s.user);
  const updateUserProfile = useAppStore((s) => s.updateUserProfile);
  const updateAvatar = useAppStore((s) => s.updateAvatar);

  const [handle, setHandle] = useState(user.handle.replace(/^@/, ""));
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function onSave() {
    const trimmedHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const trimmedName = displayName.trim();
    const trimmedBio = bio.trim();

    if (trimmedHandle.length < 2) {
      Alert.alert("Invalid handle", "Handle must be at least 2 characters.");
      return;
    }
    if (trimmedName.length < 1) {
      Alert.alert("Invalid name", "Display name can't be empty.");
      return;
    }

    setSaving(true);
    const result = await updateUserProfile(trimmedHandle, trimmedName, trimmedBio || undefined, user.avatarUrl);
    setSaving(false);

    if (result.ok) {
      navigation.goBack();
    } else {
      Alert.alert("Update failed", result.message);
    }
  }

  async function onChangePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to update your profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const localUri = asset.uri;

    setUploadingAvatar(true);
    try {
      let publicUrl = localUri;

      if (supabase) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const ext = localUri.split(".").pop() ?? "jpg";
            const fileName = `${authUser.id}-${Date.now()}.${ext}`;

            const response = await fetch(localUri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();

            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(fileName, arrayBuffer, {
                contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
                upsert: true,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("avatars")
                .getPublicUrl(fileName);
              if (urlData?.publicUrl) {
                publicUrl = urlData.publicUrl;
              }
            }
          }
        } catch {
          // Fall back to local URI on Supabase storage failure
        }
      }

      await updateAvatar(publicUrl);
    } finally {
      setUploadingAvatar(false);
    }
  }

  const hasChanges =
    handle.trim() !== user.handle.replace(/^@/, "") ||
    displayName.trim() !== user.displayName ||
    bio.trim() !== (user.bio ?? "");

  const palette = ["#7B5EA7", "#C0392B", "#2980B9", "#D35400", "#27AE60", "#8E44AD"];
  const handleStr = user.handle;
  const idx = (handleStr.charCodeAt(1) ?? 0) % palette.length;
  const avatarColor = palette[idx];
  const initial = handleStr.replace("@", "")[0]?.toUpperCase() ?? "?";

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
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={[styles.avatarCircle, { width: 88, height: 88, borderRadius: 44 }]}
              />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <Pressable onPress={onChangePhoto} disabled={uploadingAvatar} style={styles.changePhotoBtn}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={styles.changePhotoText}>Change photo</Text>
              )}
            </Pressable>
          </View>

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
            <View style={styles.bioLabelRow}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <Text style={styles.charCount}>{bio.length}/120</Text>
            </View>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, 120))}
              placeholder="Tell people a bit about yourself…"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={120}
              multiline
              autoCorrect
            />
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
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 48,
    gap: 8,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarInitial: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 34,
  },
  changePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  bioLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
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
  bioInput: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 13,
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
