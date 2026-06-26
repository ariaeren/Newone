import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { colors, radius } from "@/src/theme";

type Props = {
  level: number;
  currentXp: number;
  xpToNext: number;
};

export default function XpBar({ level, currentXp, xpToNext }: Props) {
  const progress = useSharedValue(0);
  const lastValue = useRef(0);

  useEffect(() => {
    const target = Math.min(currentXp / Math.max(xpToNext, 1), 1);
    progress.value = withTiming(target, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    lastValue.current = target;
  }, [currentXp, xpToNext, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View testID="xp-bar" style={styles.wrap}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
        <Animated.View style={[styles.glow, fillStyle]} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.lvlPill}>
          <View style={styles.lvlDot} />
          <Animated.Text style={styles.lvlText}>LVL {level}</Animated.Text>
        </View>
        <Animated.Text style={styles.xpText}>
          {currentXp} / {xpToNext} XP
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  track: {
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  glow: {
    position: "absolute",
    height: "100%",
    backgroundColor: colors.primary,
    opacity: 0.35,
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lvlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  lvlDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  lvlText: { color: colors.text, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  xpText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
});
