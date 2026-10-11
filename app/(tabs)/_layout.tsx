import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { COLORS } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 20,
        },

        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          paddingTop: 4,
        },
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 7,
          paddingBottom: 8,
          elevation: 8,
          shadowColor: COLORS.shadow,
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home-sharp" : "home-outline"}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "qr-code" : "qr-code-outline"}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          title: "Teacher",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "clipboard" : "clipboard-outline"}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "shield-checkmark" : "shield-checkmark-outline"}
              color={color}
              size={23}
            />
          ),
        }}
      />
    </Tabs>
  );
}
