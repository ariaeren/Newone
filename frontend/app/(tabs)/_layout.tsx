import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Home, Swords, BookOpen, Trophy, User } from "lucide-react-native";

import { colors } from "@/src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1,
          marginBottom: 6,
        },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 64,
          borderRadius: 24,
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : "rgba(10,10,10,0.92)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: "hidden" }]} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { borderRadius: 24, backgroundColor: "rgba(10,10,10,0.92)" }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="hub"
        options={{
          title: "HUB",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: "QUESTS",
          tabBarIcon: ({ color, size }) => <Swords color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "JOURNAL",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "GUILD",
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "ME",
          tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
