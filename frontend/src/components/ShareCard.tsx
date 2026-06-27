/**
 * ShareCard — visual preview of what the user is sharing.
 * Pure RN components (works on web + native). Looks like a hero card.
 */
import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/src/theme";

type Variant = "level" | "streak" | "quest" | "rank" | "invite";

type Props = {
  variant: Variant;
  username?: string;
  avatar?: string;
  primary?: string | number; // main metric (level / streak number / rank)
  secondary?: string | number; // sub metric (xp / quest title)
  testID?: string;
};

const VARIANT_META: Record<Variant, { label: string; emoji: string; accent: string }> = {
  level: { label: "LEVEL UP", emoji: "🚀", accent: colors.primary },
  streak: { label: "STREAK", emoji: "🔥", accent: "#FF8A00" },
  quest: { label: "QUEST CLEARED", emoji: "⚡", accent: colors.success },
  rank: { label: "RANK", emoji: "🏆", accent: colors.premium },
  invite: { label: "JOIN MY GUILD", emoji: "👾", accent: colors.primary },
};

export default function ShareCard({ variant, username, avatar, primary, secondary, testID }: Props) {
  const meta = VARIANT_META[variant];

  return (
    <View testID={testID || `share-card-${variant}`} style={[styles.card, { borderColor: meta.accent + "55" }]}>
      <View style={styles.topRow}>
        <View style={styles.brandPill}>
          <Text style={styles.brandPillText}>GRYND</Text>
        </View>
        <Text style={styles.label}>{meta.label}</Text>
      </View>

      <View style={styles.heroRow}>
        <Text style={[styles.hero, { color: meta.accent }]}>
          {meta.emoji}{" "}
          {primary !== undefined ? String(primary) : ""}
        </Text>
      </View>

      {secondary !== undefined && (
        <Text style={styles.secondary} numberOfLines={2}>
          {String(secondary)}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarEmoji}>{avatar || "🦄"}</Text>
        </View>
        <Text style={styles.userText} numberOfLines={1}>
          @{username || "runner"}
        </Text>
      </View>

      {/* subtle grid overlay */}
      <View pointerEvents="none" style={styles.gridOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  brandPillText: { color: colors.bg, fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  heroRow: { marginTop: 14, marginBottom: 4 },
  hero: { fontSize: 44, fontWeight: "900", letterSpacing: -1 },
  secondary: { color: colors.text, fontSize: 14, marginTop: 6, fontWeight: "600" },
  footer: { flexDirection: "row", alignItems: "center", marginTop: 18, gap: 10 },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  avatarEmoji: { fontSize: 18 },
  userText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    opacity: 0.04,
  },
});
