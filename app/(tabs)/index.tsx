import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Header from "@/components/Header";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { getProfile, type Role } from "@/lib/profiles";

type HomeAction = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route: string;
};

const HOME_CONTENT: Record<
  Role,
  {
    badge: string;
    title: string;
    subtitle: string;
    actions: HomeAction[];
  }
> = {
  student: {
    badge: "STUDENT PORTAL",
    title: "Your attendance, made simple.",
    subtitle: "Scan event QR codes and keep track of your school activities.",
    actions: [
      {
        title: "Scan Event QR",
        description: "Record your attendance at an event.",
        icon: "qr-code-outline",
        route: "/scan",
      },
      {
        title: "Attendance History",
        description: "Review your previous attendance records.",
        icon: "time-outline",
        route: "/history",
      },
      {
        title: "Teacher Verification",
        description: "Request teacher access if needed.",
        icon: "shield-checkmark-outline",
        route: "/verification",
      },
      {
        title: "My Profile",
        description: "View your account information.",
        icon: "person-outline",
        route: "/profile",
      },
    ],
  },
  teacher: {
    badge: "TEACHER PORTAL",
    title: "Manage your school events.",
    subtitle:
      "Create events, display QR codes, manage event status, and review attendance.",
    actions: [
      {
        title: "Event Management",
        description: "Create and manage your events.",
        icon: "calendar-outline",
        route: "/teacher",
      },
      {
        title: "Attendance History",
        description: "View past attendance records for your events.",
        icon: "time-outline",
        route: "/history",
      },
      {
        title: "My Profile",
        description: "View your account information.",
        icon: "person-outline",
        route: "/profile",
      },
    ],
  },
  admin: {
    badge: "ADMINISTRATOR PORTAL",
    title: "Your school, at a glance.",
    subtitle:
      "Manage accounts, events, attendance records, and school reports.",
    actions: [
      {
        title: "Admin Dashboard",
        description: "Open your administrative management tools.",
        icon: "grid-outline",
        route: "/admin",
      },
      {
        title: "My Profile",
        description: "View your account information.",
        icon: "person-outline",
        route: "/profile",
      },
    ],
  },
};

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRole() {
      if (!user?.id) {
        if (active) {
          setRole(null);
          setLoadingProfile(false);
        }
        return;
      }

      setLoadingProfile(true);

      try {
        const profile = await getProfile(user.id);

        if (active) {
          setRole(profile?.role ?? "student");
        }
      } catch (error) {
        console.error("HOME ROLE ERROR:", error);

        if (active) {
          setRole("student");
        }
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    }

    void loadRole();

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (authLoading || loadingProfile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons
          name="person-circle-outline"
          size={54}
          color={COLORS.primary}
        />
        <Text style={styles.loadingTitle}>Sign in to continue</Text>
        <Text style={styles.loadingText}>
          Log in to access your personalized dashboard.
        </Text>
        <Pressable
          onPress={() => router.replace("/login")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Go to Sign In</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const content = HOME_CONTENT[role ?? "student"];
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Header title="" />
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.badge}>
            <Ionicons
              name={
                role === "admin"
                  ? "shield-checkmark"
                  : role === "teacher"
                    ? "school"
                    : "person"
              }
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.badgeText}>{content.badge}</Text>
          </View>

          <Text style={styles.greeting}>Welcome, {displayName}!</Text>
          <Text style={styles.welcomeTitle}>{content.title}</Text>
          <Text style={styles.welcomeSubtitle}>{content.subtitle}</Text>

          <View style={styles.heroIcon}>
            <Ionicons
              name={
                role === "admin"
                  ? "shield-checkmark-outline"
                  : role === "teacher"
                    ? "easel-outline"
                    : "qr-code-outline"
              }
              size={44}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.decorativeCircle} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Dashboard</Text>
          <Text style={styles.sectionSubtitle}>
            Choose what you would like to do.
          </Text>
        </View>

        <View style={styles.actions}>
          {content.actions.map((action) => (
            <Pressable
              key={action.title}
              accessibilityRole="button"
              accessibilityLabel={action.title}
              onPress={() => router.push(action.route as never)}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={26} color={COLORS.primary} />
              </View>

              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.primary}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={23}
            color={COLORS.primary}
          />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>QR - ATT</Text>
            <Text style={styles.infoDescription}>
              Your school attendance companion. Available features depend on
              your assigned account role.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Lavender Attend · Smart School Event Attendance
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 8,
  },
  primaryButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  headerContainer: {
    paddingHorizontal: 4,
    paddingTop: 4,
    marginBottom: 12,
  },
  welcomeCard: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 28,
    padding: 22,
    overflow: "hidden",
    position: "relative",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    marginBottom: 17,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  welcomeTitle: {
    color: COLORS.textPrimary,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "800",
    marginBottom: 9,
    maxWidth: 280,
  },
  welcomeSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 290,
    paddingRight: 8,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  decorativeCircle: {
    position: "absolute",
    width: 175,
    height: 175,
    borderRadius: 90,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.2,
    right: -65,
    bottom: -75,
  },
  sectionHeader: {
    paddingHorizontal: 22,
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 5,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  actions: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    gap: 13,
  },
  actionIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },
  actionDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 20,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },
  infoDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 20,
  },
});
