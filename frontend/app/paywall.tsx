import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Check, Crown, Sparkles, X } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/api/auth-context";

const FEATURES = [
  { icon: "👾", title: "Neon avatar cosmetics", sub: "Cyber, glitch, hologram drops" },
  { icon: "🌌", title: "Premium guild badge", sub: "Glow on the leaderboard" },
  { icon: "⚡", title: "Bonus XP multipliers", sub: "Stack with rewarded ads" },
  { icon: "🚫", title: "Zero ads, forever", sub: "Pure focus mode" },
];

// Pseudo-QR pattern: deterministic 21x21 boolean grid derived from string.
function buildQrMatrix(str: string, size = 21): boolean[][] {
  let seed = 0;
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return ((seed >>> 0) % 1000) / 1000;
  };
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => rand() > 0.5),
  );
  // finder patterns (corners)
  const setFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const edge = i === 0 || i === 6 || j === 0 || j === 6;
        const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        grid[r + i][c + j] = edge || inner;
      }
    }
    // clear surroundings
    for (let i = -1; i < 8; i++) {
      for (let j = -1; j < 8; j++) {
        const rr = r + i, cc = c + j;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        if (i === -1 || i === 7 || j === -1 || j === 7) grid[rr][cc] = false;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);
  return grid;
}

export default function Paywall() {
  const router = useRouter();
  const { setUser, user } = useAuth();
  const [info, setInfo] = useState<{ qris_string: string; amount_idr: number; label: string; merchant: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.qrisInfo();
      setInfo(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmPayment = useCallback(async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const res = await api.activatePro();
      setUser(res.user);
      setConfirmed(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => router.back(), 1400);
    } catch {
      // ignore
    } finally {
      setConfirming(false);
    }
  }, [confirming, setUser, router]);

  const qrSize = 200;
  const cellSize = 9; // 21*9 = 189 + padding

  const grid = info ? buildQrMatrix(info.qris_string) : null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="paywall-close" onPress={() => router.back()} style={styles.closeBtn}>
          <X color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.kicker}>GUILD PRO</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.crownWrap}>
            <Crown color={colors.bg} size={36} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>
            Unlock the{"\n"}
            <Text style={{ color: colors.premium }}>neon tier.</Text>
          </Text>
          <Text style={styles.sub}>One-time payment · lifetime access · no recurring vibes.</Text>
        </Animated.View>

        <View style={styles.features}>
          {FEATURES.map((f, idx) => (
            <Animated.View
              key={f.title}
              entering={FadeInDown.delay(100 + idx * 80).duration(400)}
              style={styles.featureRow}
            >
              <Text style={styles.featureEmoji}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
              <Check color={colors.success} size={18} strokeWidth={3} />
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.qrisCard}>
          <View style={styles.qrisHeader}>
            <View>
              <Text style={styles.qrisLabel}>SCAN TO PAY (QRIS)</Text>
              <Text style={styles.qrisAmount}>
                IDR {info?.amount_idr.toLocaleString() ?? "—"}
              </Text>
            </View>
            <Sparkles color={colors.premium} size={20} />
          </View>

          <View style={styles.qrFrame}>
            {loading || !grid ? (
              <View style={[styles.qrPlaceholder, { width: qrSize, height: qrSize }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View
                testID="qris-grid"
                style={{
                  width: 21 * cellSize,
                  height: 21 * cellSize,
                  flexDirection: "column",
                }}
              >
                {grid.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: "row" }}>
                    {row.map((on, ci) => (
                      <View
                        key={`${ri}-${ci}`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: on ? colors.bg : "transparent",
                        }}
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
            <View style={styles.qrCenterBadge}>
              <Crown color={colors.bg} size={18} strokeWidth={3} />
            </View>
          </View>

          <Text style={styles.merchant}>
            {info?.merchant ?? "Cyber-Chill Guild"} · {info?.label ?? "Lifetime"}
          </Text>
          <Text style={styles.note}>
            Scan with any QRIS-supported e-wallet (GoPay, OVO, DANA, ShopeePay)
          </Text>
        </Animated.View>

        {user?.is_pro ? (
          <View style={styles.activeBanner} testID="pro-already">
            <Check color={colors.bg} size={18} strokeWidth={3} />
            <Text style={styles.activeBannerText}>You&apos;re already Pro 👑</Text>
          </View>
        ) : (
          <Pressable
            testID="confirm-payment"
            onPress={confirmPayment}
            disabled={confirming || confirmed}
            style={({ pressed }) => [
              styles.confirmBtn,
              (confirming || confirmed) && { opacity: 0.7 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.confirmText}>
              {confirmed ? "✓ Payment confirmed" : confirming ? "..." : "I've paid · Unlock Pro"}
            </Text>
          </Pressable>
        )}

        <Pressable testID="back-link" onPress={() => router.back()} style={styles.backLink}>
          <ArrowLeft color={colors.textSecondary} size={16} />
          <Text style={styles.backLinkText}>Maybe later</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.screen, paddingVertical: 12,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSubtle,
    alignItems: "center", justifyContent: "center",
  },
  kicker: { color: colors.premium, fontSize: 12, fontWeight: "900", letterSpacing: 3 },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 40 },
  crownWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: colors.premium,
    alignItems: "center", justifyContent: "center",
    marginTop: 12,
    shadowColor: colors.premium, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
  },
  title: { color: colors.text, fontSize: 44, fontWeight: "900", letterSpacing: -1.5, lineHeight: 48, marginTop: 18 },
  sub: { color: colors.textSecondary, fontSize: 14, marginTop: 12, lineHeight: 20 },
  features: { marginTop: 24, gap: 10 },
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderSubtle,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  featureEmoji: { fontSize: 26 },
  featureTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  featureSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  qrisCard: {
    marginTop: 24,
    backgroundColor: colors.text,
    borderRadius: radius.card,
    padding: 20,
    alignItems: "center",
  },
  qrisHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  qrisLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  qrisAmount: { color: colors.bg, fontSize: 24, fontWeight: "900", marginTop: 4 },
  qrFrame: {
    backgroundColor: colors.text,
    padding: 12,
    borderRadius: 16,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholder: { alignItems: "center", justifyContent: "center" },
  qrCenterBadge: {
    position: "absolute",
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.premium,
    alignItems: "center", justifyContent: "center",
    borderWidth: 4, borderColor: colors.text,
  },
  merchant: { color: colors.bg, fontSize: 13, fontWeight: "800", marginTop: 14 },
  note: { color: colors.textTertiary, fontSize: 11, marginTop: 4, textAlign: "center" },
  confirmBtn: {
    marginTop: 20,
    backgroundColor: colors.premium,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  confirmText: { color: colors.bg, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  activeBanner: {
    marginTop: 20,
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  activeBannerText: { color: colors.bg, fontSize: 15, fontWeight: "900" },
  backLink: {
    flexDirection: "row", gap: 6,
    marginTop: 16, alignSelf: "center",
    paddingVertical: 8,
  },
  backLinkText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
});
