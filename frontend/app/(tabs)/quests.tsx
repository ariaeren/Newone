import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Plus, X } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { colors, radius, spacing } from "@/src/theme";
import { api, Quest } from "@/src/api/client";
import { useAuth } from "@/src/api/auth-context";
import { t } from "@/src/i18n";
import SwipeQuestCard from "@/src/components/SwipeQuestCard";
import ParticleBurst from "@/src/components/ParticleBurst";
import LevelUpSheet from "@/src/components/LevelUpSheet";

const QUEST_ICONS = ["⚡", "💧", "📚", "🏃", "🧘", "🍎", "🎯", "🎮", "💪", "🌙", "☀️", "🧠", "📵", "🎨"];
type DiffKey = "trivial" | "easy" | "medium" | "hard";
const DIFFICULTIES: { key: DiffKey; label: string; xp: number; color: string }[] = [
  { key: "trivial", label: "Sepele", xp: 10, color: colors.textTertiary },
  { key: "easy", label: "Mudah", xp: 20, color: colors.success },
  { key: "medium", label: "Sedang", xp: 40, color: colors.primary },
  { key: "hard", label: "Sulit", xp: 75, color: colors.premium },
];

export default function QuestsScreen() {
  const { setUser } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [burstVisible, setBurstVisible] = useState(false);
  const [burstXp, setBurstXp] = useState(0);
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number }>({ show: false, level: 1 });

  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDiff, setNewDiff] = useState<DiffKey>("easy");
  const [newIcon, setNewIcon] = useState("⚡");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listQuests();
      setQuests(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
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

  const handleComplete = useCallback(
    async (id: string) => {
      try {
        const res = await api.completeQuest(id);
        setBurstXp(res.xp_gained);
        setBurstVisible(true);
        setUser(res.user);
        if (res.leveled_up) {
          setTimeout(() => setLevelUp({ show: true, level: res.new_level }), 900);
        }
        setQuests((prev) =>
          prev.map((q) => (q.id === id ? { ...q, completed_today: true } : q)),
        );
      } catch {
        // already completed or error → reload
        load();
      }
    },
    [setUser, load],
  );

  const handleDelete = useCallback(async (id: string) => {
    setQuests((prev) => prev.filter((q) => q.id !== id));
    try {
      await api.deleteQuest(id);
    } catch {
      load();
    }
  }, [load]);

  const handleUncomplete = useCallback(async (id: string) => {
    try {
      const res = await api.uncompleteQuest(id);
      setUser(res.user);
      setQuests((prev) =>
        prev.map((q) => (q.id === id ? { ...q, completed_today: false } : q)),
      );
    } catch {
      load();
    }
  }, [setUser, load]);

  const createQuest = useCallback(async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const diff = DIFFICULTIES.find((d) => d.key === newDiff)!;
      const q = await api.createQuest({
        title: newTitle.trim(),
        xp_reward: diff.xp,
        icon: newIcon,
        difficulty: newDiff,
        category: "other",
      });
      setQuests((prev) => [...prev, q]);
      setAddOpen(false);
      setNewTitle("");
      setNewDiff("easy");
      setNewIcon("⚡");
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }, [newTitle, newDiff, newIcon, creating]);

  const completedToday = quests.filter((q) => q.completed_today).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>{t.quests.kicker}</Text>
          <Text style={styles.title}>
            {t.quests.titleProgress(completedToday, quests.length)}
          </Text>
        </View>
        <Pressable
          testID="open-add-quest"
          onPress={() => setAddOpen(true)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Plus color={colors.bg} size={22} strokeWidth={3} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading && quests.length === 0 && (
          <Text style={styles.empty}>{t.quests.loading}</Text>
        )}
        {!loading && quests.length === 0 && (
          <Animated.View entering={FadeIn} style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t.quests.emptyTitle}</Text>
            <Text style={styles.emptySub}>{t.quests.emptySub}</Text>
          </Animated.View>
        )}
        {quests.length > 0 && (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💡 {t.quests.tapHint} · {t.quests.swipeHint}</Text>
          </View>
        )}
        {quests.map((q, idx) => (
          <Animated.View key={q.id} entering={FadeInDown.delay(idx * 40).duration(350)}>
            <SwipeQuestCard
              id={q.id}
              title={q.title}
              xpReward={q.xp_reward}
              icon={q.icon}
              difficulty={q.difficulty}
              completedToday={!!q.completed_today}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onDelete={handleDelete}
            />
          </Animated.View>
        ))}
      </ScrollView>

      <ParticleBurst
        visible={burstVisible}
        xpGained={burstXp}
        onDone={() => setBurstVisible(false)}
      />

      <LevelUpSheet
        visible={levelUp.show}
        newLevel={levelUp.level}
        onClose={() => setLevelUp({ show: false, level: 1 })}
      />

      {/* Add Quest Bottom Sheet */}
      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalRoot}>
          <Pressable style={{ flex: 1 }} onPress={() => setAddOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{t.quests.addQuest}</Text>
                <Pressable testID="close-add-quest" onPress={() => setAddOpen(false)}>
                  <X color={colors.text} size={20} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>{t.quests.titleLabel}</Text>
              <TextInput
                testID="new-quest-title"
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder={t.quests.titlePlaceholder}
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                maxLength={60}
                autoFocus
              />

              <Text style={styles.fieldLabel}>{t.quests.iconLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                {QUEST_ICONS.map((i) => (
                  <Pressable
                    key={i}
                    testID={`icon-pick-${i}`}
                    onPress={() => setNewIcon(i)}
                    style={[styles.iconChip, newIcon === i && styles.iconChipActive]}
                  >
                    <Text style={styles.iconEmoji}>{i}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>{t.quests.difficultyLabel}</Text>
              <View style={styles.diffGrid}>
                {DIFFICULTIES.map((d) => (
                  <Pressable
                    key={d.key}
                    testID={`diff-pick-${d.key}`}
                    onPress={() => setNewDiff(d.key)}
                    style={[
                      styles.diffCard,
                      newDiff === d.key && { borderColor: d.color, backgroundColor: "rgba(255,255,255,0.04)" },
                    ]}
                  >
                    <View style={[styles.diffDot, { backgroundColor: d.color }]} />
                    <Text style={styles.diffLabel}>{d.label}</Text>
                    <Text style={[styles.diffXp, { color: d.color }]}>+{d.xp} XP</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                testID="confirm-add-quest"
                onPress={createQuest}
                disabled={creating || !newTitle.trim()}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  (!newTitle.trim() || creating) && { opacity: 0.4 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.confirmText}>{creating ? t.quests.creating : t.quests.create}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingVertical: 16,
  },
  kicker: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 120, paddingTop: 8 },
  empty: { color: colors.textSecondary, textAlign: "center", marginTop: 30 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 32,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  emptySub: { color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: "center" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  iconRow: { gap: 8, paddingVertical: 2 },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  iconChipActive: { borderColor: colors.primary, backgroundColor: "rgba(0,229,255,0.1)" },
  iconEmoji: { fontSize: 24 },
  xpChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  xpChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  xpChipText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  tipBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  tipText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  diffGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  diffCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  diffLabel: { color: colors.text, fontSize: 13, fontWeight: "700", flex: 1 },
  diffXp: { fontSize: 12, fontWeight: "900" },
  confirmBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  confirmText: { color: colors.bg, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
});
