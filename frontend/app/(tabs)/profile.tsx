import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import {
  LogOut,
  Heart,
  Crown,
  Rocket,
  Settings,
  Trophy,
  ChevronRight,
} from "lucide-react-native";

import { colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/api/auth-context";
import { api } from "@/src/api/client";

const PRO_AVATARS = ["👾", "🤖", "🦾", "🧬", "🌌", "🪐"];
const FREE_AVATARS = ["🦄", "🐺", "🦊", "🐉", "🧠", "⚡"];

export default function ProfileScreen() {
  const { user, signOut, setUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const pickAvatar = async (emoji: string, requiresPro: boolean) => {
    if (requiresPro && !user.is_pro) {
      router.push("/paywall");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const u = await api.updateProfile({ avatar_emoji: emoji });
      setUser(u);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const supportDevs = () => {
    WebBrowser.openBrowserAsync("https://saweria.co/", {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>PROFILE</Text>

        <View style={styles.headerCard}>
          <View style={[styles.bigAvatar, user.is_pro && styles.bigAvatarPro]}>
            <Text style={styles.bigAvatarEmoji}>{user.avatar_emoji}</Text>
          </View>
          <Text style={styles.name}>@{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{user.level}</Text>
              <Text style={styles.statLabel}>LVL</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{user.total_xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: colors.success }]}>{user.streak_count}</Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>FREE AVATARS</Text>
        <View style={styles.avatarGrid}>
          {FREE_AVATARS.map((a) => (
            <Pressable
              key={a}
              testID={`avatar-free-${a}`}
              onPress={() => pickAvatar(a, false)}
              style={[
                styles.avatarChip,
                user.avatar_emoji === a && styles.avatarChipActive,
              ]}
            >
              <Text style={styles.avatarChipEmoji}>{a}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.proSection}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>
              NEON COSMETICS
            </Text>
            <View style={styles.proTagInline}>
              <Crown color={colors.bg} size={10} />
              <Text style={styles.proTagText}>PRO</Text>
            </View>
          </View>
          <View style={styles.avatarGrid}>
            {PRO_AVATARS.map((a) => (
              <Pressable
                key={a}
                testID={`avatar-pro-${a}`}
                onPress={() => pickAvatar(a, true)}
                style={[
                  styles.avatarChip,
                  styles.avatarChipPro,
                  user.avatar_emoji === a && styles.avatarChipActive,
                ]}
              >
                <Text style={styles.avatarChipEmoji}>{a}</Text>
                {!user.is_pro && (
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockText}>🔒</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {!user.is_pro && (
          <Pressable
            testID="profile-upgrade"
            onPress={() => router.push("/paywall")}
            style={({ pressed }) => [styles.upgradeCta, pressed && { opacity: 0.85 }]}
          >
            <Crown color={colors.bg} size={18} strokeWidth={3} />
            <Text style={styles.upgradeText}>Upgrade to Guild Pro</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <Row
          icon={<Heart color={colors.warning} size={20} />}
          title="Support the devs"
          subtitle="Tip on Saweria · keep the lights on"
          onPress={supportDevs}
          testID="support-devs"
        />
        <Row
          icon={<Rocket color={colors.success} size={20} />}
          title="Get a 2× XP boost"
          subtitle="Watch a short ad · 1 hour boost"
          onPress={() => router.push("/rewarded-ad")}
          testID="profile-rewarded-ad"
        />
        <Row
          icon={<Trophy color={colors.primary} size={20} />}
          title="View guild leaderboard"
          subtitle="See where you stand"
          onPress={() => router.push("/(tabs)/leaderboard")}
          testID="profile-leaderboard"
        />
        <Row
          icon={<Settings color={colors.textSecondary} size={20} />}
          title="Account info"
          subtitle={`Member since ${new Date(user.created_at).toLocaleDateString()}`}
          testID="profile-account"
        />

        <Pressable
          testID="signout-button"
          onPress={signOut}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.85 }]}
        >
          <LogOut color={colors.warning} size={18} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon, title, subtitle, onPress, testID,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <ChevronRight color={colors.textTertiary} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 140, paddingTop: 8 },
  kicker: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700", marginBottom: 12 },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 24,
    alignItems: "center",
  },
  bigAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2, borderColor: colors.borderSubtle,
    alignItems: "center", justifyContent: "center",
  },
  bigAvatarPro: {
    borderColor: colors.premium,
    shadowColor: colors.premium,
    shadowOpacity: 0.8, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  bigAvatarEmoji: { fontSize: 44 },
  name: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 12 },
  email: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  statRow: { flexDirection: "row", marginTop: 18, alignItems: "center", justifyContent: "space-around", width: "100%" },
  statCol: { alignItems: "center", flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.borderSubtle },
  statVal: { color: colors.text, fontSize: 22, fontWeight: "900" },
  statLabel: { color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: "700", marginTop: 4 },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 },
  proTagInline: {
    flexDirection: "row", gap: 4, alignItems: "center",
    backgroundColor: colors.premium,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  proTagText: { color: colors.bg, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  avatarChip: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSubtle,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarChipPro: { borderColor: "rgba(176, 38, 255, 0.35)" },
  avatarChipActive: { borderColor: colors.primary, backgroundColor: "rgba(0,229,255,0.1)" },
  avatarChipEmoji: { fontSize: 30 },
  lockOverlay: {
    position: "absolute", inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  lockText: { fontSize: 18 },
  proSection: {},
  upgradeCta: {
    flexDirection: "row", gap: 8,
    backgroundColor: colors.premium,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
    marginTop: 18,
  },
  upgradeText: { color: colors.bg, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.borderSubtle,
    padding: 16, marginBottom: 10,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  signOutBtn: {
    marginTop: 12,
    flexDirection: "row", gap: 8,
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  signOutText: { color: colors.warning, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
});
