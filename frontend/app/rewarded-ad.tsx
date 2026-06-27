import { useEffect, useState, useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Rocket, X, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/api/auth-context";

const AD_LENGTH = 5;

export default function RewardedAdScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useAuth();
  const [count, setCount] = useState(AD_LENGTH);
  const [phase, setPhase] = useState<"playing" | "ready" | "claimed">("playing");

  useEffect(() => {
    if (count <= 0) {
      setPhase("ready");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 600, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const claim = useCallback(async () => {
    try {
      const res = await api.activateXpBoost();
      setUser(res.user);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPhase("claimed");
      setTimeout(() => router.back(), 1300);
    } catch {
      router.back();
    }
  }, [setUser, router]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Mock ad viewport */}
      <View style={styles.adWindow}>
        <View style={styles.adMockHeader}>
          <Text style={styles.adMockLabel}>{t("rewardedAd.sponsored")}</Text>
          {phase === "playing" && (
            <View style={styles.timerPill}>
              <Text style={styles.timerText}>{t("rewardedAd.skipIn", { s: count })}</Text>
            </View>
          )}
          {phase !== "playing" && (
            <Pressable testID="ad-close" onPress={() => router.back()} style={styles.timerPill}>
              <X color={colors.text} size={16} />
            </Pressable>
          )}
        </View>

        <View style={styles.adBody}>
          <Animated.View style={[styles.adIcon, pulseStyle]}>
            <Rocket color={colors.bg} size={56} strokeWidth={2} />
          </Animated.View>
          <Text style={styles.adTitle}>{t("rewardedAd.boostInc")}</Text>
          <Text style={styles.adSub}>
            {t("rewardedAd.demoNote")}
          </Text>
        </View>
      </View>

      <View style={styles.bottomCard}>
        {phase === "playing" && (
          <>
            <Text style={styles.cardKicker}>{t("rewardedAd.watching")}</Text>
            <Text style={styles.cardTitle}>{t("rewardedAd.incoming")}</Text>
            <Text style={styles.cardSub}>
              {t("rewardedAd.incomingSub", { s: count })}
            </Text>
          </>
        )}
        {phase === "ready" && (
          <>
            <View style={styles.successBadge}>
              <Sparkles color={colors.bg} size={20} strokeWidth={3} />
            </View>
            <Text style={styles.cardKicker}>{t("rewardedAd.complete")}</Text>
            <Text style={styles.cardTitle}>{t("rewardedAd.claimTitle")}</Text>
            <Pressable
              testID="claim-boost"
              onPress={claim}
              style={({ pressed }) => [styles.claimBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.claimText}>{t("rewardedAd.claimBtn")}</Text>
            </Pressable>
          </>
        )}
        {phase === "claimed" && (
          <>
            <View style={[styles.successBadge, { backgroundColor: colors.success }]}>
              <Sparkles color={colors.bg} size={20} strokeWidth={3} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.success }]} testID="boost-claimed">
              {t("rewardedAd.claimed")}
            </Text>
            <Text style={styles.cardSub}>{t("rewardedAd.claimedSub")}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.screen },
  adWindow: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  adMockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  adMockLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 2, fontWeight: "900" },
  timerPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  adBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  adIcon: {
    width: 140, height: 140, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  adTitle: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: 2, marginTop: 24 },
  adSub: { color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 18 },
  bottomCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 20,
    alignItems: "center",
  },
  cardKicker: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "800" },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 6, textAlign: "center" },
  cardSub: { color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: "center" },
  successBadge: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  claimBtn: {
    marginTop: 16,
    backgroundColor: colors.success,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  claimText: { color: colors.bg, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
});
