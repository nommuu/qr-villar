import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { createEvent, getEventsByTeacher, type CloudEvent } from "@/lib/events";
import { getProfile, type Role } from "@/lib/profiles";
import { buildQRPayload } from "@/lib/qr";
import { supabase } from "@/lib/supabase";

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

  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);

  // Selected event for the QR code popup.
  const [selectedQrEvent, setSelectedQrEvent] = useState<CloudEvent | null>(
    null,
  );

  const showMessage = (text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        if (!user?.id) {
          if (active) {
            setEvents([]);
            setEventsLoading(false);
          }
          return;
        }

        if (active) setEventsLoading(true);

        try {
          const data = await getEventsByTeacher(user.id);
          if (active) setEvents(data);
        } catch {
          if (active) {
            showMessage("Could not load your events. Please try again.", true);
          }
        } finally {
          if (active) setEventsLoading(false);
        }
      };

      void load();

      return () => {
        active = false;
      };
    }, [user?.id]),
  );

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

  const handleToggleEventStatus = async (event: CloudEvent) => {
    if (!user?.id || updatingEventId) return;

    const newStatus: "open" | "closed" =
      event.status === "open" ? "closed" : "open";

    setUpdatingEventId(event.id);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", event.id)
        .eq("created_by", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        showMessage(
          `Could not ${newStatus === "open" ? "open" : "close"} this event: ${error.message}`,
          true,
        );
        return;
      }

      if (!data) {
        showMessage(
          "No event was updated. Check that this event belongs to your account and that your Supabase policies allow teachers to update their own events.",
          true,
        );
        return;
      }

      setEvents((current) =>
        current.map((item) =>
          item.id === event.id ? { ...item, status: newStatus } : item,
        ),
      );

      // Keep the QR popup status current if it is open.
      setSelectedQrEvent((current) =>
        current?.id === event.id ? { ...current, status: newStatus } : current,
      );

      showMessage(
        `Event ${newStatus === "open" ? "opened" : "closed"} successfully.`,
      );
    } catch {
      showMessage(
        "Something went wrong while updating the event status.",
        true,
      );
    } finally {
      setUpdatingEventId(null);
    }
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

      if (user?.id) {
        const refreshedEvents = await getEventsByTeacher(user.id);
        setEvents(refreshedEvents);
      }

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
        <View style={styles.lockIconCircle}>
          <Ionicons
            name="shield-checkmark-outline"
            size={42}
            color={COLORS.primary}
          />
          <View style={styles.lockBadge}>
            <Ionicons
              name="lock-closed"
              size={16}
              color={COLORS.textOnPrimary}
            />
          </View>
        </View>

        <Text style={styles.lockEyebrow}>RESTRICTED ACCESS</Text>
        <Text style={styles.lockTitle}>Teachers Only</Text>

        <Text style={styles.lockSubtitle}>
          This section is reserved for teachers and administrators. Student
          accounts cannot create events or generate attendance QR codes.
        </Text>

        <View style={styles.lockNotice}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.primary}
          />
          <Text style={styles.lockNoticeText}>
            Contact your school administrator if you need teacher access.
          </Text>
        </View>

        <View style={styles.lockFooter}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={COLORS.textMuted}
          />
          <Text style={styles.lockFooterText}>
            QR-ATT · Protected Teacher Workspace
          </Text>
        </View>
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

      {/* My Events */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name="albums-outline" size={21} color={COLORS.primary} />
        </View>
        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>My Events</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your events, view their QR codes, and control attendance
            availability.
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        {eventsLoading ? (
          <View style={styles.eventsLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.hint}>Loading your events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyEvents}>
            <Ionicons
              name="calendar-clear-outline"
              size={28}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyEventsTitle}>No events yet</Text>
            <Text style={styles.hint}>Events you create will appear here.</Text>
          </View>
        ) : (
          events.map((event) => {
            const isOpen = event.status === "open";
            const isUpdating = updatingEventId === event.id;

            return (
              <View key={event.id} style={styles.eventManageCard}>
                <View style={styles.eventManageHeader}>
                  <View style={styles.eventManageIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.eventManageInfo}>
                    <Text style={styles.eventManageTitle}>{event.title}</Text>
                    <Text style={styles.eventManageCode}>
                      Code: {event.event_code}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isOpen ? styles.statusOpen : styles.statusClosed,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isOpen ? styles.statusDotOpen : styles.statusDotClosed,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        isOpen
                          ? styles.statusTextOpen
                          : styles.statusTextClosed,
                      ]}
                    >
                      {isOpen ? "OPEN" : "CLOSED"}
                    </Text>
                  </View>
                </View>

                <View style={styles.eventManageDates}>
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.eventManageDateText}>
                    {event.start_time
                      ? new Date(event.start_time).toLocaleString()
                      : "Start time not set"}
                  </Text>
                </View>

                <View style={styles.eventManageDates}>
                  <Ionicons
                    name="flag-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.eventManageDateText}>
                    {event.end_time
                      ? `Ends ${new Date(event.end_time).toLocaleString()}`
                      : "End time not set"}
                  </Text>
                </View>

                {/* View QR code for this existing event */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View QR code for ${event.title}`}
                  onPress={() => setSelectedQrEvent(event)}
                  style={({ pressed }) => [
                    styles.viewQrButton,
                    pressed && styles.statusActionPressed,
                  ]}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.viewQrButtonText}>View QR Code</Text>
                </Pressable>

                {/* Close / reopen event */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isOpen ? "Close event" : "Open event"}
                  disabled={Boolean(updatingEventId)}
                  onPress={() => void handleToggleEventStatus(event)}
                  style={({ pressed }) => [
                    styles.statusActionButton,
                    isOpen ? styles.closeEventButton : styles.openEventButton,
                    (pressed || isUpdating) && styles.statusActionPressed,
                    Boolean(updatingEventId) &&
                      !isUpdating &&
                      styles.statusActionDisabled,
                  ]}
                >
                  {isUpdating ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.textOnPrimary}
                    />
                  ) : (
                    <Ionicons
                      name={
                        isOpen ? "lock-closed-outline" : "lock-open-outline"
                      }
                      size={18}
                      color={COLORS.textOnPrimary}
                    />
                  )}
                  <Text style={styles.statusActionText}>
                    {isUpdating
                      ? "Updating..."
                      : isOpen
                        ? "Close Event"
                        : "Open Event"}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
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
              { color: messageIsError ? COLORS.danger : COLORS.success },
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

      {/* Generated QR for a newly created event */}
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

      {/* QR popup for any existing event */}
      <Modal
        visible={selectedQrEvent !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedQrEvent(null)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View style={styles.qrModalHeadingText}>
                <Text style={styles.qrModalTitle}>Event QR Code</Text>
                <Text style={styles.qrModalSubtitle}>
                  Students can scan this code to record attendance.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close QR code popup"
                onPress={() => setSelectedQrEvent(null)}
                hitSlop={10}
              >
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            </View>

            {selectedQrEvent && (
              <>
                <View style={styles.qrModalCodeBox}>
                  <QRCode
                    value={buildQRPayload({
                      eventId: selectedQrEvent.event_code,
                      title: selectedQrEvent.title,
                      start: selectedQrEvent.start_time ?? undefined,
                      end: selectedQrEvent.end_time ?? undefined,
                    })}
                    size={220}
                    color="#27213B"
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <Text style={styles.qrModalEventTitle}>
                  {selectedQrEvent.title}
                </Text>

                <Text style={styles.qrModalEventCode}>
                  Event Code: {selectedQrEvent.event_code}
                </Text>

                <View
                  style={[
                    styles.qrModalStatus,
                    selectedQrEvent.status === "closed"
                      ? styles.statusClosed
                      : styles.statusOpen,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      selectedQrEvent.status === "closed"
                        ? styles.statusTextClosed
                        : styles.statusTextOpen,
                    ]}
                  >
                    {selectedQrEvent.status === "closed"
                      ? "EVENT CLOSED"
                      : "EVENT OPEN"}
                  </Text>
                </View>

                <Text style={styles.qrModalHint}>
                  {selectedQrEvent.status === "closed"
                    ? "This event is closed. Reopen it to allow attendance scanning, subject to the event schedule."
                    : "Display this QR code for students to scan during the event."}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedQrEvent(null)}
                  style={({ pressed }) => [
                    styles.qrModalCloseButton,
                    pressed && styles.statusActionPressed,
                  ]}
                >
                  <Text style={styles.qrModalCloseButtonText}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingVertical: 32,
  },
  lockIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  lockBadge: {
    position: "absolute",
    right: -5,
    bottom: -3,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  lockEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: COLORS.primary,
    marginBottom: 5,
    textAlign: "center",
  },
  lockTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
    maxWidth: 340,
  },
  lockNotice: {
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
    marginTop: 25,
    gap: 10,
  },
  lockNoticeText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  lockFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
  },
  lockFooterText: {
    fontSize: 10,
    color: COLORS.textMuted,
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
  eventsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  emptyEvents: {
    alignItems: "center",
    paddingVertical: 22,
  },
  emptyEventsTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  eventManageCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
  },
  eventManageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  eventManageIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  eventManageInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventManageTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  eventManageCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusOpen: {
    backgroundColor: COLORS.successBackground,
  },
  statusClosed: {
    backgroundColor: COLORS.dangerBackground,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOpen: {
    backgroundColor: COLORS.success,
  },
  statusDotClosed: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  statusTextOpen: {
    color: COLORS.success,
  },
  statusTextClosed: {
    color: COLORS.danger,
  },
  eventManageDates: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 10,
  },
  eventManageDateText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  viewQrButton: {
    minHeight: 43,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 13,
    paddingHorizontal: 12,
  },
  viewQrButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statusActionButton: {
    minHeight: 43,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 9,
    paddingHorizontal: 12,
  },
  closeEventButton: {
    backgroundColor: COLORS.danger,
  },
  openEventButton: {
    backgroundColor: COLORS.primary,
  },
  statusActionPressed: {
    opacity: 0.78,
  },
  statusActionDisabled: {
    opacity: 0.45,
  },
  statusActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textOnPrimary,
  },

  // Existing-event QR popup
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 15, 30, 0.68)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalCard: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "90%",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  qrModalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  qrModalHeadingText: {
    flex: 1,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  qrModalSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  qrModalCodeBox: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrModalEventTitle: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  qrModalEventCode: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  qrModalStatus: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
  },
  qrModalHint: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
  qrModalCloseButton: {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  qrModalCloseButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textOnPrimary,
  },
});
