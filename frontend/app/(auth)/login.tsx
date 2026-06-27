import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/api/auth-context";
import { t } from "@/src/i18n";
import GryndMark from "@/src/components/GryndMark";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAppleHint, setShowAppleHint] = useState(false);

  const handleGoogle = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const u = await signInWithGoogle();
      if (u) router.replace("/(tabs)/hub");
    } catch (e: any) {
      setError(e?.message || t.auth.googleError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.brandRow}>
          <GryndMark size={36} glow />
          <Text style={styles.brandText}>{t.brand.name}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <Text style={styles.headline}>
            Naik Level{"\n"}
            <Text style={{ color: colors.primary }}>IRL.</Text>
          </Text>
          <Text style={styles.sub}>{t.auth.sub}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.socialBlock}>
          <Pressable
            testID="google-signin-button"
            onPress={handleGoogle}
            disabled={loading}
            style={({ pressed }) => [styles.googleBtn, (loading || pressed) && { opacity: 0.85 }]}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleText}>
              {loading ? t.auth.loadingSignIn : t.auth.continueGoogle}
            </Text>
          </Pressable>

          <Pressable
            testID="apple-coming-soon"
            onPress={() => setShowAppleHint(!showAppleHint)}
            style={styles.appleSoon}
          >
            <Text style={styles.appleLogo}></Text>
            <Text style={styles.appleSoonText}>{t.auth.continueApple}</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>{t.auth.comingSoon}</Text>
            </View>
          </Pressable>
          {showAppleHint && (
            <Text style={styles.appleHint}>{t.auth.appleSoonHint}</Text>
          )}
        </Animated.View>

        {error && (
          <Text testID="auth-error" style={styles.error}>
            {error}
          </Text>
        )}

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.footer}>
          <Text style={styles.footerText}>{t.auth.terms}</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 32, flexGrow: 1, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 },
  brandText: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 5 },
  headline: {
    color: colors.text,
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 56,
    marginTop: 48,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 16,
    lineHeight: 22,
  },
  socialBlock: { marginTop: 40, gap: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.text,
    paddingVertical: 18,
    borderRadius: radius.pill,
  },
  googleIcon: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },
  googleG: { fontSize: 16, fontWeight: "900", color: "#4285F4", lineHeight: 18 },
  googleText: { color: colors.bg, fontSize: 15, fontWeight: "800" },
  appleSoon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 18,
    borderRadius: radius.pill,
  },
  appleLogo: { color: colors.textSecondary, fontSize: 18, marginTop: -2 },
  appleSoonText: { color: colors.textSecondary, fontSize: 15, fontWeight: "700" },
  soonBadge: {
    backgroundColor: colors.premium,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginLeft: 4,
  },
  soonBadgeText: { color: colors.bg, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  appleHint: { color: colors.textSecondary, fontSize: 12, textAlign: "center", marginTop: 4, paddingHorizontal: 16, lineHeight: 18 },
  error: { color: colors.warning, fontSize: 13, marginTop: 16, textAlign: "center" },
  footer: { marginTop: 32, alignItems: "center" },
  footerText: { color: colors.textTertiary, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
