import { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

import { colors } from "@/src/theme";

const { width: W, height: H } = Dimensions.get("window");

type Props = {
  xpGained: number;
  visible: boolean;
  onDone: () => void;
};

const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  key: i,
  emoji: ["✨", "💥", "⚡", "🔥", "💎", "🌟", "🟢", "🔷"][i % 8],
  x: Math.random() * W,
  y: H * 0.3 + Math.random() * H * 0.3,
  dx: (Math.random() - 0.5) * 220,
  dy: -100 - Math.random() * 320,
  rot: (Math.random() - 0.5) * 360,
  delay: i * 35,
}));

function Particle({ p }: { p: (typeof PARTICLES)[number] }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    tx.value = withDelay(p.delay, withTiming(p.dx, { duration: 950, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(p.delay, withTiming(p.dy, { duration: 950, easing: Easing.out(Easing.cubic) }));
    rot.value = withDelay(p.delay, withTiming(p.rot, { duration: 950 }));
    op.value = withDelay(
      p.delay,
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 800, easing: Easing.in(Easing.cubic) }),
      ),
    );
  }, [p, tx, ty, op, rot]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
      { scale: 0.6 + op.value * 0.8 },
    ],
  }));

  return (
    <Animated.Text
      style={[
        styles.particle,
        { left: p.x, top: p.y },
        style,
      ]}
    >
      {p.emoji}
    </Animated.Text>
  );
}

export default function ParticleBurst({ xpGained, visible, onDone }: Props) {
  const popOpacity = useSharedValue(0);
  const popScale = useSharedValue(0.5);

  useEffect(() => {
    if (!visible) return;
    popOpacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(700, withTiming(0, { duration: 400 }, () => runOnJS(onDone)())),
    );
    popScale.value = withSequence(
      withTiming(1.2, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 150 }),
    );
  }, [visible, popOpacity, popScale, onDone]);

  const popStyle = useAnimatedStyle(() => ({
    opacity: popOpacity.value,
    transform: [{ scale: popScale.value }],
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map((p) => (
        <Particle key={p.key} p={p} />
      ))}
      <Animated.View style={[styles.popWrap, popStyle]}>
        <View style={styles.pop}>
          <Text style={styles.popText}>+{xpGained} XP</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: "absolute", fontSize: 30 },
  popWrap: {
    position: "absolute",
    top: H * 0.42,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pop: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.success,
    borderRadius: 999,
    shadowColor: colors.success,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  popText: { color: colors.bg, fontSize: 24, fontWeight: "900", letterSpacing: 1 },
});
