/**
 * Push notifications — best-effort, multi-platform.
 * On native (iOS/Android), requests permission and registers an Expo push token.
 * On web, registers a synthetic token so the backend can track devices.
 * Schedules a local "daily streak warning" notification at 8 PM device time.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";

import { api } from "@/src/api/client";

let _registered = false;

export async function registerForPushAsync(): Promise<string | null> {
  if (_registered) return null;
  _registered = true;

  try {
    if (Platform.OS === "web") {
      // Web has no Expo push on this stack; mark token = "web-session-uid"
      const token = `web-${typeof navigator !== "undefined" ? navigator.userAgent.length : 0}-${Date.now()}`;
      await api.registerPush(token, "web").catch(() => {});
      return token;
    }
    const Notifications = await import("expo-notifications");
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.status === "granted";
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === "granted";
    }
    if (!granted) return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      // @ts-ignore
      Constants?.easConfig?.projectId;
    const tokenResp = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenResp.data;
    if (token) {
      await api.registerPush(token, Platform.OS === "ios" ? "ios" : "android").catch(() => {});

      // Schedule a local 8 PM streak nudge (cancel any prior)
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🔥 Keep your streak!",
            body: "Quick: knock out one quest to save your streak.",
          },
          trigger: { hour: 20, minute: 0, repeats: true },
        });
      } catch {
        // ignore scheduling errors
      }
    }
    return token;
  } catch {
    return null;
  }
}
