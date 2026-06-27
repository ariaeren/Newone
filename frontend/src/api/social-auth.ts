import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import { api, AppUser } from "./client";

const EMERGENT_AUTH_BASE = "https://auth.emergentagent.com";

function getRedirectUrl(): string {
  if (Platform.OS === "web") {
    // On web preview, redirect to root — index.tsx will pick up #session_id.
    return window.location.origin + "/";
  }
  // Mobile (Expo Go or production build)
  return Linking.createURL("auth");
}

export function buildGoogleAuthUrl(): string {
  const redirect = getRedirectUrl();
  return `${EMERGENT_AUTH_BASE}/?redirect=${encodeURIComponent(redirect)}`;
}

function parseSessionId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    // Try hash first
    const hashIdx = rawUrl.indexOf("#");
    if (hashIdx >= 0) {
      const hashPart = rawUrl.substring(hashIdx + 1);
      const hashParams = new URLSearchParams(hashPart);
      const sid = hashParams.get("session_id");
      if (sid) return sid;
    }
    // Then query
    const queryIdx = rawUrl.indexOf("?");
    if (queryIdx >= 0) {
      const queryPart = rawUrl.substring(queryIdx + 1).split("#")[0];
      const queryParams = new URLSearchParams(queryPart);
      const sid = queryParams.get("session_id");
      if (sid) return sid;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Web flow: navigate to auth URL; on return, root page parses session_id and exchanges via finishGoogleAuth.
 * Mobile flow: openAuthSessionAsync awaits the redirect with session_id; we then exchange.
 * Returns the appUser on success, null on user-cancel, throws on real errors.
 */
export async function startGoogleSignIn(): Promise<AppUser | null> {
  const redirect = getRedirectUrl();
  const authUrl = buildGoogleAuthUrl();

  if (Platform.OS === "web") {
    // Full navigation — caller won't see the result here; flow resumes in app/index.tsx.
    window.location.href = authUrl;
    return null;
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
  if (result.type !== "success") return null;
  const sid = parseSessionId(result.url);
  if (!sid) return null;
  return finishGoogleAuth(sid);
}

export async function finishGoogleAuth(session_id: string): Promise<AppUser> {
  const res = await api.googleAuth(session_id);
  await api.setToken(res.access_token);
  return res.user;
}

export function maybeExtractWebSessionId(): string | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const url = window.location.href;
  const sid = parseSessionId(url);
  if (sid) {
    // Clean up url so subsequent reloads don't retry
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      // ignore
    }
  }
  return sid;
}
