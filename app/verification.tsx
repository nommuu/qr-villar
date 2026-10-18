import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import Header from "@/components/Header";
import { COLORS } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { submitTeacherVerification } from "@/lib/verification";

type RequestStatus = "pending" | "approved" | "rejected";

type VerificationRequest = {
  id: string;
  details: string;
  status: RequestStatus;
  created_at: string;
  admin_notes?: string | null;
};

const ERROR_COLOR = "#DC2626";

export default function Verification() {
  const [details, setDetails] = useState("");
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadVerification = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = session?.user;

      if (!user) {
        setSignedIn(false);
        setRequest(null);
        return;
      }

      setSignedIn(true);

      const { data, error } = await supabase
        .from("teacher_verification_requests")
        .select("id, details, status, created_at, admin_notes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setRequest(data as VerificationRequest | null);
    } catch (error) {
      console.error("LOAD VERIFICATION ERROR:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load your verification status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  const handleSubmit = async () => {
    const trimmedDetails = details.trim();

    if (!trimmedDetails) {
      Alert.alert(
        "Missing Information",
        "Please enter your teacher verification details.",
      );
      return;
    }

    if (!signedIn) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to submit a teacher verification request.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push("/login"),
          },
        ],
      );
      return;
    }

    if (request?.status === "pending") {
      Alert.alert(
        "Request Pending",
        "Your existing request is still awaiting administrator review.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await submitTeacherVerification(trimmedDetails);

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("The request was not returned by the server.");
      }

      setDetails("");
      await loadVerification();

      Alert.alert(
        "Request Submitted",
        "Your teacher verification request has been submitted successfully. Please wait for an administrator to review it.",
      );
    } catch (error) {
      console.error("SUBMIT VERIFICATION ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit your request.";

      Alert.alert(
        "Submission Failed",
        message.toLowerCase().includes("auth session missing") ||
          message.toLowerCase().includes("not signed in")
          ? "Your session is not active. Please sign in again before submitting."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (): string => {
    if (request?.status === "approved") {
      return COLORS.success;
    }

    if (request?.status === "rejected") {
      return ERROR_COLOR;
    }

    return COLORS.primary;
  };

  const getStatusIcon = (): "checkmark-circle" | "close-circle" | "time" => {
    if (request?.status === "approved") {
      return "checkmark-circle";
    }

    if (request?.status === "rejected") {
      return "close-circle";
    }

    return "time";
  };

  const getStatusTitle = () => {
    if (request?.status === "approved") {
      return "Request Approved";
    }

    if (request?.status === "rejected") {
      return "Request Rejected";
    }

    return "Awaiting Review";
  };

  const getStatusDescription = () => {
    if (request?.status === "approved") {
      return "Your teacher verification has been approved.";
    }

    if (request?.status === "rejected") {
      return "Your request was rejected. Review the administrator's notes and submit again if needed.";
    }

    return "Your request has been submitted and is waiting for an administrator.";
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Header title="Teacher Verification" />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="school-outline"
                size={34}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.heroTitle}>Teacher Verification</Text>

            <Text style={styles.heroDescription}>
              Request teacher access to QR - ATT. An administrator must review
              and approve your request before your role changes.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                Loading verification status...
              </Text>
            </View>
          ) : !signedIn ? (
            <View style={styles.messageCard}>
              <Ionicons
                name="lock-closed-outline"
                size={28}
                color={COLORS.primary}
              />

              <Text style={styles.messageTitle}>Sign In Required</Text>

              <Text style={styles.messageDescription}>
                Please sign in to submit a verification request or view your
                request status.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/login")}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Go to Sign In</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {request && (
                <View style={styles.statusCard}>
                  <View style={styles.statusHeader}>
                    <View
                      style={[
                        styles.statusIcon,
                        {
                          backgroundColor: `${getStatusColor()}18`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getStatusIcon()}
                        size={26}
                        color={getStatusColor()}
                      />
                    </View>

                    <View style={styles.statusTextContainer}>
                      <Text style={styles.statusLabel}>LATEST REQUEST</Text>

                      <Text
                        style={[
                          styles.statusTitle,
                          { color: getStatusColor() },
                        ]}
                      >
                        {getStatusTitle()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.statusDescription}>
                    {getStatusDescription()}
                  </Text>

                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsLabel}>
                      Submitted Information
                    </Text>

                    <Text style={styles.detailsText}>{request.details}</Text>
                  </View>

                  {request.admin_notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.detailsLabel}>
                        Administrator's Notes
                      </Text>

                      <Text style={styles.detailsText}>
                        {request.admin_notes}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.dateText}>
                    Submitted{" "}
                    {new Date(request.created_at).toLocaleDateString()}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadVerification()}
                    style={({ pressed }) => [
                      styles.refreshButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={17}
                      color={COLORS.primary}
                    />

                    <Text style={styles.refreshButtonText}>Refresh Status</Text>
                  </Pressable>
                </View>
              )}

              {(!request || request.status === "rejected") && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>
                    {request ? "Submit a New Request" : "Request Verification"}
                  </Text>

                  <Text style={styles.formDescription}>
                    Enter your school position, department, employee
                    identification details, or other information that helps the
                    administrator verify your teacher status.
                  </Text>

                  <Text style={styles.inputLabel}>Verification Details</Text>

                  <TextInput
                    accessibilityLabel="Teacher verification details"
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Example: Teacher, Computer Studies Department..."
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    textAlignVertical="top"
                    maxLength={1000}
                    editable={!submitting}
                    style={styles.textInput}
                  />

                  <Text style={styles.characterCount}>
                    {details.length}/1000 characters
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.pressed,
                      submitting && styles.disabledButton,
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color={COLORS.textOnPrimary} />
                    ) : (
                      <>
                        <Ionicons
                          name="send-outline"
                          size={18}
                          color={COLORS.textOnPrimary}
                        />

                        <Text style={styles.primaryButtonText}>
                          Submit Verification Request
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Text style={styles.disclaimer}>
                    Submitting this request does not immediately change your
                    account role.
                  </Text>
                </View>
              )}

              {loadError ? (
                <View style={styles.errorCard}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={ERROR_COLOR}
                  />

                  <View style={styles.errorTextContainer}>
                    <Text style={styles.errorTitle}>Could Not Load Status</Text>

                    <Text style={styles.errorDescription}>{loadError}</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadVerification()}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}

          <View style={styles.securityNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.primary}
            />

            <Text style={styles.securityText}>
              Your request is linked to your signed-in account and is subject to
              administrator review.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  headerContainer: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },

  heroCard: {
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },

  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  heroDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },

  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 20,
  },

  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 15,
  },

  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  statusTextContainer: {
    flex: 1,
  },

  statusLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 5,
  },

  statusTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  statusDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },

  detailsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  notesBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  detailsLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  detailsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 5,
    marginBottom: 15,
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingVertical: 12,
  },

  refreshButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 20,
  },

  formTitle: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 9,
  },

  formDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },

  inputLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 9,
  },

  textInput: {
    minHeight: 130,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },

  characterCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 7,
    marginBottom: 17,
  },

  primaryButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  primaryButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.65,
  },

  disclaimer: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 13,
  },

  loadingCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 13,
  },

  messageCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    marginBottom: 20,
  },

  messageTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 13,
    marginBottom: 8,
  },

  messageDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 20,
  },

  errorTextContainer: {
    flex: 1,
  },

  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 5,
  },

  errorDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  retryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 5,
    marginTop: 4,
  },

  securityText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 18,
  },

  pressed: {
    opacity: 0.78,
  },
});
