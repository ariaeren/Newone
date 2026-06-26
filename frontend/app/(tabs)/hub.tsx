import { useEffect, useState, useCallback } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Zap, Sparkles, Rocket } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/api/auth-context";
import XpBar from "@/src/components/XpBar";
import StreakBadge from "@/src/components/StreakBadge";

export default function HubScreen() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [boostActive, setBoostActive] = useState(false);

  useEffect(() => {
    if (!user?.xp_boost_until) {
      setBoostActive(false);
      return;
    }
    const until = new Date(user.xp_boost_until).getTime();
    setBoostActive(until > Date.now());
  }, [user?.xp_boost_until]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>WELCOME BACK</Text>
            <Text style={styles.name}>@{user.username}</Text>
          </View>
          <StreakBadge count={user.streak_count} />
        </View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, user.is_pro && styles.avatarPro]}>
              <Text style={styles.avatarEmoji}>{user.avatar_emoji}</Text>
            </View>
            {user.is_pro && (
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.totalXp}>{user.total_xp.toLocaleString()} XP</Text>
          <Text style={styles.lifeStat}>LIFETIME EARNED</Text>
          <View style={{ marginTop: 18, width: "100%" }}>
            <XpBar level={user.level} currentXp={user.current_xp} xpToNext={user.xp_to_next} />
          </View>
        </Animated.View>

        {boostActive && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.boostCard} testID="boost-active-card">
            <Sparkles color={colors.bg} size={20} strokeWidth={3} />
            <View style={{ flex: 1 }}>
              <Text style={styles.boostTitle}>2× XP BOOST ACTIVE</Text>
              <Text style={styles.boostSub}>Every quest you complete doubles up</Text>
            </View>
          </Animated.View>
        )}

        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          <Pressable
            testID="quick-quests"
            onPress={() => router.push("/(tabs)/quests")}
            style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary }]}>
              <Zap color={colors.bg} size={20} strokeWidth={3} />
            </View>
            <Text style={styles.quickTitle}>Run quests</Text>
            <Text style={styles.quickSub}>Stack XP today</Text>
          </Pressable>
          <Pressable
            testID="quick-boost"
            onPress={() => router.push("/rewarded-ad")}
            style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.success }]}>
              <Rocket color={colors.bg} size={20} strokeWidth={3} />
            </View>
            <Text style={styles.quickTitle}>2× boost</Text>
            <Text style={styles.quickSub}>Watch & earn</Text>
          </Pressable>
        </View>

        <Pressable
          testID="goto-pro"
          onPress={() => router.push("/paywall")}
          style={({ pressed }) => [styles.proCard, pressed && { opacity: 0.9 }]}
        >
          <View>
            <Text style={styles.proCardKicker}>GUILD PRO</Text>
            <Text style={styles.proCardTitle}>Unlock neon cosmetics ✨</Text>
            <Text style={styles.proCardSub}>One-time IDR 49K · lifetime</Text>
          </View>
          <View style={styles.proCta}>
            <Text style={styles.proCtaText}>OPEN</Text>
          </View>
        </Pressable>

        <Text style={styles.sectionLabel}>STATS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.level}</Text>
            <Text style={styles.statLabel}>LEVEL</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success }]}>{user.streak_count}</Text>
            <Text style={styles.statLabel}>STREAK</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{user.current_xp}</Text>
            <Text style={styles.statLabel}>XP THIS LVL</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 120, paddingTop: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  name: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 2 },
  heroCard: {
    marginTop: 24,
    padding: spacing.card,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
  },
  avatarWrap: { alignItems: "center" },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderSubtle,
  },
  avatarPro: {
    borderColor: colors.premium,
    shadowColor: colors.premium,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarEmoji: { fontSize: 48 },
  proBadge: {
    position: "absolute",
    bottom: -6,
    backgroundColor: colors.premium,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  proText: { color: colors.bg, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  totalXp: { color: colors.primary, fontSize: 36, fontWeight: "900", marginTop: 16, letterSpacing: -1 },
  lifeStat: { color: colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  boostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.success,
    padding: 14,
    borderRadius: radius.card,
    marginTop: 16,
  },
  boostTitle: { color: colors.bg, fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  boostSub: { color: "rgba(0,0,0,0.7)", fontSize: 11, marginTop: 2, fontWeight: "600" },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: 28,
    marginBottom: 12,
  },
  quickRow: { flexDirection: "row", gap: 12 },
  quick: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  quickSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  proCard: {
    marginTop: 16,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.premium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.premium,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  proCardKicker: { color: colors.premium, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  proCardTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  proCardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  proCta: {
    backgroundColor: colors.premium,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  proCtaText: { color: colors.bg, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: { color: colors.text, fontSize: 28, fontWeight: "900" },
  statLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 4 },
});
