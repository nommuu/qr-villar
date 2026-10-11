import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Header from "@/components/Header";
import { COLORS } from "@/constants/colors";

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Header title="QR Attendance" />
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTextContainer}>
            <View style={styles.badge}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={COLORS.primary}
              />
              <Text style={styles.badgeText}>QR-ATT SYSTEM</Text>
            </View>

            <Text style={styles.welcomeTitle}>Attendance, made simple.</Text>

            <Text style={styles.welcomeSubtitle}>
              A smarter way to record attendance at school events.
            </Text>
          </View>

          <View style={styles.heroIconContainer}>
            <Ionicons name="qr-code" size={54} color={COLORS.primary} />
          </View>

          <View style={styles.decorativeCircle} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Get Started</Text>
          <Text style={styles.sectionSubtitle}>
            What would you like to do today?
          </Text>
        </View>

        <View style={styles.scanCard}>
          <View style={styles.scanIconContainer}>
            <Ionicons
              name="scan-outline"
              size={30}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.scanTextContainer}>
            <Text style={styles.scanTitle}>Scan Event QR Code</Text>
            <Text style={styles.scanDescription}>
              Record your attendance quickly and securely.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open QR scanner"
            onPress={() => router.push("/scan")}
            style={({ pressed }) => [
              styles.scanArrowButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-forward" size={22} color={COLORS.primary} />
          </Pressable>
        </View>

        <View style={styles.quickActionsHeader}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/history")}
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.actionIconHistory}>
              <Ionicons name="time-outline" size={26} color={COLORS.primary} />
            </View>

            <Text style={styles.actionTitle}>History</Text>
            <Text style={styles.actionDescription}>
              View attendance records
            </Text>

            <View style={styles.actionFooter}>
              <Text style={styles.actionLink}>View history</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.primary}
              />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/profile")}
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.actionIconProfile}>
              <Ionicons
                name="person-outline"
                size={26}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.actionTitle}>My Profile</Text>
            <Text style={styles.actionDescription}>
              View your account details
            </Text>

            <View style={styles.actionFooter}>
              <Text style={styles.actionLink}>View profile</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.primary}
              />
            </View>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Quick reminder</Text>
            <Text style={styles.infoDescription}>
              Make sure you scan the correct event's QR code and wait for the
              attendance result before leaving the scanner.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
          <Text style={styles.footerText}>
            QR-ATT · Smart School Event Attendance
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
    minHeight: 210,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },

  welcomeTextContainer: {
    flex: 1,
    zIndex: 1,
    paddingRight: 4,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 18,
    gap: 5,
  },

  badgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  welcomeTitle: {
    color: COLORS.textPrimary,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    marginBottom: 9,
  },

  welcomeSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 230,
  },

  heroIconContainer: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    zIndex: 1,
  },

  decorativeCircle: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.18,
    right: -50,
    bottom: -75,
  },

  sectionHeader: {
    paddingHorizontal: 22,
    marginBottom: 16,
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

  scanCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 28,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },

  scanIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  scanTextContainer: {
    flex: 1,
    paddingRight: 6,
  },

  scanTitle: {
    color: COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },

  scanDescription: {
    color: "#F0EAFE",
    fontSize: 12,
    lineHeight: 18,
  },

  scanArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  quickActionsHeader: {
    paddingHorizontal: 22,
    marginBottom: 14,
  },

  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },

  actionCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  actionIconHistory: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  actionIconProfile: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 7,
  },

  actionDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 36,
  },

  actionFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  actionLink: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.78,
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

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  infoTextContainer: {
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 25,
    paddingHorizontal: 20,
  },

  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
});
