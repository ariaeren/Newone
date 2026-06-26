import { useEffect } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Sparkles } from "lucide-react-native";

import { colors, radius } from "@/src/theme";

type Props = {
  visible: boolean;
  newLevel: number;
  onClose: () => void;
};

export default function LevelUpSheet({ visible, newLevel, onClose }: Props) {
  const ty = useSharedValue(400);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      ty.value = withSpring(0, { mass: 1, damping: 16, stiffness: 130 });
      scale.value = withSpring(1, { mass: 1, damping: 14, stiffness: 130 });
    } else {
      ty.value = withTiming(400, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible, ty, scale]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          testID="level-up-sheet"
          onStartShouldSetResponder={() => true}
          style={[styles.sheet, sheetStyle]}
        >
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <Sparkles color={colors.bg} size={40} strokeWidth={2.5} />
          </View>
          <Text style={styles.kicker}>LEVEL UP</Text>
          <Text style={styles.bigLevel}>LVL {newLevel}</Text>
          <Text style={styles.sub}>
            New tier unlocked. The guild salutes you, runner.
          </Text>
          <Pressable
            testID="level-up-close"
            onPress={onClose}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Continue grinding</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.modalBackdrop },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    marginBottom: 24,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: colors.success,
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  kicker: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: 8,
  },
  bigLevel: {
    color: colors.text,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    marginTop: 4,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  cta: {
    backgroundColor: colors.text,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radius.pill,
    width: "100%",
    alignItems: "center",
  },
  ctaText: { color: colors.bg, fontSize: 15, fontWeight: "800" },
});
