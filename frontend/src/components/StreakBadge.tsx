import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { colors, radius } from "@/src/theme";
import { t } from "@/src/i18n";

export default function StreakBadge({ count }: { count: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 700, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [scale]);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View testID="streak-badge" style={styles.wrap}>
      <Animated.Text style={[styles.fire, fireStyle]}>🔥</Animated.Text>
      <View>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.label}>{t.hub.streakLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.input,
  },
  fire: { fontSize: 28 },
  count: { color: colors.text, fontSize: 18, fontWeight: "900" },
  label: { color: colors.textSecondary, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
});
