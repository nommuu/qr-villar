import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "@/components/AppButton";
import { COLORS } from "@/constants/colors";
import { signOut, useAuth } from "@/lib/auth";
import { getProfile, updateProfile, type Profile } from "@/lib/profiles";

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setFetchingProfile(false);
      return;
    }

    setFetchingProfile(true);

    try {
      const p = await getProfile(user.id);
      setProfile(p);
      setDraftName(p?.full_name ?? "");
    } catch {
      Alert.alert("Error", "Unable to load your profile. Please try again.");
    } finally {
      setFetchingProfile(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: trimmedName,
      });

      if (error) {
        Alert.alert("Unable to save", error);
        return;
      }

      setProfile((prev) => (prev ? { ...prev, full_name: trimmedName } : prev));
      setDraftName(trimmedName);
      setEditing(false);
    } catch {
      Alert.alert("Error", "Something went wrong while saving your name.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftName(profile?.full_name ?? "");
    setEditing(false);
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to sign out.";

      Alert.alert("Sign Out Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const role = profile?.role ?? "student";

  const roleLabel =
    role === "admin"
      ? "Administrator"
      : role === "teacher"
        ? "Teacher"
        : "Student";

  const initials = (profile?.full_name || user?.email || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Profile</Text>
          <Text style={styles.pageSubtitle}>
            Manage your account and personal information.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {fetchingProfile ? (
              <ActivityIndicator color={COLORS.primary} size="large" />
            ) : (
              <Text style={styles.avatarText}>{initials || "U"}</Text>
            )}
          </View>

          <Text style={styles.profileName}>
            {fetchingProfile
              ? "Loading profile..."
              : profile?.full_name || "Welcome to QR-ATT"}
          </Text>

          <Text style={styles.profileEmail}>
            {user?.email || "No email available"}
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name={
                role === "admin"
                  ? "shield-checkmark"
                  : role === "teacher"
                    ? "school"
                    : "person"
              }
              size={15}
              color={COLORS.primary}
            />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionDescription}>
            Your account details registered in QR-ATT.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>

              {editing ? (
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.nameInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!saving}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  accessibilityLabel="Full name"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile?.full_name || "Not provided"}
                </Text>
              )}
            </View>

            {!editing && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit full name"
                onPress={() => {
                  setDraftName(profile?.full_name ?? "");
                  setEditing(true);
                }}
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={19}
                  color={COLORS.primary}
                />
              </Pressable>
            )}
          </View>

          {editing && (
            <View style={styles.editActions}>
              <Pressable
                onPress={handleCancelEdit}
                disabled={saving}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveName}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                  saving && styles.disabledButton,
                ]}
              >
                {saving ? (
                  <ActivityIndicator
                    color={COLORS.textOnPrimary}
                    size="small"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark"
                      size={17}
                      color={COLORS.textOnPrimary}
                    />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={21} color={COLORS.primary} />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>
                {user?.email || "Not available"}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Role</Text>
              <Text style={styles.infoValue}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.accountNote}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.primary}
          />
          <Text style={styles.accountNoteText}>
            Your account email and role are managed by the QR-ATT system.
            Contact your administrator if you need assistance with your account
            access.
          </Text>
        </View>

        <View style={styles.signOutSection}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <Text style={styles.sectionDescription}>
            Sign out when you are finished using the app.
          </Text>

          <View style={styles.signOutButton}>
            <AppButton
              title={loading ? "Signing Out..." : "Sign Out"}
              icon="log-out-outline"
              onPress={handleSignOut}
              disabled={loading}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
          <Text style={styles.footerText}>
            QR-ATT · Smart School Event Attendance
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  pageHeader: {
    marginBottom: 22,
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 28,
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 3,
    borderColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  avatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.primary,
  },

  profileName: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 7,
  },

  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 15,
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },

  roleBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 18,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 12,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
    minWidth: 0,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 5,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  nameInput: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: 14,
  },

  editButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
  },

  cancelButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    fontSize: 12,
  },

  saveButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: "700",
    fontSize: 12,
  },

  disabledButton: {
    opacity: 0.65,
  },

  pressed: {
    opacity: 0.78,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  accountNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    padding: 15,
    marginBottom: 28,
  },

  accountNoteText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },

  signOutSection: {
    marginBottom: 8,
  },

  signOutButton: {
    marginTop: 16,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
  },

  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
