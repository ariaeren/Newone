import { storage } from "@/src/utils/storage";
import i18n from "@/src/i18n";

const TOKEN_KEY = "cyberchill_jwt";

export type AppUser = {
  id: string;
  email: string;
  username: string;
  avatar_emoji: string;
  level: number;
  current_xp: number;
  xp_to_next: number;
  total_xp: number;
  streak_count: number;
  is_pro: boolean;
  xp_boost_until: string | null;
  created_at: string;
};

export type Quest = {
  id: string;
  user_id: string;
  title: string;
  xp_reward: number;
  frequency: "daily" | "weekly";
  icon: string;
  difficulty?: "trivial" | "easy" | "medium" | "hard";
  category?: string;
  created_at: string;
  completed_today?: boolean;
};

export type Journal = {
  id: string;
  user_id: string;
  content: string;
  mood: string;
  created_at: string;
};

export type LeaderRow = {
  rank: number;
  id: string;
  username: string;
  avatar_emoji: string;
  level: number;
  total_xp: number;
  is_pro: boolean;
  is_me: boolean;
};

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await storage.secureGet(TOKEN_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...((opts.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export const api = {
  setToken: (token: string) => storage.secureSet(TOKEN_KEY, token),
  clearToken: () => storage.secureRemove(TOKEN_KEY),
  getToken: () => storage.secureGet(TOKEN_KEY, ""),

  register: (email: string, password: string, username: string) =>
    request<{ access_token: string; user: AppUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username, lang: (i18n.language || "en").split("-")[0] }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; user: AppUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  googleAuth: (session_id: string) =>
    request<{ access_token: string; user: AppUser }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ session_id, lang: (i18n.language || "en").split("-")[0] }),
    }),

  appleAuth: (data: { identity_token: string; email?: string | null; full_name?: string | null }) =>
    request<{ access_token: string; user: AppUser }>("/auth/apple", {
      method: "POST",
      body: JSON.stringify({ ...data, lang: (i18n.language || "en").split("-")[0] }),
    }),

  me: () => request<AppUser>("/auth/me"),

  updateProfile: (data: { username?: string; avatar_emoji?: string }) =>
    request<AppUser>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),

  listQuests: () => request<Quest[]>("/quests"),

  createQuest: (data: { title: string; xp_reward: number; icon: string; difficulty?: string; category?: string }) =>
    request<Quest>("/quests", { method: "POST", body: JSON.stringify(data) }),

  deleteQuest: (id: string) =>
    request<{ ok: boolean }>(`/quests/${id}`, { method: "DELETE" }),

  completeQuest: (id: string) =>
    request<{
      xp_gained: number;
      leveled_up: boolean;
      new_level: number;
      streak_count: number;
      user: AppUser;
    }>(`/quests/${id}/complete`, { method: "POST" }),

  uncompleteQuest: (id: string) =>
    request<{ xp_refunded: number; user: AppUser }>(`/quests/${id}/uncomplete`, { method: "POST" }),

  listJournals: () => request<Journal[]>("/journals"),

  createJournal: (data: { content: string; mood: string }) =>
    request<Journal>("/journals", { method: "POST", body: JSON.stringify(data) }),

  deleteJournal: (id: string) =>
    request<{ ok: boolean }>(`/journals/${id}`, { method: "DELETE" }),

  leaderboard: () =>
    request<{ top: LeaderRow[]; me: LeaderRow }>("/leaderboard"),

  activateXpBoost: () =>
    request<{ xp_boost_until: string; user: AppUser }>("/monetization/xp-boost", {
      method: "POST",
    }),

  activatePro: () =>
    request<{ ok: boolean; user: AppUser }>("/monetization/pro/activate", {
      method: "POST",
    }),

  qrisInfo: () =>
    request<{
      qris_string: string;
      amount_idr: number;
      merchant: string;
      label: string;
      expires_in: number;
    }>("/monetization/qris"),
};
