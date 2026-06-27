/**
 * Cyberpet — procedural pet that evolves with player level.
 * Pure RN + emoji + SVG-ish layered shapes. No external asset needed.
 */
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";

import { colors } from "@/src/theme";

const STAGES: Record<string, { emoji: string; aura: string; name: string }> = {
  egg:        { emoji: "🥚", aura: colors.textTertiary, name: "Egg" },
  hatchling:  { emoji: "🐣", aura: colors.success, name: "Hatchling" },
  larva:      { emoji: "🐛", aura: colors.success, name: "Larva" },
  drone:      { emoji: "🤖", aura: colors.primary, name: "Drone" },
  mecha:      { emoji: "🦾", aura: colors.primary, name: "Mecha" },
  ascendant:  { emoji: "👾", aura: colors.premium, name: "Ascendant" },
};

type Props = {
  stage?: string;
  size?: number;
  showLabel?: boolean;
  testID?: string;
};

export default function Cyberpet({ stage = "egg", size = 80, showLabel = false, testID }: Props) {
  const meta = STAGES[stage] || STAGES.egg;
  const float = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1100, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [float, pulse]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));
  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.35,
  }));

  return (
    <View testID={testID || `cyberpet-${stage}`} style={[styles.wrap, { width: size + 24, height: size + 24 }]}>
      <Animated.View style={[styles.aura, { backgroundColor: meta.aura, width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 }, auraStyle]} />
      <Animated.View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, borderColor: meta.aura }, floatStyle]}>
        <Text style={{ fontSize: size * 0.6 }}>{meta.emoji}</Text>
      </Animated.View>
      {showLabel && <Text style={[styles.label, { color: meta.aura }]}>{meta.name.toUpperCase()}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  aura: { position: "absolute" },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: 10, fontWeight: "900", letterSpacing: 2, marginTop: 6 },
});
