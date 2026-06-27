/**
 * ShareSheet — bottom-sheet modal with social-share targets.
 * Works on mobile + web. Includes native OS share button when available.
 */
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { X, Share2, Copy, Check } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { colors, radius, spacing } from "@/src/theme";
import { ShareTarget, SharePayload, shareTo, copyToClipboard } from "@/src/utils/share";

type Props = {
  visible: boolean;
  onClose: () => void;
  payload: SharePayload;
  // optional preview card (e.g. a styled level-up image-y card)
  preview?: React.ReactNode;
  // tested id prefix
  testIDPrefix?: string;
};

type Target = {
  id: ShareTarget;
  labelKey: string;
  bg: string;
  fg: string;
  glyph: string;
};

const TARGETS: Target[] = [
  { id: "twitter", labelKey: "share.targets.twitter", bg: "#000000", fg: "#ffffff", glyph: "𝕏" },
  { id: "facebook", labelKey: "share.targets.facebook", bg: "#1877F2", fg: "#ffffff", glyph: "f" },
  { id: "whatsapp", labelKey: "share.targets.whatsapp", bg: "#25D366", fg: "#ffffff", glyph: "" },
  { id: "telegram", labelKey: "share.targets.telegram", bg: "#26A5E4", fg: "#ffffff", glyph: "✈" },
  { id: "linkedin", labelKey: "share.targets.linkedin", bg: "#0A66C2", fg: "#ffffff", glyph: "in" },
  { id: "reddit", labelKey: "share.targets.reddit", bg: "#FF4500", fg: "#ffffff", glyph: "↗" },
  { id: "pinterest", labelKey: "share.targets.pinterest", bg: "#E60023", fg: "#ffffff", glyph: "P" },
];

export default function ShareSheet({ visible, onClose, payload, preview, testIDPrefix = "share" }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const buzz = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  const handle = async (target: ShareTarget) => {
    await buzz();
    if (target === "copy") {
      const text = `${payload.body}${payload.url ? `\n${payload.url}` : ""}${payload.hashtags ? `\n${payload.hashtags}` : ""}`;
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      return;
    }
    await shareTo(target, payload);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID={`${testIDPrefix}-backdrop`}>
        <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill} pointerEvents="none" />
      </Pressable>
      <SafeAreaView edges={["bottom"]} style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View
          entering={FadeInDown.springify().damping(18).mass(0.7)}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t("share.sheetTitle")}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              testID={`${testIDPrefix}-close`}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {preview && <View style={styles.preview}>{preview}</View>}

          <Pressable
            testID={`${testIDPrefix}-target-native`}
            onPress={() => handle("native")}
            style={({ pressed }) => [styles.primaryRow, pressed && { opacity: 0.85 }]}
          >
            <Share2 size={18} color={colors.bg} />
            <Text style={styles.primaryRowText}>{t("common.share")}</Text>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.targetsRow}
          >
            {TARGETS.map((tgt) => (
              <Pressable
                key={tgt.id}
                testID={`${testIDPrefix}-target-${tgt.id}`}
                onPress={() => handle(tgt.id)}
                style={({ pressed }) => [styles.targetBtn, pressed && { transform: [{ scale: 0.94 }] }]}
              >
                <View style={[styles.targetIcon, { backgroundColor: tgt.bg }]}>
                  <Text style={[styles.targetGlyph, { color: tgt.fg }]}>{tgt.glyph}</Text>
                </View>
                <Text style={styles.targetLabel} numberOfLines={1}>
                  {t(tgt.labelKey)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              testID={`${testIDPrefix}-target-copy`}
              onPress={() => handle("copy")}
              style={({ pressed }) => [styles.targetBtn, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <View style={[styles.targetIcon, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                {copied ? <Check size={20} color={colors.success} /> : <Copy size={18} color={colors.text} />}
              </View>
              <Text style={styles.targetLabel} numberOfLines={1}>
                {copied ? t("common.copied") : t("share.targets.copyLink")}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.modalBackdrop },
  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    marginBottom: 14,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  closeBtn: { padding: 6, borderRadius: radius.pill },
  preview: { marginBottom: 14 },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginBottom: 16,
  },
  primaryRowText: { color: colors.bg, fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  targetsRow: { paddingVertical: 4, gap: 14 },
  targetBtn: { alignItems: "center", width: 76 },
  targetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  targetGlyph: { fontSize: 22, fontWeight: "900", lineHeight: 24 },
  targetLabel: { color: colors.textSecondary, fontSize: 11, textAlign: "center", fontWeight: "600" },
});
