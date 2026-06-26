import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Zap, ArrowRight } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/api/auth-context";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (loading) return;
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Email and password required");
      return;
    }
    if (mode === "signup" && !username.trim()) {
      setError("Pick a username");
      return;
    }
    setLoading(true);
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      if (mode === "login") {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        await signUp(email.trim().toLowerCase(), password, username.trim());
      }
      router.replace("/(tabs)/hub");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(400)} style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Zap color={colors.bg} size={20} strokeWidth={3} />
            </View>
            <Text style={styles.brandText}>CYBER·CHILL</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text style={styles.headline}>
              Level{"\n"}up{" "}
              <Text style={{ color: colors.primary }}>IRL.</Text>
            </Text>
            <Text style={styles.sub}>
              Turn habits into XP. Stack streaks. Climb the guild.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.tabs}>
            <Pressable
              testID="auth-tab-login"
              onPress={() => setMode("login")}
              style={[styles.tab, mode === "login" && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
                Log in
              </Text>
            </Pressable>
            <Pressable
              testID="auth-tab-signup"
              onPress={() => setMode("signup")}
              style={[styles.tab, mode === "signup" && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                Sign up
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.form}>
            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={styles.label}>USERNAME</Text>
                <TextInput
                  testID="auth-username-input"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="neon_runner"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                testID="auth-email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="you@cyber.chill"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                testID="auth-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                style={styles.input}
              />
            </View>

            {error && (
              <Text testID="auth-error" style={styles.error}>
                {error}
              </Text>
            )}

            <Pressable
              testID="auth-submit-button"
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                styles.cta,
                { opacity: loading || pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.ctaText}>
                {loading ? "..." : mode === "login" ? "Enter the Grid" : "Join the Guild"}
              </Text>
              <ArrowRight color={colors.bg} size={18} strokeWidth={3} />
            </Pressable>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing you agree to the vibes. No spam, ever.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 32, flexGrow: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 3,
  },
  headline: {
    color: colors.text,
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 60,
    marginTop: 48,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
    lineHeight: 22,
  },
  tabs: {
    flexDirection: "row",
    marginTop: 40,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.text },
  tabText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.bg },
  form: { marginTop: 24 },
  field: { marginBottom: 16 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.text,
    fontSize: 16,
  },
  error: {
    color: colors.warning,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
  },
  cta: {
    marginTop: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: radius.pill,
  },
  ctaText: { color: colors.bg, fontSize: 16, fontWeight: "800" },
  footer: { marginTop: 24, alignItems: "center" },
  footerText: { color: colors.textTertiary, fontSize: 12 },
});
