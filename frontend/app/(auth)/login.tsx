import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react-native";

import { colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/api/auth-context";
import GryndMark from "@/src/components/GryndMark";
import LanguagePicker from "@/src/components/LanguagePicker";
import { LANGUAGES, currentLanguage } from "@/src/i18n";

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { signInWithGoogle, signIn, signUp } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAppleHint, setShowAppleHint] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Email/password fallback (works without Google OAuth setup)
  const [mode, setMode] = useState<"google" | "email">("google");
  const [emailKind, setEmailKind] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const currentLang = LANGUAGES.find((l) => l.code === (i18n.language?.split("-")[0] || currentLanguage())) || LANGUAGES[0];

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
      setError(e?.message || t("auth.googleError"));
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (emailKind === "signup") {
        await signUp(email.trim(), password, username.trim() || email.split("@")[0]);
      } else {
        await signIn(email.trim(), password);
      }
      router.replace("/(tabs)/hub");
    } catch (e: any) {
      setError(e?.message || "Auth failed");
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
          <Text style={styles.brandText}>{t("brand.name")}</Text>
          <View style={{ flex: 1 }} />
          <Pressable
            testID="open-language-picker"
            onPress={() => setLangOpen(true)}
            style={({ pressed }) => [styles.langBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.langFlag}>{currentLang.flag}</Text>
            <Globe color={colors.textSecondary} size={14} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <Text style={styles.headline}>
            {t("auth.headlineLine1")}{"\n"}
            <Text style={{ color: colors.primary }}>{t("auth.headlineLine2")}</Text>
          </Text>
          <Text style={styles.sub}>{t("auth.sub")}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.socialBlock}>
          {mode === "google" && (
            <>
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
                  {loading ? t("auth.loadingSignIn") : t("auth.continueGoogle")}
                </Text>
              </Pressable>

              <Pressable
                testID="apple-coming-soon"
                onPress={() => setShowAppleHint(!showAppleHint)}
                style={styles.appleSoon}
              >
                <Text style={styles.appleLogo}></Text>
                <Text style={styles.appleSoonText}>{t("auth.continueApple")}</Text>
                <View style={styles.soonBadge}>
                  <Text style={styles.soonBadgeText}>{t("auth.comingSoon")}</Text>
                </View>
              </Pressable>
              {showAppleHint && (
                <Text style={styles.appleHint}>{t("auth.appleSoonHint")}</Text>
              )}

              <Pressable testID="switch-email" onPress={() => setMode("email")} style={styles.switchBtn}>
                <Text style={styles.switchText}>· {t("auth.or")} · Email</Text>
              </Pressable>
            </>
          )}

          {mode === "email" && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.tabRow}>
                <Pressable
                  testID="email-mode-login"
                  onPress={() => setEmailKind("login")}
                  style={[styles.tabBtn, emailKind === "login" && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, emailKind === "login" && styles.tabBtnTextActive]}>Login</Text>
                </Pressable>
                <Pressable
                  testID="email-mode-signup"
                  onPress={() => setEmailKind("signup")}
                  style={[styles.tabBtn, emailKind === "signup" && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, emailKind === "signup" && styles.tabBtnTextActive]}>Sign up</Text>
                </Pressable>
              </View>

              {emailKind === "signup" && (
                <TextInput
                  testID="signup-username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="username"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  style={styles.input}
                />
              )}
              <TextInput
                testID="email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="email"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                testID="password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                style={styles.input}
              />
              <Pressable
                testID="email-submit"
                onPress={handleEmail}
                disabled={loading || !email || !password}
                style={({ pressed }) => [styles.submitBtn, (loading || !email || !password) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.submitText}>{loading ? t("auth.loadingSignIn") : (emailKind === "login" ? "Login" : "Sign up")}</Text>
              </Pressable>
              <Pressable testID="switch-google" onPress={() => setMode("google")} style={styles.switchBtn}>
                <Text style={styles.switchText}>← Google</Text>
              </Pressable>
            </KeyboardAvoidingView>
          )}
        </Animated.View>

        {error && (
          <Text testID="auth-error" style={styles.error}>
            {error}
          </Text>
        )}

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.footer}>
          <Text style={styles.footerText}>{t("auth.terms")}</Text>
        </Animated.View>
      </ScrollView>

      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 32, flexGrow: 1, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 },
  brandText: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 5 },
  langBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
  },
  langFlag: { fontSize: 16 },
  headline: { color: colors.text, fontSize: 52, fontWeight: "900", letterSpacing: -2, lineHeight: 56, marginTop: 48 },
  sub: { color: colors.textSecondary, fontSize: 15, marginTop: 16, lineHeight: 22 },
  socialBlock: { marginTop: 40, gap: 12 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.text, paddingVertical: 18, borderRadius: radius.pill },
  googleIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  googleG: { fontSize: 16, fontWeight: "900", color: "#4285F4", lineHeight: 18 },
  googleText: { color: colors.bg, fontSize: 15, fontWeight: "800" },
  appleSoon: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, paddingVertical: 18, borderRadius: radius.pill },
  appleLogo: { color: colors.textSecondary, fontSize: 18, marginTop: -2 },
  appleSoonText: { color: colors.textSecondary, fontSize: 15, fontWeight: "700" },
  soonBadge: { backgroundColor: colors.premium, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, marginLeft: 4 },
  soonBadgeText: { color: colors.bg, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  appleHint: { color: colors.textSecondary, fontSize: 12, textAlign: "center", marginTop: 4, paddingHorizontal: 16, lineHeight: 18 },
  switchBtn: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 12 },
  switchText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  tabBtnTextActive: { color: colors.bg },
  input: { backgroundColor: colors.surface, borderRadius: radius.input, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15, marginBottom: 10 },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.pill, alignItems: "center", marginTop: 4 },
  submitText: { color: colors.bg, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  error: { color: colors.warning, fontSize: 13, marginTop: 16, textAlign: "center" },
  footer: { marginTop: 32, alignItems: "center" },
  footerText: { color: colors.textTertiary, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
