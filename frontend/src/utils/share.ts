/**
 * GRYND — Social share utility.
 * Lightweight, cross-platform (web + native). Uses Web Share API when available,
 * falls back to opening platform-specific share intents in a new tab/window.
 */
import { Platform, Share as RNShare, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";

export type ShareTarget =
  | "native"
  | "twitter"
  | "facebook"
  | "whatsapp"
  | "telegram"
  | "linkedin"
  | "reddit"
  | "pinterest"
  | "copy";

export type SharePayload = {
  title: string;
  body: string;
  url?: string;
  hashtags?: string; // space-separated like "#GRYND #LevelUp"
};

function buildText(p: SharePayload): string {
  const parts = [p.body];
  if (p.hashtags) parts.push(p.hashtags);
  return parts.filter(Boolean).join("\n\n");
}

function buildFullText(p: SharePayload): string {
  const parts = [p.body];
  if (p.url) parts.push(p.url);
  if (p.hashtags) parts.push(p.hashtags);
  return parts.filter(Boolean).join("\n");
}

export function getShareUrl(target: ShareTarget, p: SharePayload): string | null {
  const url = encodeURIComponent(p.url || "");
  const text = encodeURIComponent(buildText(p));
  const title = encodeURIComponent(p.title);

  switch (target) {
    case "twitter":
      // X share URL
      return `https://twitter.com/intent/tweet?text=${text}${p.url ? `&url=${url}` : ""}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
    case "whatsapp":
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(buildFullText(p))}`;
    case "telegram":
      return `https://t.me/share/url?url=${url}&text=${text}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${url}&title=${title}`;
    case "pinterest":
      return `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`;
    default:
      return null;
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await Clipboard.setStringAsync(text);
  } catch {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }
}

/**
 * Share via native OS share sheet (mobile) or Web Share API (web if supported).
 * Returns true if shared, false if user cancelled or unsupported.
 */
export async function nativeShare(p: SharePayload): Promise<boolean> {
  const text = buildFullText(p);

  if (Platform.OS === "web") {
    // @ts-ignore - navigator.share might not exist
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // @ts-ignore
        await navigator.share({ title: p.title, text: buildText(p), url: p.url });
        return true;
      } catch {
        return false;
      }
    }
    // No native share — caller should show fallback sheet.
    return false;
  }

  try {
    const result = await RNShare.share({
      title: p.title,
      message: text,
      url: p.url, // iOS only
    });
    return result.action !== RNShare.dismissedAction;
  } catch {
    return false;
  }
}

/**
 * Open a specific social-network share URL in a new tab (web) or external browser (native).
 */
export async function shareTo(target: ShareTarget, p: SharePayload): Promise<void> {
  if (target === "copy") {
    await copyToClipboard(buildFullText(p));
    return;
  }
  if (target === "native") {
    await nativeShare(p);
    return;
  }
  const url = getShareUrl(target, p);
  if (!url) return;

  if (Platform.OS === "web") {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = url;
    }
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    // ignore
  }
}

/**
 * Build a shareable invite/profile URL for the running app.
 * Uses EXPO_PUBLIC_BACKEND_URL preview origin as a stand-in. In production,
 * point this at your marketing site / deep link.
 */
export function buildInviteUrl(username?: string | null): string {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL || "https://grynd.app";
  const u = (username || "").trim();
  if (!u) return `${base}/api/u/grynd`;
  return `${base}/api/u/${encodeURIComponent(u)}`;
}
