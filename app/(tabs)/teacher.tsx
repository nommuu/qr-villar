import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import AppButton from "@/components/AppButton";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { createEvent } from "@/lib/events";
import { getProfile, type Role } from "@/lib/profiles";
import { buildQRPayload } from "@/lib/qr";

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const QUICK_END_OPTIONS = [
  { label: "+30 min", ms: 30 * 60 * 1000 },
  { label: "+1 hour", ms: 60 * 60 * 1000 },
  { label: "+2 hours", ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = "start" | "end";

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000),
  );

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<"date" | "time">("date");

  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRole(null);
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      setRoleLoading(true);

      getProfile(user.id)
        .then((profile) => {
          if (!active) return;
          setRole(profile?.role ?? "student");
        })
        .catch(() => {
          if (!active) return;
          setRole(null);
        })
        .finally(() => {
          if (active) setRoleLoading(false);
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  const showMessage = (text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart("date");
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (!editTarget) return;

    if (event.type === "dismissed" || !selected) {
      setEditTarget(null);
      setEditingPart("date");
      return;
    }

    const current = editTarget === "start" ? startDate : endDate;
    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );

    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === "start") {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (Platform.OS === "android" && editingPart === "date") {
      setEditingPart("time");
    } else {
      setEditTarget(null);
      setEditingPart("date");
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = async () => {
    if (saving) return;

    const eventData = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    if (!eventData.title || !eventData.eventId) {
      showMessage("Please enter both the event title and event code.", true);
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      showMessage("The event end time must be after the start time.", true);
      return;
    }

    setSaving(true);
    setPayload(null);
    setMessage(null);

    try {
      const { error } = await createEvent(eventData);

      if (error) {
        showMessage(
          "Could not save the event. Check the event code and try again.",
          true,
        );
        return;
      }

      setPayload(buildQRPayload(eventData));
      showMessage("Event created successfully! Your QR code is ready.");
    } catch {
      showMessage("Something went wrong while saving the event.", true);
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <View style={styles.lockContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.lockTitle}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== "teacher" && role !== "admin") {
    return (
      <View style={styles.lockContainer}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={34}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.lockTitle}>Teachers Only</Text>

        <Text style={styles.lockSubtitle}>
          Only teacher and administrator accounts can create events and generate
          event QR codes.
        </Text>
      </View>
    );
  }

  const isAndroid = Platform.OS === "android";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.eyebrow}>TEACHER WORKSPACE</Text>
          <Text style={styles.title}>Create an Event</Text>
          <Text style={styles.subtitle}>
            Set your event schedule and generate a QR code for student
            attendance.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="qr-code-outline"
            size={32}
            color={COLORS.textOnPrimary}
          />
        </View>
      </View>

      {/* Quick guide */}
      <View style={styles.guideCard}>
        <View style={styles.guideIcon}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.guideTextContainer}>
          <Text style={styles.guideTitle}>How it works</Text>
          <Text style={styles.guideText}>
            Create your event, display the generated QR code, and let students
            scan it using the Scan tab.
          </Text>
        </View>
      </View>

      {/* Event details */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name="create-outline" size={21} color={COLORS.primary} />
        </View>

        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <Text style={styles.sectionSubtitle}>
            Enter the information for your event.
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Event Title</Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="calendar-outline"
            size={19}
            color={COLORS.textMuted}
          />

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setPayload(null);
              setMessage(null);
            }}
            placeholder="e.g. Founders Day Assembly"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="next"
            maxLength={100}
          />
        </View>

        <Text style={styles.label}>Event Code</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={19} color={COLORS.textMuted} />

          <TextInput
            style={styles.input}
            value={eventId}
            onChangeText={(value) => {
              setEventId(value.toUpperCase());
              setPayload(null);
              setMessage(null);
            }}
            placeholder="e.g. EVT-2026-0002"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={50}
          />
        </View>

        <View style={styles.fieldHint}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={COLORS.textSecondary}
          />
          <Text style={styles.fieldHintText}>
            Use a unique code that identifies this event.
          </Text>
        </View>
      </View>

      {/* Event schedule */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name="time-outline" size={21} color={COLORS.primary} />
        </View>

        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>Event Schedule</Text>
          <Text style={styles.sectionSubtitle}>
            Choose when attendance scanning should be available.
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Start Date & Time</Text>

        <PickerField
          value={formatDateTime(startDate)}
          icon="play-circle-outline"
          onPress={() => openPicker("start")}
        />

        <Text style={styles.label}>End Date & Time</Text>

        <PickerField
          value={formatDateTime(endDate)}
          icon="stop-circle-outline"
          onPress={() => openPicker("end")}
        />

        <Text style={styles.quickLabel}>QUICK END TIME</Text>

        <View style={styles.chipRow}>
          {QUICK_END_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              onPress={() => handleQuickEnd(option.ms)}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.chipText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>
          Quick options calculate the end time from the selected start time.
        </Text>
      </View>

      {/* Date/time picker */}
      {editTarget && (
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerHeaderTitle}>
              {editTarget === "start" ? "Event Start" : "Event End"}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEditTarget(null);
                setEditingPart("date");
              }}
              hitSlop={10}
            >
              <Ionicons
                name="close-circle"
                size={25}
                color={COLORS.textSecondary}
              />
            </Pressable>
          </View>

          <DateTimePicker
            value={editTarget === "start" ? startDate : endDate}
            mode={isAndroid ? editingPart : "datetime"}
            display={isAndroid ? "default" : "spinner"}
            onChange={onPickerChange}
            minimumDate={undefined}
          />

          {isAndroid && editingPart === "date" && (
            <Text style={styles.pickerHint}>
              Select a date to continue to the time picker.
            </Text>
          )}
        </View>
      )}

      {/* Feedback */}
      {message && (
        <View
          style={[
            styles.messageCard,
            messageIsError ? styles.errorMessage : styles.successMessage,
          ]}
        >
          <Ionicons
            name={
              messageIsError
                ? "alert-circle-outline"
                : "checkmark-circle-outline"
            }
            size={22}
            color={messageIsError ? COLORS.danger : COLORS.success}
          />

          <Text
            style={[
              styles.messageText,
              {
                color: messageIsError ? COLORS.danger : COLORS.success,
              },
            ]}
          >
            {message}
          </Text>
        </View>
      )}

      {/* Create event button */}
      <View style={styles.createButtonContainer}>
        <AppButton
          theme="primary"
          title={saving ? "Creating Event..." : "Create Event QR"}
          icon="qr-code-outline"
          onPress={handleCreateEvent}
          disabled={saving}
        />

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.savingText}>Saving event details...</Text>
          </View>
        )}
      </View>

      {/* Generated QR */}
      {payload && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={23}
                color={COLORS.success}
              />
            </View>

            <View style={styles.resultHeaderText}>
              <Text style={styles.resultTitle}>Your Event QR Is Ready</Text>
              <Text style={styles.resultSubtitle}>
                Students can scan this code from the Scan tab.
              </Text>
            </View>
          </View>

          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QRCode
                value={payload}
                size={210}
                color="#27213B"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.eventSummary}>
            <View style={styles.summaryRow}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={COLORS.primary}
              />

              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>EVENT TITLE</Text>
                <Text style={styles.summaryValue}>{title.trim()}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Ionicons name="key-outline" size={18} color={COLORS.primary} />

              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>EVENT CODE</Text>
                <Text style={styles.summaryValue}>{eventId.trim()}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />

              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>SCHEDULE</Text>
                <Text style={styles.summaryValue}>
                  {formatDateTime(startDate)}
                </Text>
                <Text style={styles.summarySecondary}>
                  Until {formatDateTime(endDate)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.qrNote}>
            <Ionicons
              name="phone-portrait-outline"
              size={19}
              color={COLORS.primary}
            />
            <Text style={styles.qrNoteText}>
              Keep this QR code visible so students can scan it with their
              phones.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPayload(null);
              setMessage(null);
            }}
            style={({ pressed }) => [
              styles.newEventButton,
              pressed && styles.newEventButtonPressed,
            ]}
          >
            <Ionicons
              name="add-circle-outline"
              size={19}
              color={COLORS.primary}
            />
            <Text style={styles.newEventButtonText}>Prepare Another Event</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.footer}>
        <Ionicons name="qr-code-outline" size={16} color={COLORS.textMuted} />
        <Text style={styles.footerText}>
          QR-ATT · Smart School Event Attendance Management System
        </Text>
      </View>
    </ScrollView>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pickerFieldPressed,
      ]}
    >
      <View style={styles.pickerFieldIcon}>
        <Ionicons name={icon} size={21} color={COLORS.primary} />
      </View>

      <Text style={styles.pickerValue}>{value}</Text>

      <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 36,
  },

  header: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    overflow: "hidden",
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    color: "#E7DEFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: COLORS.textOnPrimary,
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: "#F0EBFF",
  },

  headerIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
  },

  guideCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 15,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  guideIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  guideTextContainer: {
    flex: 1,
  },

  guideTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  guideText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 25,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 9,
    elevation: 2,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 9,
  },

  inputWrapper: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    paddingLeft: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  fieldHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  fieldHintText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },

  pickerField: {
    minHeight: 64,
    backgroundColor: COLORS.background,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  pickerFieldPressed: {
    backgroundColor: COLORS.primarySoft,
  },

  pickerFieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  pickerValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    color: COLORS.textPrimary,
    marginRight: 7,
  },

  quickLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.textSecondary,
    marginTop: 15,
    marginBottom: 10,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 5,
  },

  chipPressed: {
    opacity: 0.7,
  },

  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  hint: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 10,
  },

  pickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 20,
    alignItems: "center",
  },

  pickerHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  pickerHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  pickerHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },

  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 15,
    marginBottom: 15,
    gap: 10,
  },

  errorMessage: {
    backgroundColor: COLORS.dangerBackground,
  },

  successMessage: {
    backgroundColor: COLORS.successBackground,
  },

  messageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  createButtonContainer: {
    marginTop: 3,
  },

  savingIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
    marginBottom: 12,
  },

  savingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginTop: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  resultIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  resultHeaderText: {
    flex: 1,
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  resultSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  qrContainer: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    marginBottom: 18,
  },

  qrBox: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  eventSummary: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    gap: 11,
  },

  summaryTextContainer: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 19,
  },

  summarySecondary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  qrNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.primarySoft,
    borderRadius: 13,
    padding: 12,
    marginTop: 15,
    gap: 9,
  },

  qrNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  newEventButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginTop: 14,
    gap: 8,
  },

  newEventButtonPressed: {
    backgroundColor: COLORS.primarySoft,
  },

  newEventButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  lockContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  lockIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  lockTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 12,
    textAlign: "center",
  },

  lockSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 25,
    paddingHorizontal: 5,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
