import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "@/components/AppButton";
import Header from "@/components/Header";
import { COLORS } from "@/constants/colors";
import { signIn } from "@/lib/auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await signIn(email.trim(), password);

      if (authError) {
        setError(authError.message);
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <View style={styles.brandIcon}>
                <Ionicons
                  name="qr-code-outline"
                  size={38}
                  color={COLORS.textOnPrimary}
                />
              </View>

              <Header title="QR Attendance" />

              <View style={styles.brandBadge}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.brandBadgeText}>
                  SMART SCHOOL ATTENDANCE
                </Text>
              </View>
            </View>

            <View style={styles.welcomeSection}>
              <Text style={styles.eyebrow}>WELCOME BACK</Text>
              <Text style={styles.title}>Sign in to your account</Text>
              <Text style={styles.subtitle}>
                Manage your school attendance with ease.
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Let's get started</Text>
              <Text style={styles.formSubtitle}>
                Enter your account details below.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email address</Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (error) setError(null);
                    }}
                    placeholder="your.email@school.edu"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    editable={!loading}
                    returnKeyType="next"
                    accessibilityLabel="Email address"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="current-password"
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    accessibilityLabel="Password"
                  />

                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword((current) => !current)}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={21}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={19}
                    color={COLORS.danger}
                  />
                  <Text style={styles.error}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.buttonContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Signing you in...</Text>
                  </View>
                ) : (
                  <AppButton
                    theme="primary"
                    title="Sign In"
                    icon="log-in-outline"
                    onPress={handleLogin}
                  />
                )}
              </View>

              <View style={styles.securityNote}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={COLORS.success}
                />
                <Text style={styles.securityText}>
                  Your account is securely authenticated.
                </Text>
              </View>
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <Link href="/register" asChild>
                <Text style={styles.signupLink}>Create an account</Text>
              </Link>
            </View>

            <Text style={styles.footer}>
              QR-ATT • Smart School Event Attendance
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },

  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  brandIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },

  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },

  brandBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  welcomeSection: {
    marginBottom: 24,
  },

  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 9,
  },

  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textSecondary,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },

  formTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  formSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginBottom: 23,
  },

  fieldGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 9,
  },

  inputWrapper: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  passwordToggle: {
    padding: 5,
    marginLeft: 4,
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.dangerBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },

  error: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 19,
  },

  buttonContainer: {
    marginTop: 6,
  },

  loadingContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
  },

  securityText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },

  signupContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 27,
  },

  signupText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  signupLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 4,
  },

  footer: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 25,
  },
});
