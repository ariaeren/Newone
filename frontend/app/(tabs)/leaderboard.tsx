import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Trophy } from "lucide-react-native";

import { colors, radius, spacing } from "@/src/theme";
import { api, LeaderRow } from "@/src/api/client";

export default function LeaderboardScreen() {
  const [top, setTop] = useState<LeaderRow[]>([]);
  const [me, setMe] = useState<LeaderRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.leaderboard();
      setTop(res.top);
      setMe(res.me);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>GUILD RANKINGS</Text>
          <Text style={styles.title}>Top runners 🏆</Text>
        </View>
        <View style={styles.trophyBubble}>
          <Trophy color={colors.warning} size={24} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {top.length === 0 && (
          <Text style={styles.empty}>No runners yet. Be the first to drop XP.</Text>
        )}
        {top.map((r, idx) => (
          <Animated.View
            key={r.id}
            entering={FadeInDown.delay(idx * 25).duration(300)}
            style={[styles.row, r.is_me && styles.rowMe]}
            testID={`leader-row-${r.rank}`}
          >
            <View style={styles.rankBlock}>
              {r.rank <= 3 ? (
                <Text style={[styles.rankMedal, rankColor(r.rank)]}>
                  {["🥇", "🥈", "🥉"][r.rank - 1]}
                </Text>
              ) : (
                <Text style={styles.rankText}>#{r.rank}</Text>
              )}
            </View>
            <View style={[styles.avatar, r.is_pro && styles.avatarPro]}>
              <Text style={styles.avatarEmoji}>{r.avatar_emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.is_me ? "You" : `@${r.username}`}
                </Text>
                {r.is_pro && (
                  <View style={styles.pro}>
                    <Text style={styles.proText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.lvl}>LVL {r.level}</Text>
            </View>
            <Text style={styles.xp}>{r.total_xp.toLocaleString()}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      {me && (
        <View testID="me-rank-row" style={styles.meSticky}>
          <Text style={styles.meKicker}>YOUR RANK</Text>
          <Text style={styles.meRank}>#{me.rank}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.meXp}>{me.total_xp.toLocaleString()} XP</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function rankColor(rank: number) {
  if (rank === 1) return { color: "#FFD700" };
  if (rank === 2) return { color: "#C0C0C0" };
  return { color: "#CD7F32" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingVertical: 16,
  },
  kicker: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 2 },
  trophyBubble: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSubtle,
    alignItems: "center", justifyContent: "center",
  },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 200, paddingTop: 4 },
  empty: { color: colors.textSecondary, textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    marginBottom: 10,
  },
  rowMe: { borderColor: colors.primary, backgroundColor: "rgba(0,229,255,0.05)" },
  rankBlock: { width: 38, alignItems: "center" },
  rankMedal: { fontSize: 24 },
  rankText: { color: colors.textSecondary, fontSize: 14, fontWeight: "800" },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.borderSubtle,
    alignItems: "center", justifyContent: "center",
  },
  avatarPro: { borderColor: colors.premium },
  avatarEmoji: { fontSize: 22 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: colors.text, fontSize: 15, fontWeight: "800" },
  pro: {
    backgroundColor: colors.premium,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  proText: { color: colors.bg, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  lvl: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", marginTop: 2 },
  xp: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  meSticky: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  meKicker: { color: colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  meRank: { color: colors.text, fontSize: 22, fontWeight: "900" },
  meXp: { color: colors.primary, fontSize: 14, fontWeight: "800" },
});
