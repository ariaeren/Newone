import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import { api, AppUser } from "./client";
import { finishGoogleAuth, maybeExtractWebSessionId, startGoogleSignIn } from "./social-auth";
import { registerForPushAsync } from "@/src/utils/push";

type AuthCtx = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<AppUser | null>;
  signInWithApple: () => Promise<AppUser | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: AppUser) => void;
  appleAvailable: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      // Check apple availability (iOS native only)
      if (Platform.OS === "ios") {
        try {
          const ok = await AppleAuthentication.isAvailableAsync();
          setAppleAvailable(ok);
        } catch {
          setAppleAvailable(false);
        }
      }

      // 1) Handle web Google OAuth callback (session_id in URL)
      const sid = maybeExtractWebSessionId();
      if (sid) {
        try {
          const u = await finishGoogleAuth(sid);
          setUser(u);
          setLoading(false);
          return;
        } catch {
          // fall through to normal session check
        }
      }

      // 2) Resume existing session
      const token = await api.getToken();
      if (token) {
        try {
          const me = await api.me();
          setUser(me);
          // best-effort push registration (no UI prompt blocks UX)
          registerForPushAsync().catch(() => {});
        } catch {
          await api.clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await api.setToken(res.access_token);
    setUser(res.user);
    registerForPushAsync().catch(() => {});
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      const res = await api.register(email, password, username);
      await api.setToken(res.access_token);
      setUser(res.user);
      registerForPushAsync().catch(() => {});
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const u = await startGoogleSignIn();
    if (u) setUser(u);
    return u;
  }, []);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign-In is only available on iOS");
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token");
    }
    const fullName = credential.fullName
      ? `${credential.fullName.givenName ?? ""} ${credential.fullName.familyName ?? ""}`.trim()
      : null;
    const res = await api.appleAuth({
      identity_token: credential.identityToken,
      email: credential.email,
      full_name: fullName || null,
    });
    await api.setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    await api.clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      refresh,
      setUser,
      appleAvailable,
    }),
    [user, loading, signIn, signUp, signInWithGoogle, signInWithApple, signOut, refresh, appleAvailable]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
