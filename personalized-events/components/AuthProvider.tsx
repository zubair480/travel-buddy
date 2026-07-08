"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { BackendUser } from "@/lib/backend-types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: BackendUser | null;
  refresh: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<BackendUser | null>(null);

  const refresh = async () => {
    const state = await api.me();
    setUser(state.authenticated ? state.user ?? null : null);
    setStatus(state.authenticated ? "authenticated" : "anonymous");
  };

  useEffect(() => {
    refresh().catch(() => {
      setUser(null);
      setStatus("anonymous");
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      refresh,
      async login(input) {
        const nextUser = await api.login(input);
        setUser(nextUser);
        setStatus("authenticated");
      },
      async register(input) {
        const nextUser = await api.register(input);
        setUser(nextUser);
        setStatus("authenticated");
      },
      async logout() {
        await api.logout();
        setUser(null);
        setStatus("anonymous");
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
