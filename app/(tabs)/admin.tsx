import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
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

export default function AdminScreen(): React.JSX.Element {
  const { user } = useAuth();

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

  const [selectedAttendance, setSelectedAttendance] =
    useState<AdminAttendanceRecord | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] =
    useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [updatingAttendance, setUpdatingAttendance] = useState<boolean>(false);

  const loadRole = useCallback(async (): Promise<void> => {
    if (!user) {
      setLoading(false);
      return;
    }

    const profile = await getProfile(user.id);

    setRole(profile?.role ?? "student");
    setLoading(false);
  }, [user]);

  const loadUsers = useCallback(async (): Promise<void> => {
    setLoadingUsers(true);

    const data: AdminProfile[] = await getAllProfiles();

    setUsers(data);
    setLoadingUsers(false);
  }, []);

  const loadEvents = useCallback(async (): Promise<void> => {
    setLoadingEvents(true);

    const data: CloudEvent[] = await getAllEvents();

    setEvents(data);
    setLoadingEvents(false);
  }, []);

  const loadAttendance = useCallback(async (): Promise<void> => {
    setLoadingAttendance(true);

    const data: AdminAttendanceRecord[] = await getAllAttendance();

    setAttendance(data);
    setLoadingAttendance(false);
  }, []);

  const handleDeleteAttendance = async (
    record: AdminAttendanceRecord,
  ): Promise<void> => {
    const { error } = await deleteAttendance(record.id);

    if (error) {
      console.log("DELETE ATTENDANCE ERROR:", error);
      return;
    }

    setAttendance((currentAttendance: AdminAttendanceRecord[]) =>
      currentAttendance.filter(
        (currentRecord: AdminAttendanceRecord) =>
          currentRecord.id !== record.id,
      ),
    );
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

    const { error } = await updateAttendance(
      selectedAttendance.id,
      selectedStudentId,
      selectedEventId,
    );

    setUpdatingAttendance(false);

    if (error) {
      console.log("UPDATE ATTENDANCE ERROR:", error);
      return;
    }

    await loadAttendance();
    handleCloseAttendanceModal();
  };

  useFocusEffect(
    useCallback(() => {
      loadRole();
    }, [loadRole]),
  );

  useFocusEffect(
    useCallback(() => {
      if (role === "admin") {
        loadUsers();
        loadEvents();
        loadAttendance();
      }
    }, [role, loadUsers, loadEvents, loadAttendance]),
  );

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

    const userId: string = selectedUser.id;

    setShowRoleModal(false);
    setUpdatingUser(userId);

    const { error } = await updateUserRole(userId, newRole);

    setUpdatingUser(null);

    if (error) {
      console.log("ROLE UPDATE ERROR:", error);
      return;
    }

    setUsers((currentUsers: AdminProfile[]): AdminProfile[] =>
      currentUsers.map(
        (currentUser: AdminProfile): AdminProfile =>
          currentUser.id === userId
            ? {
                ...currentUser,
                role: newRole,
              }
            : currentUser,
      ),
    );

    setSelectedUser(null);
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

    const { error } = await updateEventStatus(event.id, newStatus);

    setUpdatingEvent(null);

    if (error) {
      console.log("EVENT STATUS UPDATE ERROR:", error);
      return;
    }

    setEvents((currentEvents: CloudEvent[]): CloudEvent[] =>
      currentEvents.map(
        (currentEvent: CloudEvent): CloudEvent =>
          currentEvent.id === event.id
            ? {
                ...currentEvent,
                status: newStatus,
              }
            : currentEvent,
      ),
    );
  };

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
        <Text style={styles.lockTitle}>Administrators Only</Text>

        <Text style={styles.lockSubtitle}>
          Only administrator accounts can access this section.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Administrator</Text>

        <Text style={styles.subtitle}>
          Manage the QR-ATT attendance system.
        </Text>

        {/* USER MANAGEMENT */}

        <View style={styles.card}>
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
              (profile: AdminProfile): React.JSX.Element => (
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

        <View style={styles.card}>
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
            events.map((event: CloudEvent): React.JSX.Element => {
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

        <View style={styles.card}>
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
              (record: AdminAttendanceRecord): React.JSX.Element => (
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
                      onPress={() => handleDeleteAttendance(record)}
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reports</Text>

          <Text style={styles.cardDescription}>
            View overall attendance information and system summaries.
          </Text>
        </View>
      </ScrollView>

      {/* CHANGE ROLE MODAL */}

      <Modal
        visible={showRoleModal}
        transparent={true}
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
                onPress={() => handleChangeRole("student")}
              >
                <Text style={styles.modalButtonText}>Student</Text>
              </TouchableOpacity>
            )}

            {selectedUser?.role !== "teacher" && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleChangeRole("teacher")}
              >
                <Text style={styles.modalButtonText}>Teacher</Text>
              </TouchableOpacity>
            )}

            {selectedUser?.role !== "admin" && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleChangeRole("admin")}
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
        transparent={true}
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

            <ScrollView style={styles.selectionList} nestedScrollEnabled={true}>
              {users.map(
                (profile: AdminProfile): React.JSX.Element => (
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
                ),
              )}
            </ScrollView>

            <Text style={styles.formLabel}>Event</Text>

            <ScrollView style={styles.selectionList} nestedScrollEnabled={true}>
              {events.map(
                (event: CloudEvent): React.JSX.Element => (
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
                ),
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              disabled={
                updatingAttendance || !selectedStudentId || !selectedEventId
              }
              onPress={handleUpdateAttendance}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingVertical: 8,
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingVertical: 8,
  },

  // USER STYLES

  userItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  userInfo: {
    marginBottom: 10,
  },

  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 3,
  },

  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },

  userId: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  userActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },

  roleBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },

  editRoleButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },

  editRoleButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // EVENT STYLES

  eventItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  eventCode: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 6,
  },

  eventTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },

  eventVenue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  eventDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },

  eventBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  openBadge: {
    backgroundColor: COLORS.primary,
  },

  closedBadge: {
    backgroundColor: COLORS.textSecondary,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },

  closeButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  closeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  reopenButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  reopenButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // ATTENDANCE STYLES

  attendanceItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  attendanceStudent: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 3,
  },

  attendanceEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  attendanceEvent: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },

  attendanceCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },

  attendanceTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  attendanceActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  editAttendanceButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  editAttendanceButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  deleteAttendanceButton: {
    marginTop: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "#D32F2F",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteAttendanceButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D32F2F",
  },

  // MODAL STYLES

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modalContainer: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  currentRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },

  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  selectionList: {
    maxHeight: 130,
    marginBottom: 14,
  },

  selectionButton: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 7,
  },

  selectionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },

  selectionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  selectionButtonTextSelected: {
    color: COLORS.primary,
  },

  selectionSecondaryText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  modalButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 10,
  },

  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },

  cancelButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // ACCESS DENIED

  lockContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  lockTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  lockSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
