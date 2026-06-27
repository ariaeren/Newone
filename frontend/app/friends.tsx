import { useCallback, useEffect, useState } from "react";
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Copy, UserPlus, Hand, X, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { colors, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/api/auth-context";
import { api, FriendRow } from "@/src/api/client";
import { copyToClipboard, shareTo } from "@/src/utils/share";
import Cyberpet from "@/src/components/Cyberpet";

export default function FriendsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState<string | null>(user?.friend_code || null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [add, setAdd] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hfSent, setHfSent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const me = await api.socialMe();
      setCode(me.friend_code);
      const list = await api.listFriends();
      setFriends(list.friends);
    } catch {
      // ignore
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyCode = async () => {
    if (!code) return;
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    if (Platform.OS !== "web") {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
  };

  const shareCode = async () => {
    if (!code) return;
    await shareTo("native", {
      title: "Join my GRYND guild",
      body: `Add me on GRYND with my friend code: ${code}`,
      url: process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/u/${user?.username || ""}` : undefined,
    });
  };

  const submitAdd = async () => {
    if (!add.trim() || adding) return;
    setAdding(true); setError(null);
    try {
      const res = await api.friendAdd(add.trim().toUpperCase());
      if (res.status === "already_friends") {
        Alert.alert("Already friends");
      }
      setAdd("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not add");
    } finally { setAdding(false); }
  };

  const sendHf = async (f: FriendRow) => {
    if (hfSent[f.id]) return;
    try {
      await api.highFive(f.id);
      setHfSent((s) => ({ ...s, [f.id]: true }));
      if (Platform.OS !== "web") {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="friends-back" onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft color={colors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("friends.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t("friends.yourCode")}</Text>
          <Text testID="my-friend-code" style={styles.codeBig}>{code || "—"}</Text>
          <View style={styles.codeBtnRow}>
            <Pressable testID="copy-friend-code" onPress={copyCode} style={({ pressed }) => [styles.codeBtn, pressed && { opacity: 0.85 }]}>
              {copied ? <Check color={colors.success} size={14} /> : <Copy color={colors.text} size={14} />}
              <Text style={styles.codeBtnText}>{copied ? t("common.copied") : t("common.copy")}</Text>
            </Pressable>
            <Pressable testID="share-friend-code" onPress={shareCode} style={({ pressed }) => [styles.codeBtn, pressed && { opacity: 0.85 }]}>
              <UserPlus color={colors.text} size={14} />
              <Text style={styles.codeBtnText}>{t("common.share")}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t("friends.addLabel")}</Text>
        <View style={styles.addRow}>
          <TextInput
            testID="add-friend-input"
            value={add}
            onChangeText={(v) => setAdd(v.toUpperCase())}
            placeholder={t("friends.addPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            style={styles.addInput}
          />
          <Pressable
            testID="add-friend-submit"
            onPress={submitAdd}
            disabled={!add.trim() || adding}
            style={({ pressed }) => [styles.addBtn, (!add.trim() || adding) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
          >
            {adding ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.addBtnText}>{t("friends.addBtn")}</Text>}
          </Pressable>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.sectionLabel}>{t("friends.list")}</Text>
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
        {!loading && friends.length === 0 && (
          <Text style={styles.empty}>{t("friends.empty")}</Text>
        )}
        {friends.map((f) => (
          <View key={f.id} testID={`friend-row-${f.username}`} style={styles.row}>
            <Cyberpet stage={f.pet_stage as any} size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>@{f.username}</Text>
              <Text style={styles.meta}>Lvl {f.level} · {f.total_xp.toLocaleString()} XP · 🔥 {f.streak_count}</Text>
            </View>
            <Pressable
              testID={`high-five-${f.username}`}
              onPress={() => sendHf(f)}
              disabled={!!hfSent[f.id]}
              style={({ pressed }) => [styles.hfBtn, hfSent[f.id] && { backgroundColor: colors.success }, pressed && { opacity: 0.85 }]}
            >
              {hfSent[f.id] ? (
                <Text style={styles.hfBtnTextOn}>{t("friends.highFiveSent")}</Text>
              ) : (
                <>
                  <Hand color={colors.bg} size={14} />
                  <Text style={styles.hfBtnText}>{t("friends.highFive")}</Text>
                </>
              )}
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.screen, paddingVertical: 14 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 80 },
  codeCard: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.primary, padding: 20, alignItems: "center" },
  codeLabel: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  codeBig: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: 3, marginTop: 10, marginBottom: 14 },
  codeBtnRow: { flexDirection: "row", gap: 10 },
  codeBtn: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  codeBtnText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  sectionLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 24, marginBottom: 10 },
  addRow: { flexDirection: "row", gap: 10 },
  addInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.input, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15, letterSpacing: 2 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 22, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", minWidth: 80 },
  addBtnText: { color: colors.bg, fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  error: { color: colors.warning, fontSize: 12, marginTop: 8 },
  empty: { color: colors.textSecondary, fontSize: 13, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, marginBottom: 10 },
  name: { color: colors.text, fontSize: 15, fontWeight: "800" },
  meta: { color: colors.textSecondary, fontSize: 11, marginTop: 2, fontWeight: "600" },
  hfBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  hfBtnText: { color: colors.bg, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  hfBtnTextOn: { color: colors.bg, fontSize: 12, fontWeight: "900" },
});
