import { Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Check, Trash2 } from "lucide-react-native";

import { colors, radius } from "@/src/theme";

type Props = {
  id: string;
  title: string;
  xpReward: number;
  icon: string;
  completedToday: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
};

const SWIPE_THRESHOLD = 120;

export default function SwipeQuestCard({
  id,
  title,
  xpReward,
  icon,
  completedToday,
  onComplete,
  onDelete,
}: Props) {
  const tx = useSharedValue(0);

  const triggerHaptic = (style: "light" | "success") => {
    if (Platform.OS === "web") return;
    if (style === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (style === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleComplete = () => onComplete(id);
  const handleDelete = () => onDelete(id);

  const pan = Gesture.Pan()
    .enabled(!completedToday)
    .activeOffsetX([-15, 15])
    .onStart(() => {
      runOnJS(triggerHaptic)("light");
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd(() => {
      if (tx.value > SWIPE_THRESHOLD) {
        tx.value = withTiming(500, { duration: 220 });
        runOnJS(triggerHaptic)("success");
        runOnJS(handleComplete)();
      } else if (tx.value < -SWIPE_THRESHOLD) {
        tx.value = withTiming(-500, { duration: 220 });
        runOnJS(handleDelete)();
      } else {
        tx.value = withSpring(0, { mass: 1, damping: 15, stiffness: 130 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const completeBgStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(tx.value / SWIPE_THRESHOLD, 0), 1),
  }));

  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(-tx.value / SWIPE_THRESHOLD, 0), 1),
  }));

  return (
    <View testID={`quest-card-${id}`} style={styles.container}>
      <Animated.View style={[styles.bg, styles.completeBg, completeBgStyle]}>
        <Check color={colors.bg} size={22} strokeWidth={3} />
        <Text style={styles.bgLabelDark}>COMPLETE</Text>
      </Animated.View>
      <Animated.View style={[styles.bg, styles.deleteBg, deleteBgStyle]}>
        <Text style={styles.bgLabelLight}>DELETE</Text>
        <Trash2 color={colors.text} size={20} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.card,
            completedToday && styles.cardDone,
            cardStyle,
          ]}
        >
          <View style={[styles.iconBubble, completedToday && styles.iconBubbleDone]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                completedToday && { textDecorationLine: "line-through", color: colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text style={styles.hint}>
              {completedToday ? "✓ Banked today" : "Swipe right → claim XP"}
            </Text>
          </View>
          <View style={[styles.xpPill, completedToday && styles.xpPillDone]}>
            <Text style={[styles.xpText, completedToday && { color: colors.bg }]}>
              +{xpReward}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: radius.card,
  },
  completeBg: { backgroundColor: colors.success, justifyContent: "flex-start" },
  deleteBg: { backgroundColor: colors.warning, justifyContent: "flex-end" },
  bgLabelDark: { color: colors.bg, fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  bgLabelLight: { color: colors.text, fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardDone: {
    backgroundColor: "rgba(57,255,20,0.06)",
    borderColor: "rgba(57,255,20,0.3)",
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBubbleDone: { backgroundColor: colors.success },
  iconText: { fontSize: 22 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  xpPill: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minWidth: 50,
    alignItems: "center",
  },
  xpPillDone: { backgroundColor: colors.success, borderColor: colors.success },
  xpText: { color: colors.primary, fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
});
