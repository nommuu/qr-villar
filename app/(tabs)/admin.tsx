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
import { useAuth } from "@/lib/auth";
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

  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminProfile | null>(null);

  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

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

  useFocusEffect(
    useCallback(() => {
      loadRole();
    }, [loadRole]),
  );

  useFocusEffect(
    useCallback(() => {
      if (role === "admin") {
        loadUsers();
      }
    }, [role, loadUsers]),
  );

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
            Manage school events, event details, and event status.
          </Text>
        </View>

        {/* ATTENDANCE MANAGEMENT */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attendance Management</Text>

          <Text style={styles.cardDescription}>
            View and manage attendance records across the system.
          </Text>
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
