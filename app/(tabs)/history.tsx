import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS } from "@/constants/colors";
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { getProfile, type Role } from "@/lib/profiles";

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>(
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);

    if (!user) {
      setRole(null);
      setStudentRecords([]);
      setTeacherEvents([]);
      setLoading(false);
      return;
    }

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? "student";

      setRole(currentRole);

      if (currentRole === "teacher") {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id);
        setStudentRecords(records);
        setTeacherEvents([]);
      }
    } catch {
      setStudentRecords([]);
      setTeacherEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <Text style={styles.loadingTitle}>Loading attendance</Text>
        <Text style={styles.loadingSubtitle}>
          Please wait while we retrieve your records.
        </Text>
      </View>
    );
  }

  if (role === "teacher") {
    return (
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <View style={styles.headingIcon}>
            <Ionicons
              name="clipboard-outline"
              size={25}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.headingText}>
            <Text style={styles.title}>Attendance History</Text>
            <Text style={styles.subtitle}>
              Review your events and their attendees.
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Events Created</Text>
            <Text style={styles.summaryValue}>{teacherEvents.length}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Total Attendees</Text>
            <Text style={styles.summaryValue}>
              {teacherEvents.reduce(
                (total, event) => total + event.attendeeCount,
                0,
              )}
            </Text>
          </View>
        </View>

        {teacherEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={36}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>
              Events you create and their attendance records will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.eventCardHeader}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="calendar"
                      size={22}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventCode}>Code: {item.eventCode}</Text>
                  </View>

                  <View style={styles.attendeeBadge}>
                    <Ionicons
                      name="people-outline"
                      size={17}
                      color={COLORS.primary}
                    />
                    <Text style={styles.attendeeCount}>
                      {item.attendeeCount}
                    </Text>
                    <Text style={styles.attendeeLabel}>attendees</Text>
                  </View>
                </View>

                <View style={styles.dateSection}>
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="play-circle-outline"
                      size={17}
                      color={COLORS.success}
                    />
                    <Text style={styles.dateLabel}>Start</Text>
                    <Text style={styles.dateValue}>
                      {item.startTime ? formatDate(item.startTime) : "N/A"}
                    </Text>
                  </View>

                  <View style={styles.dateRow}>
                    <Ionicons
                      name="stop-circle-outline"
                      size={17}
                      color={COLORS.danger}
                    />
                    <Text style={styles.dateLabel}>End</Text>
                    <Text style={styles.dateValue}>
                      {item.endTime ? formatDate(item.endTime) : "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.attendeeSection}>
                  <View style={styles.attendeeSectionHeader}>
                    <Text style={styles.attendeeSectionTitle}>
                      Attendee List
                    </Text>
                    <Text style={styles.attendeeSectionCount}>
                      {item.attendees.length} listed
                    </Text>
                  </View>

                  {item.attendees.length === 0 ? (
                    <Text style={styles.noAttendees}>
                      No attendees recorded for this event yet.
                    </Text>
                  ) : (
                    item.attendees.map((attendee, index) => (
                      <View
                        key={`${item.eventId}-${attendee.studentId}`}
                        style={styles.attendeeRow}
                      >
                        <View style={styles.attendeeAvatar}>
                          <Text style={styles.attendeeInitial}>
                            {(attendee.studentName || "U")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>

                        <Text style={styles.attendeeName}>
                          {attendee.studentName ?? "Unknown student"}
                        </Text>

                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={COLORS.success}
                        />
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.headingIcon}>
          <Ionicons name="time-outline" size={25} color={COLORS.primary} />
        </View>

        <View style={styles.headingText}>
          <Text style={styles.title}>Attendance History</Text>
          <Text style={styles.subtitle}>
            Keep track of the school events you attended.
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons
            name="checkmark-done-outline"
            size={24}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Recorded Attendance</Text>
          <Text style={styles.summaryValue}>{studentRecords.length}</Text>
        </View>
      </View>

      {studentRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="qr-code-outline" size={36} color={COLORS.primary} />
          </View>

          <Text style={styles.emptyTitle}>No records yet</Text>
          <Text style={styles.emptyText}>
            Scan a school event's QR code to register your attendance. Your
            successful attendance records will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.studentRecord}>
              <View style={styles.timeline}>
                <View style={styles.timelineIcon}>
                  <Ionicons name="checkmark" size={19} color={COLORS.success} />
                </View>
                <View style={styles.timelineLine} />
              </View>

              <View style={styles.studentRecordCard}>
                <View style={styles.studentRecordHeader}>
                  <View style={styles.studentRecordText}>
                    <Text style={styles.eventTitle}>{item.eventTitle}</Text>
                    <Text style={styles.eventCode}>
                      Event ID: {item.eventId}
                    </Text>
                  </View>

                  <View style={styles.presentBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={COLORS.success}
                    />
                    <Text style={styles.presentText}>Recorded</Text>
                  </View>
                </View>

                <View style={styles.recordDate}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.recordDateText}>
                    {formatDate(item.scannedAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 7,
  },

  loadingSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 13,
  },

  headingIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  headingText: {
    flex: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 17,
    marginBottom: 22,
    gap: 13,
  },

  summaryIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryText: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },

  summaryValue: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  summaryDivider: {
    width: 1,
    height: 45,
    backgroundColor: COLORS.border,
    marginHorizontal: 3,
  },

  list: {
    paddingBottom: 28,
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 15,
  },

  eventCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  eventIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  eventInfo: {
    flex: 1,
    paddingTop: 2,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  eventCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  attendeeBadge: {
    minWidth: 65,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },

  attendeeCount: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 2,
  },

  attendeeLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  dateSection: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 11,
    backgroundColor: COLORS.background,
    borderRadius: 13,
    gap: 10,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dateLabel: {
    width: 34,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  dateValue: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textPrimary,
  },

  attendeeSection: {
    marginTop: 16,
  },

  attendeeSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  attendeeSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  attendeeSectionCount: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  noAttendees: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
    paddingVertical: 7,
  },

  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },

  attendeeAvatar: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  attendeeInitial: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  attendeeName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },

  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 35,
    marginTop: 4,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  studentRecord: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },

  timeline: {
    alignItems: "center",
    width: 35,
  },

  timelineIcon: {
    width: 35,
    height: 35,
    borderRadius: 13,
    backgroundColor: COLORS.successBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 20,
    backgroundColor: COLORS.border,
  },

  studentRecordCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
  },

  studentRecordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  studentRecordText: {
    flex: 1,
  },

  presentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.successBackground,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },

  presentText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.success,
  },

  recordDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 13,
    paddingTop: 11,
  },

  recordDateText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
});
