import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Plus, X, Trash2 } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { colors, radius, spacing } from "@/src/theme";
import { api, Journal } from "@/src/api/client";

const MOODS = ["😄", "😌", "😐", "😩", "😡", "🥹", "🔥", "💀", "✨"];
const MAX = 140;

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function JournalScreen() {
  const [items, setItems] = useState<Journal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string>("✨");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listJournals();
      setItems(list);
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

  const submit = useCallback(async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const j = await api.createJournal({ content: text.trim(), mood });
      setItems((prev) => [j, ...prev]);
      setText("");
      setMood("✨");
      setOpen(false);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }, [text, mood, submitting]);

  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.deleteJournal(id);
    } catch {
      load();
    }
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>MICRO JOURNAL</Text>
          <Text style={styles.title}>140 chars. zero filter.</Text>
        </View>
        <Pressable
          testID="open-add-journal"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Plus color={colors.bg} size={22} strokeWidth={3} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {items.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📓</Text>
            <Text style={styles.emptyTitle}>Empty grid</Text>
            <Text style={styles.emptySub}>Drop a quick reflection. 140 chars, mood emoji, done.</Text>
          </View>
        )}
        {items.map((j, idx) => (
          <Animated.View
            key={j.id}
            entering={FadeInDown.delay(idx * 30).duration(300)}
            style={styles.entry}
            testID={`journal-${j.id}`}
          >
            <View style={styles.entryTop}>
              <Text style={styles.entryMood}>{j.mood}</Text>
              <Text style={styles.entryDate}>{formatDate(j.created_at)}</Text>
              <Pressable onPress={() => remove(j.id)} hitSlop={10}>
                <Trash2 color={colors.textTertiary} size={16} />
              </Pressable>
            </View>
            <Text style={styles.entryText}>{j.content}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalRoot}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>QUICK DROP</Text>
                <Pressable testID="close-add-journal" onPress={() => setOpen(false)}>
                  <X color={colors.text} size={20} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>HOW YOU FEELING?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
                {MOODS.map((m) => (
                  <Pressable
                    key={m}
                    testID={`mood-pick-${m}`}
                    onPress={() => setMood(m)}
                    style={[styles.moodChip, mood === m && styles.moodChipActive]}
                  >
                    <Text style={styles.moodEmoji}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>WHAT&apos;S UP?</Text>
              <TextInput
                testID="journal-input"
                value={text}
                onChangeText={(v) => setText(v.slice(0, MAX))}
                placeholder="day was wild, here's the tea..."
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                multiline
                autoFocus
                maxLength={MAX}
              />
              <Text style={styles.counter}>{text.length}/{MAX}</Text>

              <Pressable
                testID="confirm-add-journal"
                onPress={submit}
                disabled={!text.trim() || submitting}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  (!text.trim() || submitting) && { opacity: 0.4 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.confirmText}>{submitting ? "..." : "Drop entry"}</Text>
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
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 32,
    alignItems: "center",
    marginTop: 16,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  emptySub: { color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: "center", paddingHorizontal: 12 },
  entry: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 12,
  },
  entryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  entryMood: { fontSize: 24 },
  entryDate: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 1, flex: 1, marginLeft: 12 },
  entryText: { color: colors.text, fontSize: 15, lineHeight: 22 },
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
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 8,
  },
  moodRow: { gap: 8, paddingVertical: 2 },
  moodChip: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  moodChipActive: { borderColor: colors.primary, backgroundColor: "rgba(0,229,255,0.1)" },
  moodEmoji: { fontSize: 30 },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.text,
    fontSize: 18,
    minHeight: 96,
    textAlignVertical: "top",
  },
  counter: { color: colors.textTertiary, fontSize: 12, textAlign: "right", marginTop: 6, fontWeight: "700" },
  confirmBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  confirmText: { color: colors.bg, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
});
