/**
 * LanguagePicker — bottom-sheet modal listing supported languages.
 * Choice persists; calls setLanguage from i18n.
 */
import { useTranslation } from "react-i18next";
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
import { X, Check } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { colors, radius, spacing } from "@/src/theme";
import { LANGUAGES, setLanguage, currentLanguage, LangCode } from "@/src/i18n";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function LanguagePicker({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.split("-")[0] as LangCode) || currentLanguage();

  const choose = async (code: LangCode) => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    await setLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="lang-picker-backdrop"
        style={styles.backdrop}
        onPress={onClose}
      />
      <SafeAreaView edges={["bottom"]} style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t("language.title")}</Text>
            <Pressable
              testID="lang-picker-close"
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((lang) => {
              const active = lang.code === current;
              return (
                <Pressable
                  key={lang.code}
                  testID={`lang-option-${lang.code}`}
                  onPress={() => choose(lang.code)}
                  style={({ pressed }) => [
                    styles.row,
                    active && styles.rowActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.native}>{lang.native}</Text>
                    <Text style={styles.english}>{lang.name}</Text>
                  </View>
                  {active && <Check size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
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
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
  },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: colors.borderSubtle, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  closeBtn: { padding: 6, borderRadius: radius.pill },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radius.input,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowActive: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderActive },
  flag: { fontSize: 26 },
  native: { color: colors.text, fontSize: 15, fontWeight: "800" },
  english: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
});
