import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, AppUser } from "./client";

type AuthCtx = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: AppUser) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await api.getToken();
      if (token) {
        try {
          const me = await api.me();
          setUser(me);
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
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      const res = await api.register(email, password, username);
      await api.setToken(res.access_token);
      setUser(res.user);
    },
    []
  );

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
    () => ({ user, loading, signIn, signUp, signOut, refresh, setUser }),
    [user, loading, signIn, signUp, signOut, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
