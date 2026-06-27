import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Check, Trash2, Undo2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, radius } from "@/src/theme";

type Props = {
  id: string;
  title: string;
  xpReward: number;
  icon: string;
  difficulty?: string;
  completedToday: boolean;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
};

const SWIPE_THRESHOLD = 110;

const DIFF_COLORS: Record<string, string> = {
  trivial: colors.textTertiary,
  easy: colors.success,
  medium: colors.primary,
  hard: colors.premium,
};

export default function SwipeQuestCard({
  id,
  title,
  xpReward,
  icon,
  difficulty = "easy",
  completedToday,
  onComplete,
  onUncomplete,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const tx = useSharedValue(0);

  const haptic = (style: "light" | "success" | "warning") => {
    if (Platform.OS === "web") return;
    if (style === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (style === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (style === "warning") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleComplete = () => onComplete(id);
  const handleUncomplete = () => onUncomplete(id);
  const handleDelete = () => onDelete(id);
  const handleTapTick = () => {
    if (completedToday) {
      haptic("warning");
      handleUncomplete();
    } else {
      haptic("success");
      handleComplete();
    }
  };

  const pan = Gesture.Pan()
    .enabled(!completedToday)
    .activeOffsetX([-15, 15])
    .onStart(() => {
      runOnJS(haptic)("light");
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd(() => {
      if (tx.value > SWIPE_THRESHOLD) {
        tx.value = withTiming(500, { duration: 220 });
        runOnJS(haptic)("success");
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

  const diffColor = DIFF_COLORS[difficulty] || DIFF_COLORS.easy;
  const diffLabel = t(`quests.difficulties.${difficulty}.name`);

  return (
    <View testID={`quest-card-${id}`} style={styles.container}>
      <Animated.View style={[styles.bg, styles.completeBg, completeBgStyle]}>
        <Check color={colors.bg} size={22} strokeWidth={3} />
        <Text style={styles.bgLabelDark}>{t("quests.completedToday").replace("✓ ", "").toUpperCase()}</Text>
      </Animated.View>
      <Animated.View style={[styles.bg, styles.deleteBg, deleteBgStyle]}>
        <Text style={styles.bgLabelLight}>{t("common.delete").toUpperCase()}</Text>
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
          {/* Tap-to-tick checkbox */}
          <Pressable
            testID={`quest-tick-${id}`}
            onPress={handleTapTick}
            hitSlop={10}
            style={[styles.tick, completedToday && styles.tickDone]}
          >
            {completedToday ? (
              <Check color={colors.bg} size={18} strokeWidth={3} />
            ) : (
              <Text style={styles.tickIcon}>{icon}</Text>
            )}
          </Pressable>

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
            <View style={styles.metaRow}>
              <View style={[styles.diffPill, { borderColor: diffColor }]}>
                <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
                <Text style={[styles.diffLabel, { color: diffColor }]}>{diffLabel}</Text>
              </View>
              <Text style={styles.hint}>
                {completedToday ? t("quests.completedToday") : t("quests.swipeToComplete")}
              </Text>
            </View>
          </View>

          <View style={[styles.xpPill, completedToday && styles.xpPillDone]}>
            <Text style={[styles.xpText, completedToday && { color: colors.bg }]}>
              +{xpReward}
            </Text>
          </View>

          {completedToday && (
            <Pressable
              testID={`quest-undo-${id}`}
              onPress={handleUncomplete}
              hitSlop={8}
              style={styles.undoBtn}
            >
              <Undo2 color={colors.textSecondary} size={16} />
            </Pressable>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12, borderRadius: radius.card, overflow: "hidden" },
  bg: {
    position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, gap: 10, borderRadius: radius.card,
  },
  completeBg: { backgroundColor: colors.success, justifyContent: "flex-start" },
  deleteBg: { backgroundColor: colors.warning, justifyContent: "flex-end" },
  bgLabelDark: { color: colors.bg, fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  bgLabelLight: { color: colors.text, fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  cardDone: {
    backgroundColor: "rgba(57,255,20,0.06)",
    borderColor: "rgba(57,255,20,0.3)",
  },
  tick: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.borderSubtle,
  },
  tickDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  tickIcon: { fontSize: 22 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  diffPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.pill,
  },
  diffDot: { width: 5, height: 5, borderRadius: 3 },
  diffLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  hint: { color: colors.textSecondary, fontSize: 11, flex: 1 },
  xpPill: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, minWidth: 52, alignItems: "center",
  },
  xpPillDone: { backgroundColor: colors.success, borderColor: colors.success },
  xpText: { color: colors.primary, fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  undoBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
    marginLeft: 4,
  },
});
