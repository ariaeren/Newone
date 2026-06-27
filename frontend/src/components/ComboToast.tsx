/**
 * ComboToast — appears after each completed quest when combo >= 2.
 * Increases urgency, screen-shake, and a clear bonus XP indicator.
 */
import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { colors, radius } from "@/src/theme";

type Props = {
  visible: boolean;
  combo: number;
  multiplier: number;
  bonusXp: number;
  shieldUsed?: boolean;
  onDone?: () => void;
};

export default function ComboToast({ visible, combo, multiplier, bonusXp, shieldUsed, onDone }: Props) {
  const { t } = useTranslation();
  const ty = useSharedValue(80);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const rage = combo >= 5;

  useEffect(() => {
    if (!visible) return;
    ty.value = withSpring(0, { damping: 14, stiffness: 200 });
    scale.value = withSequence(withSpring(1.05), withSpring(1));
    opacity.value = withTiming(1, { duration: 180 });
    if (Platform.OS !== "web") {
      try {
        Haptics.notificationAsync(
          rage ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        );
      } catch {}
    }
    const id = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 250 });
      ty.value = withTiming(80, { duration: 250 }, () => {
        if (onDone) runOnJS(onDone)();
      });
    }, 1800);
    return () => clearTimeout(id);
  }, [visible, combo, opacity, ty, scale, rage, onDone]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View style={[styles.toast, rage && styles.toastRage, style]}>
        {shieldUsed && (
          <Text style={styles.shieldRow}>🛡️ {t("shield.saved")}</Text>
        )}
        <Text style={[styles.combo, rage && { color: colors.bg }]}>
          {rage ? t("combo.rage") : `${t("combo.title")} ×${combo}`}
        </Text>
        <Text style={[styles.mult, rage && { color: colors.bg }]}>
          {multiplier.toFixed(2)}× • +{bonusXp} XP
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", left: 16, right: 16, bottom: 100, alignItems: "center" },
  toast: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 2, borderColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12, alignItems: "center", minWidth: 220 },
  toastRage: { backgroundColor: colors.premium, borderColor: colors.premium, shadowColor: colors.premium, shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
  combo: { color: colors.primary, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  mult: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 4 },
  shieldRow: { color: colors.success, fontSize: 11, fontWeight: "900", letterSpacing: 1, marginBottom: 4 },
});
