import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS } from "@/constants/colors";
import {
  deleteAttendance,
  getAllAttendance,
  updateAttendance,
  type AdminAttendanceRecord,
} from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { getAllEvents, updateEventStatus, type CloudEvent } from "@/lib/events";
import {
  getAllProfiles,
  getProfile,
  updateUserRole,
  type AdminProfile,
  type Role,
} from "@/lib/profiles";

type DashboardSection = "users" | "events" | "attendance" | "reports";

export default function AdminScreen(): React.JSX.Element {
  const { user } = useAuth();

  const scrollViewRef = useRef<ScrollView>(null);

  const sectionPositions = useRef<Record<DashboardSection, number>>({
    users: 0,
    events: 0,
    attendance: 0,
    reports: 0,
  });

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // USER MANAGEMENT
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminProfile | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // EVENT MANAGEMENT
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [updatingEvent, setUpdatingEvent] = useState<string | null>(null);

  // ATTENDANCE MANAGEMENT
  const [attendance, setAttendance] = useState<AdminAttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  const [selectedReportEventId, setSelectedReportEventId] =
    useState<string>("all");

  const [selectedAttendance, setSelectedAttendance] =
    useState<AdminAttendanceRecord | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] =
    useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [updatingAttendance, setUpdatingAttendance] = useState<boolean>(false);

  const filteredAttendance =
    selectedReportEventId === "all"
      ? attendance
      : attendance.filter((record) => record.eventId === selectedReportEventId);

  // QUICK NAVIGATION
  const recordSectionPosition = useCallback(
    (section: DashboardSection, y: number): void => {
      sectionPositions.current[section] = y;
    },
    [],
  );

  const navigateToSection = useCallback((section: DashboardSection): void => {
    const y = sectionPositions.current[section];

    console.log("Navigating to:", section, "Position:", y);

    scrollViewRef.current?.scrollTo({
      y: Math.max(y - 12, 0),
      animated: true,
    });
  }, []);

  // LOAD ADMIN ROLE
  const loadRole = useCallback(async (): Promise<void> => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? "student");
    } catch (error) {
      console.error("LOAD ROLE ERROR:", error);
      setRole("student");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // LOAD USERS
  const loadUsers = useCallback(async (): Promise<void> => {
    setLoadingUsers(true);

    try {
      const data: AdminProfile[] = await getAllProfiles();
      setUsers(data);
    } catch (error) {
      console.error("LOAD USERS ERROR:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // LOAD EVENTS
  const loadEvents = useCallback(async (): Promise<void> => {
    setLoadingEvents(true);

    try {
      const data: CloudEvent[] = await getAllEvents();
      setEvents(data);
    } catch (error) {
      console.error("LOAD EVENTS ERROR:", error);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // LOAD ATTENDANCE
  const loadAttendance = useCallback(async (): Promise<void> => {
    setLoadingAttendance(true);

    try {
      const data: AdminAttendanceRecord[] = await getAllAttendance();
      setAttendance(data);
    } catch (error) {
      console.error("LOAD ATTENDANCE ERROR:", error);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRole();
    }, [loadRole]),
  );

  useFocusEffect(
    useCallback(() => {
      if (role === "admin") {
        void loadUsers();
        void loadEvents();
        void loadAttendance();
      }
    }, [role, loadUsers, loadEvents, loadAttendance]),
  );

  // DATE AND TIME
  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) {
      return "Not set";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString();
  };

  // USER MANAGEMENT
  const handleOpenRoleModal = (profile: AdminProfile): void => {
    setSelectedUser(profile);
    setShowRoleModal(true);
  };

  const handleCloseRoleModal = (): void => {
    setShowRoleModal(false);
    setSelectedUser(null);
  };

  const handleChangeRole = async (newRole: Role): Promise<void> => {
    if (!selectedUser) {
      return;
    }

    const userId = selectedUser.id;

    setShowRoleModal(false);
    setUpdatingUser(userId);

    try {
      const { error } = await updateUserRole(userId, newRole);

      if (error) {
        console.error("ROLE UPDATE ERROR:", error);
        Alert.alert("Update failed", "Unable to update this user's role.");
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === userId
            ? { ...currentUser, role: newRole }
            : currentUser,
        ),
      );

      setSelectedUser(null);
    } catch (error) {
      console.error("ROLE UPDATE ERROR:", error);
      Alert.alert("Update failed", "Unable to update this user's role.");
    } finally {
      setUpdatingUser(null);
    }
  };

  const getRoleLabel = (userRole: Role): string => {
    if (userRole === "admin") {
      return "Administrator";
    }

    if (userRole === "teacher") {
      return "Teacher";
    }

    return "Student";
  };

  // EVENT MANAGEMENT
  const handleChangeEventStatus = async (
    event: CloudEvent,
    newStatus: "open" | "closed",
  ): Promise<void> => {
    setUpdatingEvent(event.id);

    try {
      const { error } = await updateEventStatus(event.id, newStatus);

      if (error) {
        console.error("EVENT STATUS UPDATE ERROR:", error);
        Alert.alert("Update failed", "Unable to update the event status.");
        return;
      }

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === event.id
            ? { ...currentEvent, status: newStatus }
            : currentEvent,
        ),
      );
    } catch (error) {
      console.error("EVENT STATUS UPDATE ERROR:", error);
      Alert.alert("Update failed", "Unable to update the event status.");
    } finally {
      setUpdatingEvent(null);
    }
  };

  // ATTENDANCE MANAGEMENT
  const handleDeleteAttendance = async (
    record: AdminAttendanceRecord,
  ): Promise<void> => {
    const confirmDelete = (): void => {
      void performDeleteAttendance(record);
    };

    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `Delete the attendance record for ${record.studentName || "this student"}?`,
        )
      ) {
        confirmDelete();
      }

      return;
    }

    Alert.alert(
      "Delete attendance",
      `Delete the attendance record for ${record.studentName || "this student"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDelete },
      ],
    );
  };

  const performDeleteAttendance = async (
    record: AdminAttendanceRecord,
  ): Promise<void> => {
    try {
      const { error } = await deleteAttendance(record.id);

      if (error) {
        console.error("DELETE ATTENDANCE ERROR:", error);
        Alert.alert(
          "Delete failed",
          "Unable to delete this attendance record.",
        );
        return;
      }

      setAttendance((currentAttendance) =>
        currentAttendance.filter(
          (currentRecord) => currentRecord.id !== record.id,
        ),
      );
    } catch (error) {
      console.error("DELETE ATTENDANCE ERROR:", error);
      Alert.alert("Delete failed", "Unable to delete this attendance record.");
    }
  };

  const handleOpenAttendanceModal = (record: AdminAttendanceRecord): void => {
    setSelectedAttendance(record);
    setSelectedStudentId(record.studentId);
    setSelectedEventId(record.eventId);
    setShowAttendanceModal(true);
  };

  const handleCloseAttendanceModal = (): void => {
    setShowAttendanceModal(false);
    setSelectedAttendance(null);
    setSelectedStudentId("");
    setSelectedEventId("");
  };

  const handleUpdateAttendance = async (): Promise<void> => {
    if (!selectedAttendance || !selectedStudentId || !selectedEventId) {
      return;
    }

    setUpdatingAttendance(true);

    try {
      const { error } = await updateAttendance(
        selectedAttendance.id,
        selectedStudentId,
        selectedEventId,
      );

      if (error) {
        console.error("UPDATE ATTENDANCE ERROR:", error);
        Alert.alert(
          "Update failed",
          "Unable to update this attendance record.",
        );
        return;
      }

      await loadAttendance();
      handleCloseAttendanceModal();
    } catch (error) {
      console.error("UPDATE ATTENDANCE ERROR:", error);
      Alert.alert("Update failed", "Unable to update this attendance record.");
    } finally {
      setUpdatingAttendance(false);
    }
  };

  // EXPORT ATTENDANCE REPORT
  const handleExportAttendance = async (): Promise<void> => {
    if (filteredAttendance.length === 0) {
      if (Platform.OS === "web") {
        window.alert(
          "No attendance records available to export for this filter.",
        );
      } else {
        Alert.alert(
          "No attendance records",
          "No attendance records available to export for this filter.",
        );
      }

      return;
    }

    try {
      const headers = [
        "Student Name",
        "Student Email",
        "Event Name",
        "Event Code",
        "Scanned At",
      ];

      const escapeCsv = (value: unknown): string => {
        let text = String(value ?? "");

        // Prevent spreadsheet formula injection.
        if (/^[\t\r ]*[=+\-@]/.test(text)) {
          text = "'" + text;
        }

        return `"${text.replace(/"/g, '""')}"`;
      };

      const rows = filteredAttendance.map((record) => [
        record.studentName || "Unknown student",
        record.studentEmail || "No email",
        record.eventTitle || "Unknown event",
        record.eventCode || "No event code",
        formatDateTime(record.scannedAt),
      ]);

      const csvContent =
        "\uFEFF" +
        [headers, ...rows]
          .map((row) => row.map(escapeCsv).join(","))
          .join("\r\n");

      const fileName =
        selectedReportEventId === "all"
          ? "qr-attendance-report.csv"
          : "qr-attendance-event-report.csv";

      if (Platform.OS === "web") {
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);

        return;
      }

      if (!FileSystem.cacheDirectory) {
        throw new Error("File cache directory is unavailable.");
      }

      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export attendance report",
        UTI: "public.comma-separated-values-text",
      });
    } catch (error) {
      console.error("CSV export failed:", error);

      if (Platform.OS === "web") {
        window.alert(
          "Unable to export the attendance report. Please try again.",
        );
      } else {
        Alert.alert(
          "Export failed",
          "Unable to export the attendance report. Please try again.",
        );
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    );
  }

  if (role !== "admin") {
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

        <Text style={styles.lockTitle}>Admin Only</Text>

        <Text style={styles.lockSubtitle}>
          This section is reserved for administrators. Your account does not
          have permission to manage users, events, attendance records, or system
          reports.
        </Text>

        <View style={styles.lockNotice}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.primary}
          />

          <Text style={styles.lockNoticeText}>
            Contact your school administrator if you need administrator access.
          </Text>
        </View>

        <View style={styles.lockFooter}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={COLORS.textMuted}
          />
          <Text style={styles.lockFooterText}>
            QR-ATT · Protected Administration Workspace
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>QR-ATT Management System.</Text>

        {/* QUICK NAVIGATION */}
        <View style={styles.quickNavCard}>
          <View style={styles.quickNavHeader}>
            <View>
              <Text style={styles.quickNavTitle}>Quick Navigation</Text>
              <Text style={styles.quickNavSubtitle}>
                Your administration shortcuts
              </Text>
            </View>

            <View style={styles.quickNavHeaderIcon}>
              <Ionicons name="apps-outline" size={22} color={COLORS.primary} />
            </View>
          </View>

          <View style={styles.quickNavGrid}>
            {/* USERS */}
            <TouchableOpacity
              style={[styles.quickNavButton, styles.quickNavUsers]}
              onPress={() => navigateToSection("users")}
              activeOpacity={0.75}
            >
              <View style={styles.quickNavIconBox}>
                <Ionicons name="people-outline" size={23} color="#7964D8" />
              </View>

              <View style={styles.quickNavTextArea}>
                <Text style={styles.quickNavButtonText}>Users</Text>
                <Text style={styles.quickNavCount}>
                  {users.length} accounts
                </Text>
              </View>

              <View style={styles.quickNavArrow}>
                <Ionicons name="arrow-forward" size={16} color="#7964D8" />
              </View>
            </TouchableOpacity>

            {/* EVENTS */}
            <TouchableOpacity
              style={[styles.quickNavButton, styles.quickNavEvents]}
              onPress={() => navigateToSection("events")}
              activeOpacity={0.75}
            >
              <View style={styles.quickNavIconBox}>
                <Ionicons name="calendar-outline" size={23} color="#7964D8" />
              </View>

              <View style={styles.quickNavTextArea}>
                <Text style={styles.quickNavButtonText}>Events</Text>
                <Text style={styles.quickNavCount}>{events.length} events</Text>
              </View>

              <View style={styles.quickNavArrow}>
                <Ionicons name="arrow-forward" size={16} color="#7964D8" />
              </View>
            </TouchableOpacity>

            {/* ATTENDANCE */}
            <TouchableOpacity
              style={[styles.quickNavButton, styles.quickNavAttendance]}
              onPress={() => navigateToSection("attendance")}
              activeOpacity={0.75}
            >
              <View style={styles.quickNavIconBox}>
                <Ionicons name="clipboard-outline" size={23} color="#7964D8" />
              </View>

              <View style={styles.quickNavTextArea}>
                <Text style={styles.quickNavButtonText}>Attendance</Text>
                <Text style={styles.quickNavCount}>
                  {attendance.length} records
                </Text>
              </View>

              <View style={styles.quickNavArrow}>
                <Ionicons name="arrow-forward" size={16} color="#7964D8" />
              </View>
            </TouchableOpacity>

            {/* REPORTS */}
            <TouchableOpacity
              style={[styles.quickNavButton, styles.quickNavReports]}
              onPress={() => navigateToSection("reports")}
              activeOpacity={0.75}
            >
              <View style={styles.quickNavIconBox}>
                <Ionicons
                  name="stats-chart-outline"
                  size={23}
                  color="#7964D8"
                />
              </View>

              <View style={styles.quickNavTextArea}>
                <Text style={styles.quickNavButtonText}>Reports</Text>
                <Text style={styles.quickNavCount}>Analytics & exports</Text>
              </View>

              <View style={styles.quickNavArrow}>
                <Ionicons name="arrow-forward" size={16} color="#7964D8" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* USER MANAGEMENT */}
        <View
          style={styles.card}
          onLayout={(event) =>
            recordSectionPosition("users", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.cardTitle}>User Management</Text>

          <Text style={styles.cardDescription}>
            View and manage student, teacher, and administrator accounts.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            Registered Users ({users.length})
          </Text>

          {loadingUsers ? (
            <Text style={styles.loadingText}>Loading users...</Text>
          ) : users.length === 0 ? (
            <Text style={styles.emptyText}>No users found.</Text>
          ) : (
            users.map(
              (profile): React.JSX.Element => (
                <View key={profile.id} style={styles.userItem}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {profile.full_name || "No name"}
                    </Text>
                    <Text style={styles.userEmail}>{profile.email}</Text>
                    <Text style={styles.userId} numberOfLines={1}>
                      ID: {profile.id}
                    </Text>
                  </View>

                  <View style={styles.userActions}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>
                        {getRoleLabel(profile.role)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.editRoleButton}
                      activeOpacity={0.6}
                      disabled={updatingUser === profile.id}
                      onPress={() => handleOpenRoleModal(profile)}
                    >
                      <Text style={styles.editRoleButtonText}>
                        {updatingUser === profile.id
                          ? "Updating..."
                          : "Edit Role"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ),
            )
          )}
        </View>

        {/* EVENT MANAGEMENT */}
        <View
          style={styles.card}
          onLayout={(event) =>
            recordSectionPosition("events", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.cardTitle}>Event Management</Text>

          <Text style={styles.cardDescription}>
            View all school events and manage their open or closed status.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            Registered Events ({events.length})
          </Text>

          {loadingEvents ? (
            <Text style={styles.loadingText}>Loading events...</Text>
          ) : events.length === 0 ? (
            <Text style={styles.emptyText}>No events found.</Text>
          ) : (
            events.map((event): React.JSX.Element => {
              const eventStatus = event.status ?? "open";
              const isUpdating = updatingEvent === event.id;

              return (
                <View key={event.id} style={styles.eventItem}>
                  <Text style={styles.eventTitle}>
                    {event.title || "Untitled event"}
                  </Text>

                  <Text style={styles.eventCode}>
                    Event Code: {event.event_code}
                  </Text>

                  <Text style={styles.eventTime}>
                    Start: {formatDateTime(event.start_time)}
                  </Text>

                  <Text style={styles.eventTime}>
                    End: {formatDateTime(event.end_time)}
                  </Text>

                  {event.venue ? (
                    <Text style={styles.eventVenue}>Venue: {event.venue}</Text>
                  ) : null}

                  {event.description ? (
                    <Text style={styles.eventDescription}>
                      Description: {event.description}
                    </Text>
                  ) : null}

                  <View style={styles.eventBottomRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        eventStatus === "closed"
                          ? styles.closedBadge
                          : styles.openBadge,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {eventStatus === "closed" ? "Closed" : "Open"}
                      </Text>
                    </View>

                    {eventStatus === "closed" ? (
                      <TouchableOpacity
                        style={styles.reopenButton}
                        disabled={isUpdating}
                        onPress={() => handleChangeEventStatus(event, "open")}
                      >
                        <Text style={styles.reopenButtonText}>
                          {isUpdating ? "Updating..." : "Reopen Event"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.closeButton}
                        disabled={isUpdating}
                        onPress={() => handleChangeEventStatus(event, "closed")}
                      >
                        <Text style={styles.closeButtonText}>
                          {isUpdating ? "Updating..." : "Close Event"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ATTENDANCE MANAGEMENT */}
        <View
          style={styles.card}
          onLayout={(event) =>
            recordSectionPosition("attendance", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.cardTitle}>Attendance Management</Text>

          <Text style={styles.cardDescription}>
            View and manage attendance records across the system.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            Attendance Records ({attendance.length})
          </Text>

          {loadingAttendance ? (
            <Text style={styles.loadingText}>
              Loading attendance records...
            </Text>
          ) : attendance.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records found.</Text>
          ) : (
            attendance.map(
              (record): React.JSX.Element => (
                <View key={record.id} style={styles.attendanceItem}>
                  <Text style={styles.attendanceStudent}>
                    {record.studentName || "Unknown student"}
                  </Text>

                  <Text style={styles.attendanceEmail}>
                    {record.studentEmail || "No email"}
                  </Text>

                  <Text style={styles.attendanceEvent}>
                    Event: {record.eventTitle || "Unknown event"}
                  </Text>

                  <Text style={styles.attendanceCode}>
                    Code: {record.eventCode || "No event code"}
                  </Text>

                  <Text style={styles.attendanceTime}>
                    Scanned: {formatDateTime(record.scannedAt)}
                  </Text>

                  <View style={styles.attendanceActions}>
                    <TouchableOpacity
                      style={styles.editAttendanceButton}
                      onPress={() => handleOpenAttendanceModal(record)}
                    >
                      <Text style={styles.editAttendanceButtonText}>
                        Edit Attendance
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteAttendanceButton}
                      onPress={() => void handleDeleteAttendance(record)}
                    >
                      <Text style={styles.deleteAttendanceButtonText}>
                        Delete Attendance
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ),
            )
          )}
        </View>

        {/* REPORTS */}
        <View
          style={styles.card}
          onLayout={(event) =>
            recordSectionPosition("reports", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.cardTitle}>Reports</Text>

          <Text style={styles.cardDescription}>
            Filter attendance records by event and export the selected report.
          </Text>

          {/* ATTENDANCE STATISTICS */}
          <View style={styles.reportStatsContainer}>
            <View style={styles.reportStatBox}>
              <Text style={styles.reportStatNumber}>{attendance.length}</Text>
              <Text style={styles.reportStatLabel}>Total Attendance</Text>
            </View>

            <View style={styles.reportStatBox}>
              <Text style={styles.reportStatNumber}>
                {users.filter((profile) => profile.role === "student").length}
              </Text>
              <Text style={styles.reportStatLabel}>Total Students</Text>
            </View>

            <View style={styles.reportStatBox}>
              <Text style={styles.reportStatNumber}>{events.length}</Text>
              <Text style={styles.reportStatLabel}>Total Events</Text>
            </View>
          </View>

          {/* EVENT FILTER */}
          <Text style={styles.reportSectionTitle}>Filter by Event</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reportFilterList}
          >
            <TouchableOpacity
              style={[
                styles.reportFilterButton,
                selectedReportEventId === "all" &&
                  styles.reportFilterButtonSelected,
              ]}
              onPress={() => setSelectedReportEventId("all")}
            >
              <Text
                style={[
                  styles.reportFilterButtonText,
                  selectedReportEventId === "all" &&
                    styles.reportFilterButtonTextSelected,
                ]}
              >
                All Events
              </Text>
            </TouchableOpacity>

            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.reportFilterButton,
                  selectedReportEventId === event.id &&
                    styles.reportFilterButtonSelected,
                ]}
                onPress={() => setSelectedReportEventId(event.id)}
              >
                <Text
                  style={[
                    styles.reportFilterButtonText,
                    selectedReportEventId === event.id &&
                      styles.reportFilterButtonTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {event.title || event.event_code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* EXPORT FILTERED RECORDS */}
          <TouchableOpacity
            style={[
              styles.exportReportButton,
              filteredAttendance.length === 0 && styles.disabledButton,
            ]}
            onPress={() => void handleExportAttendance()}
            disabled={filteredAttendance.length === 0}
          >
            <Text style={styles.exportReportButtonText}>
              {filteredAttendance.length === 0
                ? "No Records to Export"
                : "Export Filtered Report (CSV)"}
            </Text>
          </TouchableOpacity>

          {/* FILTERED ATTENDANCE RECORDS */}
          <Text style={styles.reportSectionTitle}>
            Attendance Records ({filteredAttendance.length})
          </Text>

          {loadingAttendance ? (
            <Text style={styles.loadingText}>
              Loading attendance records...
            </Text>
          ) : filteredAttendance.length === 0 ? (
            <Text style={styles.emptyText}>
              No attendance records found for this selection.
            </Text>
          ) : (
            filteredAttendance.map((record) => (
              <View key={record.id} style={styles.reportEventItem}>
                <Text style={styles.reportEventTitle}>
                  {record.studentName || "Unknown student"}
                </Text>
                <Text style={styles.reportEventDetails}>
                  Email: {record.studentEmail || "No email"}
                </Text>
                <Text style={styles.reportEventDetails}>
                  Event: {record.eventTitle || "Unknown event"}
                </Text>
                <Text style={styles.reportEventDetails}>
                  Event Code: {record.eventCode || "No event code"}
                </Text>
                <Text style={styles.reportEventDetails}>
                  Scanned: {formatDateTime(record.scannedAt)}
                </Text>
              </View>
            ))
          )}

          {/* EVENT SUMMARIES */}
          <Text style={styles.reportSectionTitle}>
            Event Attendance Summary
          </Text>

          {events.length === 0 ? (
            <Text style={styles.cardDescription}>
              No events available for reporting.
            </Text>
          ) : (
            events
              .filter(
                (event) =>
                  selectedReportEventId === "all" ||
                  event.id === selectedReportEventId,
              )
              .map((event) => {
                const eventAttendance = attendance.filter(
                  (record) => record.eventId === event.id,
                );

                return (
                  <View key={event.id} style={styles.reportEventItem}>
                    <Text style={styles.reportEventTitle}>
                      {event.title || "Untitled event"}
                    </Text>
                    <Text style={styles.reportEventDetails}>
                      Event Code: {event.event_code}
                    </Text>
                    <Text style={styles.reportEventDetails}>
                      Attendance Records: {eventAttendance.length}
                    </Text>
                    <Text style={styles.reportEventDetails}>
                      Status: {event.status || "Unknown"}
                    </Text>
                  </View>
                );
              })
          )}
        </View>
      </ScrollView>

      {/* CHANGE ROLE MODAL */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseRoleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change User Role</Text>

            <Text style={styles.modalSubtitle}>
              {selectedUser?.full_name ||
                selectedUser?.email ||
                "Select a user"}
            </Text>

            {selectedUser && (
              <Text style={styles.currentRole}>
                Current role: {getRoleLabel(selectedUser.role)}
              </Text>
            )}

            {selectedUser?.role !== "student" && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => void handleChangeRole("student")}
              >
                <Text style={styles.modalButtonText}>Student</Text>
              </TouchableOpacity>
            )}

            {selectedUser?.role !== "teacher" && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => void handleChangeRole("teacher")}
              >
                <Text style={styles.modalButtonText}>Teacher</Text>
              </TouchableOpacity>
            )}

            {selectedUser?.role !== "admin" && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => void handleChangeRole("admin")}
              >
                <Text style={styles.modalButtonText}>Administrator</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseRoleModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT ATTENDANCE MODAL */}
      <Modal
        visible={showAttendanceModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAttendanceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Attendance</Text>

            <Text style={styles.modalSubtitle}>
              Select the correct student and event.
            </Text>

            <Text style={styles.formLabel}>Student</Text>

            <ScrollView style={styles.selectionList} nestedScrollEnabled>
              {users.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.selectionButton,
                    selectedStudentId === profile.id &&
                      styles.selectionButtonSelected,
                  ]}
                  onPress={() => setSelectedStudentId(profile.id)}
                >
                  <Text
                    style={[
                      styles.selectionButtonText,
                      selectedStudentId === profile.id &&
                        styles.selectionButtonTextSelected,
                    ]}
                  >
                    {profile.full_name || profile.email}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.formLabel}>Event</Text>

            <ScrollView style={styles.selectionList} nestedScrollEnabled>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.selectionButton,
                    selectedEventId === event.id &&
                      styles.selectionButtonSelected,
                  ]}
                  onPress={() => setSelectedEventId(event.id)}
                >
                  <Text
                    style={[
                      styles.selectionButtonText,
                      selectedEventId === event.id &&
                        styles.selectionButtonTextSelected,
                    ]}
                  >
                    {event.title || "Untitled event"}
                  </Text>

                  <Text style={styles.selectionSecondaryText}>
                    Code: {event.event_code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalButton,
                (updatingAttendance ||
                  !selectedStudentId ||
                  !selectedEventId) &&
                  styles.disabledButton,
              ]}
              disabled={
                updatingAttendance || !selectedStudentId || !selectedEventId
              }
              onPress={() => void handleUpdateAttendance()}
            >
              <Text style={styles.modalButtonText}>
                {updatingAttendance ? "Updating..." : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseAttendanceModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  quickNavCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#E9E2FA",
    shadowColor: "#8B78C9",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },

  quickNavHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  quickNavTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#30264A",
    marginBottom: 5,
  },

  quickNavSubtitle: {
    fontSize: 12,
    color: "#8A819F",
  },

  quickNavHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#F0EBFF",
    borderWidth: 1,
    borderColor: "#E4DAFF",
    alignItems: "center",
    justifyContent: "center",
  },

  quickNavGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  quickNavButton: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "40%",
    minHeight: 112,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9E2FA",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  quickNavUsers: {
    backgroundColor: "#F5F1FF",
  },

  quickNavEvents: {
    backgroundColor: "#F0EEFF",
  },

  quickNavAttendance: {
    backgroundColor: "#F7F2FF",
  },

  quickNavReports: {
    backgroundColor: "#EEE8FF",
  },

  quickNavIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DEFA",
    alignItems: "center",
    justifyContent: "center",
  },

  quickNavTextArea: {
    flex: 1,
    minWidth: 0,
  },

  quickNavButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#392D57",
    marginBottom: 5,
  },

  quickNavCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8779A5",
    lineHeight: 15,
  },

  quickNavArrow: {
    width: 27,
    height: 27,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // ACCESS DENIED
  lockContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  lockIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    position: "relative",
  },
  lockBadge: {
    position: "absolute",
    right: -3,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  lockEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: COLORS.primary,
    marginBottom: 9,
    textAlign: "center",
  },
  lockTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
  lockNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    maxWidth: 360,
    width: "100%",
  },
  lockNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    lineHeight: 19,
  },
  lockFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 28,
  },
  lockFooterText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  // LAYOUT
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 22,
  },

  // DASHBOARD CARDS
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 17,
    marginBottom: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    lineHeight: 19,
  },
  disabledButton: {
    opacity: 0.5,
  },

  // USER MANAGEMENT
  userItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  userId: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
  },
  roleBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textOnPrimary,
  },
  editRoleButton: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  editRoleButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  // EVENT MANAGEMENT
  eventItem: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  eventCode: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 9,
  },
  eventTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 3,
  },
  eventVenue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  eventDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 5,
  },
  eventBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  openBadge: {
    backgroundColor: COLORS.successBackground,
  },
  closedBadge: {
    backgroundColor: COLORS.surface,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  closeButton: {
    backgroundColor: COLORS.dangerBackground,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  closeButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.danger,
  },
  reopenButton: {
    backgroundColor: COLORS.successBackground,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  reopenButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.success,
  },

  // ATTENDANCE MANAGEMENT
  attendanceItem: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  attendanceStudent: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  attendanceEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 9,
  },
  attendanceEvent: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  attendanceCode: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 4,
  },
  attendanceTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  attendanceActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  editAttendanceButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editAttendanceButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },
  deleteAttendanceButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: COLORS.dangerBackground,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAttendanceButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.danger,
  },

  // REPORTS
  exportReportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  exportReportButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  reportStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 16,
    marginBottom: 22,
  },
  reportStatBox: {
    flex: 1,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  reportStatNumber: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.primary,
  },
  reportStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 15,
  },
  reportSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  reportFilterList: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    gap: 8,
  },
  reportFilterButton: {
    maxWidth: 200,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reportFilterButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reportFilterButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  reportFilterButtonTextSelected: {
    color: COLORS.textOnPrimary,
  },
  reportEventItem: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },
  reportEventTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  reportEventDetails: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(39, 33, 59, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 7,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  currentRole: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 5,
  },
  selectionList: {
    maxHeight: 130,
    marginBottom: 14,
  },
  selectionButton: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 7,
  },
  selectionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  selectionButtonTextSelected: {
    color: COLORS.primary,
  },
  selectionSecondaryText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textOnPrimary,
  },
  cancelButton: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 3,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textSecondary,
  },
});
