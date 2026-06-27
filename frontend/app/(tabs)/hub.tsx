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
import { Zap, Sparkles, Rocket, Share2, Brain } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/api/auth-context";
import XpBar from "@/src/components/XpBar";
import StreakBadge from "@/src/components/StreakBadge";
import ShareSheet from "@/src/components/ShareSheet";
import ShareCard from "@/src/components/ShareCard";
import AICoachSheet from "@/src/components/AICoachSheet";
import Cyberpet from "@/src/components/Cyberpet";
import { buildInviteUrl } from "@/src/utils/share";

type ShareKind = "level" | "streak" | null;

export default function HubScreen() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [shareKind, setShareKind] = useState<ShareKind>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (!user?.xp_boost_until) { setBoostActive(false); return; }
    const until = new Date(user.xp_boost_until).getTime();
    setBoostActive(until > Date.now());
  }, [user?.xp_boost_until]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!user) return null;

  const inviteUrl = buildInviteUrl(user.username);
  const sharePayload = shareKind === "level"
    ? {
        title: t("share.level.title", { level: user.level }),
        body: t("share.level.body", { level: user.level, xp: user.total_xp }),
        url: inviteUrl,
        hashtags: t("share.level.hashtags"),
      }
    : shareKind === "streak"
    ? {
        title: t("share.streak.title", { streak: user.streak_count }),
        body: t("share.streak.body", { streak: user.streak_count }),
        url: inviteUrl,
        hashtags: t("share.streak.hashtags"),
      }
    : { title: "", body: "" };

  const preview = shareKind === "level" ? (
    <ShareCard variant="level" username={user.username} avatar={user.avatar_emoji} primary={user.level} secondary={`${user.total_xp.toLocaleString()} XP`} />
  ) : shareKind === "streak" ? (
    <ShareCard variant="streak" username={user.username} avatar={user.avatar_emoji} primary={`${user.streak_count} days`} secondary={t("hub.streakLabel")} />
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>{t("hub.kicker")}</Text>
            <Text style={styles.name}>@{user.username}</Text>
          </View>
          <Pressable testID="share-streak" onPress={() => setShareKind("streak")}>
            <StreakBadge count={user.streak_count} />
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.heroCard}>
          <Cyberpet stage={user.pet_stage || "egg"} size={88} showLabel testID="hub-cyberpet" />
          {user.is_pro && (
            <View style={styles.proBadgeTop}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
          <Text style={styles.totalXp}>{user.total_xp.toLocaleString()} XP</Text>
          <Text style={styles.lifeStat}>{t("hub.lifetimeEarned")}</Text>
          <View style={{ marginTop: 18, width: "100%" }}>
            <XpBar level={user.level} currentXp={user.current_xp} xpToNext={user.xp_to_next} />
          </View>

          {!!(user.shields && user.shields > 0) && (
            <View testID="shield-pill" style={styles.shieldPill}>
              <Text style={styles.shieldEmoji}>🛡️</Text>
              <Text style={styles.shieldText}>{user.shields} {t("shield.label")}</Text>
            </View>
          )}

          <Pressable
            testID="share-level"
            onPress={() => setShareKind("level")}
            style={({ pressed }) => [styles.shareLevelBtn, pressed && { opacity: 0.85 }]}
          >
            <Share2 color={colors.primary} size={14} />
            <Text style={styles.shareLevelText}>{t("hub.shareLevel")}</Text>
          </Pressable>
        </Animated.View>

        {/* AI Coach card */}
        <Pressable
          testID="open-ai-coach"
          onPress={() => setAiOpen(true)}
          style={({ pressed }) => [styles.aiCard, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.aiIconBubble}>
            <Brain color={colors.bg} size={20} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiKicker}>{t("ai.title")}</Text>
            <Text style={styles.aiTitle}>{t("ai.lead")}</Text>
          </View>
          <Sparkles color={colors.primary} size={18} />
        </Pressable>

        {boostActive && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.boostCard} testID="boost-active-card">
            <Sparkles color={colors.bg} size={20} strokeWidth={3} />
            <View style={{ flex: 1 }}>
              <Text style={styles.boostTitle}>{t("hub.boostActive")}</Text>
              <Text style={styles.boostSub}>{t("hub.boostActiveSub")}</Text>
            </View>
          </Animated.View>
        )}

        <Text style={styles.sectionLabel}>{t("hub.quickActions")}</Text>
        <View style={styles.quickRow}>
          <Pressable testID="quick-quests" onPress={() => router.push("/(tabs)/quests")} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}>
            <View style={[styles.quickIcon, { backgroundColor: colors.primary }]}>
              <Zap color={colors.bg} size={20} strokeWidth={3} />
            </View>
            <Text style={styles.quickTitle}>{t("hub.runQuests")}</Text>
            <Text style={styles.quickSub}>{t("hub.runQuestsSub")}</Text>
          </Pressable>
          <Pressable testID="quick-boost" onPress={() => router.push("/rewarded-ad")} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}>
            <View style={[styles.quickIcon, { backgroundColor: colors.success }]}>
              <Rocket color={colors.bg} size={20} strokeWidth={3} />
            </View>
            <Text style={styles.quickTitle}>{t("hub.boost")}</Text>
            <Text style={styles.quickSub}>{t("hub.boostSub")}</Text>
          </Pressable>
        </View>

        <Pressable testID="goto-pro" onPress={() => router.push("/paywall")} style={({ pressed }) => [styles.proCard, pressed && { opacity: 0.9 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.proCardKicker}>{t("hub.proKicker")}</Text>
            <Text style={styles.proCardTitle}>{t("hub.proTitle")}</Text>
            <Text style={styles.proCardSub}>{t("hub.proSub")}</Text>
          </View>
          <View style={styles.proCta}>
            <Text style={styles.proCtaText}>{t("hub.proCta")}</Text>
          </View>
        </Pressable>

        <Text style={styles.sectionLabel}>{t("hub.stats")}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.level}</Text>
            <Text style={styles.statLabel}>{t("hub.level")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success }]}>{user.streak_count}</Text>
            <Text style={styles.statLabel}>{t("hub.streak")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{user.current_xp}</Text>
            <Text style={styles.statLabel}>{t("hub.xpThisLvl")}</Text>
          </View>
        </View>
      </ScrollView>

      <AICoachSheet
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        onAccepted={() => { refresh(); }}
      />

      <ShareSheet
        visible={shareKind !== null}
        onClose={() => setShareKind(null)}
        payload={sharePayload}
        preview={preview}
        testIDPrefix={`share-${shareKind || "x"}`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 120, paddingTop: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  name: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 2 },
  heroCard: { marginTop: 24, padding: spacing.card, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: "center" },
  proBadgeTop: { position: "absolute", top: 16, right: 16, backgroundColor: colors.premium, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  proText: { color: colors.bg, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  shieldPill: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "rgba(57,255,20,0.08)", borderWidth: 1, borderColor: colors.success },
  shieldEmoji: { fontSize: 14 },
  shieldText: { color: colors.success, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  aiCard: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderActive },
  aiIconBubble: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  aiKicker: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  aiTitle: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 3, lineHeight: 17 },
  totalXp: { color: colors.primary, fontSize: 36, fontWeight: "900", marginTop: 16, letterSpacing: -1 },
  lifeStat: { color: colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  shareLevelBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: "rgba(0,229,255,0.08)" },
  shareLevelText: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  boostCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.success, padding: 14, borderRadius: radius.card, marginTop: 16 },
  boostTitle: { color: colors.bg, fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  boostSub: { color: "rgba(0,0,0,0.7)", fontSize: 11, marginTop: 2, fontWeight: "600" },
  sectionLabel: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "800", marginTop: 28, marginBottom: 12 },
  quickRow: { flexDirection: "row", gap: 12 },
  quick: { flex: 1, padding: 16, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderSubtle },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  quickTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  quickSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  proCard: { marginTop: 16, padding: 18, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.premium, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: colors.premium, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  proCardKicker: { color: colors.premium, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  proCardTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  proCardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  proCta: { backgroundColor: colors.premium, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  proCtaText: { color: colors.bg, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: { flex: 1, padding: 16, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderSubtle },
  statValue: { color: colors.text, fontSize: 28, fontWeight: "900" },
  statLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 4 },
});
