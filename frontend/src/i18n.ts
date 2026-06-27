/**
 * GRYND — i18n setup (12 languages, auto-detect, persistent).
 * - Detects device locale on first launch via expo-localization.
 * - Saved choice persists via AsyncStorage.
 * - Falls back to English.
 * - RTL handled for Arabic.
 */
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager, Platform } from "react-native";

import en from "@/src/locales/en.json";
import id from "@/src/locales/id.json";
import es from "@/src/locales/es.json";
import fr from "@/src/locales/fr.json";
import de from "@/src/locales/de.json";
import ja from "@/src/locales/ja.json";
import zh from "@/src/locales/zh.json";
import ar from "@/src/locales/ar.json";
import pt from "@/src/locales/pt.json";
import ru from "@/src/locales/ru.json";
import ko from "@/src/locales/ko.json";
import hi from "@/src/locales/hi.json";

export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸", native: "English" },
  { code: "id", name: "Indonesian", flag: "🇮🇩", native: "Bahasa Indonesia" },
  { code: "es", name: "Spanish", flag: "🇪🇸", native: "Español" },
  { code: "fr", name: "French", flag: "🇫🇷", native: "Français" },
  { code: "de", name: "German", flag: "🇩🇪", native: "Deutsch" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", native: "Português" },
  { code: "ru", name: "Russian", flag: "🇷🇺", native: "Русский" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", native: "日本語" },
  { code: "ko", name: "Korean", flag: "🇰🇷", native: "한국어" },
  { code: "zh", name: "Chinese", flag: "🇨🇳", native: "中文" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", native: "العربية" },
  { code: "hi", name: "Hindi", flag: "🇮🇳", native: "हिन्दी" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const RTL_LANGS: LangCode[] = ["ar"];
const STORE_KEY = "grynd_lang";

const resources = {
  en: { translation: en },
  id: { translation: id },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ja: { translation: ja },
  zh: { translation: zh },
  ar: { translation: ar },
  pt: { translation: pt },
  ru: { translation: ru },
  ko: { translation: ko },
  hi: { translation: hi },
};

function detectDeviceLang(): LangCode {
  try {
    const locales = Localization.getLocales();
    for (const loc of locales) {
      const tag = (loc.languageCode || "").toLowerCase();
      // Match prefix (e.g. "zh-CN" -> "zh", "pt-BR" -> "pt")
      const match = LANGUAGES.find((l) => l.code === tag);
      if (match) return match.code;
    }
  } catch {
    // ignore
  }
  return "en";
}

let _initialized = false;

export async function initI18n() {
  if (_initialized) return i18next;
  _initialized = true;

  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(STORE_KEY);
  } catch {
    // ignore
  }
  const lang = ((saved as LangCode) ||
    detectDeviceLang() ||
    "en") as LangCode;

  await i18next.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: "v4",
  });

  applyRTL(lang);
  return i18next;
}

export async function setLanguage(code: LangCode) {
  await i18next.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORE_KEY, code);
  } catch {
    // ignore
  }
  applyRTL(code);
}

function applyRTL(code: LangCode) {
  const shouldBeRTL = RTL_LANGS.includes(code);
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.documentElement.dir = shouldBeRTL ? "rtl" : "ltr";
      document.documentElement.lang = code;
    }
    return;
  }
  if (I18nManager.isRTL !== shouldBeRTL) {
    try {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      // On native, RTL change requires app reload to fully apply.
    } catch {
      // ignore
    }
  }
}

export function currentLanguage(): LangCode {
  return (i18next.language?.split("-")[0] as LangCode) || "en";
}

export default i18next;
