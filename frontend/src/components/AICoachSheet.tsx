/**
 * AICoachSheet — bottom-sheet modal that asks for a goal and returns 5
 * AI-generated daily quests the user can accept individually or all at once.
 */
import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BlurView } from "expo-blur";
import { Sparkles, X, Check, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { colors, radius, spacing } from "@/src/theme";
import { api, AISuggestion } from "@/src/api/client";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAccepted?: (count: number) => void;
};

export default function AICoachSheet({ visible, onClose, onAccepted }: Props) {
  const { t, i18n } = useTranslation();
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const reset = () => {
    setGoal(""); setSuggestions([]); setPicked(new Set()); setError(null);
  };

  const close = () => { reset(); onClose(); };

  const generate = async () => {
    if (!goal.trim() || loading) return;
    setLoading(true); setError(null); setSuggestions([]); setPicked(new Set());
    try {
      const res = await api.aiCoach(goal.trim(), (i18n.language || "en").split("-")[0]);
      setSuggestions(res.suggestions);
      setPicked(new Set(res.suggestions.map((_, i) => i)));  // default pick all
      if (Platform.OS !== "web") {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
    } catch (e: any) {
      setError(e?.message || "AI coach failed");
    } finally { setLoading(false); }
  };

  const toggle = (i: number) => {
    const next = new Set(picked);
    if (next.has(i)) next.delete(i); else next.add(i);
    setPicked(next);
  };

  const accept = async () => {
    if (picked.size === 0 || accepting) return;
    setAccepting(true);
    try {
      const chosen = suggestions.filter((_, i) => picked.has(i));
      const res = await api.aiAccept(chosen);
      onAccepted?.(res.created.length);
      close();
    } catch (e: any) {
      setError(e?.message || "Could not save");
    } finally { setAccepting(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["bottom"]} style={styles.root} pointerEvents="box-none">
        <Pressable style={{ flex: 1 }} onPress={close} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Sparkles color={colors.primary} size={18} />
                <Text style={styles.title}>{t("ai.title")}</Text>
              </View>
              <Pressable testID="ai-coach-close" onPress={close} hitSlop={12}>
                <X color={colors.textSecondary} size={20} />
              </Pressable>
            </View>

            <Text style={styles.lead}>{t("ai.lead")}</Text>

            <TextInput
              testID="ai-goal-input"
              value={goal}
              onChangeText={setGoal}
              placeholder={t("ai.placeholder")}
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              multiline
              maxLength={240}
              editable={!loading}
            />

            {suggestions.length === 0 && (
              <Pressable
                testID="ai-generate"
                onPress={generate}
                disabled={loading || !goal.trim()}
                style={({ pressed }) => [styles.cta, (!goal.trim() || loading) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
              >
                {loading ? <ActivityIndicator color={colors.bg} /> : <Sparkles color={colors.bg} size={16} />}
                <Text style={styles.ctaText}>{loading ? t("ai.thinking") : t("ai.generate")}</Text>
              </Pressable>
            )}

            {suggestions.length > 0 && (
              <>
                <Text style={styles.suggestLabel}>{t("ai.pickQuests")}</Text>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {suggestions.map((s, i) => {
                    const on = picked.has(i);
                    return (
                      <Pressable
                        key={i}
                        testID={`ai-suggest-${i}`}
                        onPress={() => toggle(i)}
                        style={[styles.sRow, on && styles.sRowOn]}
                      >
                        <Text style={styles.sIcon}>{s.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sTitle} numberOfLines={2}>{s.title}</Text>
                          <Text style={styles.sMeta}>{s.difficulty.toUpperCase()} · +{s.xp_reward} XP · {s.category}</Text>
                        </View>
                        <View style={[styles.sCheck, on && styles.sCheckOn]}>
                          {on ? <Check color={colors.bg} size={14} strokeWidth={3} /> : <Plus color={colors.textSecondary} size={14} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable
                  testID="ai-accept"
                  onPress={accept}
                  disabled={picked.size === 0 || accepting}
                  style={({ pressed }) => [styles.cta, picked.size === 0 && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
                >
                  {accepting ? <ActivityIndicator color={colors.bg} /> : <Check color={colors.bg} size={16} strokeWidth={3} />}
                  <Text style={styles.ctaText}>{accepting ? t("ai.adding") : t("ai.addToQuests", { n: picked.size })}</Text>
                </Pressable>
                <Pressable testID="ai-regen" onPress={() => { setSuggestions([]); }} style={styles.regen}>
                  <Text style={styles.regenText}>↻ {t("ai.regenerate")}</Text>
                </Pressable>
              </>
            )}

            {error && <Text style={styles.err}>{error}</Text>}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: spacing.screen, paddingTop: 12, paddingBottom: 24,
    borderTopWidth: 1, borderColor: colors.borderSubtle,
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.textTertiary, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 1.5 },
  lead: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  input: { backgroundColor: colors.surfaceElevated, borderRadius: radius.input, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15, minHeight: 76, textAlignVertical: "top" },
  cta: { marginTop: 14, flexDirection: "row", gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  ctaText: { color: colors.bg, fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  suggestLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  sRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.input, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceElevated, marginBottom: 8 },
  sRowOn: { borderColor: colors.primary, backgroundColor: "rgba(0,229,255,0.07)" },
  sIcon: { fontSize: 24, width: 32, textAlign: "center" },
  sTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  sMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2, fontWeight: "600" },
  sCheck: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  sCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  regen: { alignSelf: "center", paddingVertical: 10 },
  regenText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  err: { color: colors.warning, fontSize: 12, marginTop: 8, textAlign: "center" },
});
