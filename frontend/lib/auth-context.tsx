"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type User } from "@/lib/api";

const CITIZEN_KEY = "ss_token";
const ADMIN_KEY = "ss_admin_token";

interface Session {
  user: User | null;
  token: string | null;
}

interface AuthCtx {
  citizen: Session;
  admin: Session;
  ready: boolean;
  citizenLogin: (identifier: string, password: string) => Promise<void>;
  citizenLogout: () => void;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => void;
  refreshCitizen: (updatedUser?: User) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function load(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [citizen, setCitizen] = useState<Session>({ user: null, token: null });
  const [admin, setAdmin] = useState<Session>({ user: null, token: null });
  const [ready, setReady] = useState(false);

  // ── Restore sessions on mount — PARALLEL, not sequential ──────────────────
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const ct = load(CITIZEN_KEY);
      const at = load(ADMIN_KEY);

      // Fire both validations in parallel — no sequential await
      const [citizenUser, adminUser] = await Promise.all([
        ct
          ? api.me(ct, ac.signal).catch(() => {
            window.localStorage.removeItem(CITIZEN_KEY);
            return null;
          })
          : Promise.resolve(null),
        at
          ? api.adminMe(at, ac.signal).catch(() => {
            window.localStorage.removeItem(ADMIN_KEY);
            return null;
          })
          : Promise.resolve(null),
      ]);

      if (ac.signal.aborted) return;

      if (citizenUser && ct) setCitizen({ user: citizenUser, token: ct });
      if (adminUser && at) setAdmin({ user: adminUser, token: at });
      setReady(true);
    })();
    return () => ac.abort();
  }, []);

  // ── Login / logout ─────────────────────────────────────────────────────────
  const citizenLogin = useCallback(async (identifier: string, password: string) => {
    const { access_token } = await api.login(identifier, password);
    window.localStorage.setItem(CITIZEN_KEY, access_token);
    // Fetch user profile in parallel with storing token (token already known)
    const user = await api.me(access_token);
    setCitizen({ user, token: access_token });
  }, []);

  const citizenLogout = useCallback(() => {
    window.localStorage.removeItem(CITIZEN_KEY);
    setCitizen({ user: null, token: null });
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.adminLogin(email, password);
    window.localStorage.setItem(ADMIN_KEY, access_token);
    const user = await api.adminMe(access_token);
    setAdmin({ user, token: access_token });
  }, []);

  const adminLogout = useCallback(() => {
    window.localStorage.removeItem(ADMIN_KEY);
    setAdmin({ user: null, token: null });
  }, []);

  // ── refreshCitizen — accepts an already-fetched user to skip the extra call ─
  // Profile update already returns the updated User object; pass it directly
  // to avoid a redundant GET /api/auth/me round-trip.
  const refreshCitizen = useCallback(async (updatedUser?: User) => {
    if (updatedUser) {
      setCitizen((prev) => ({ ...prev, user: updatedUser }));
      return;
    }
    const t = load(CITIZEN_KEY);
    if (t) {
      const user = await api.me(t);
      setCitizen({ user, token: t });
    }
  }, []);

  const value = useMemo(
    () => ({ citizen, admin, ready, citizenLogin, citizenLogout, adminLogin, adminLogout, refreshCitizen }),
    [citizen, admin, ready, citizenLogin, citizenLogout, adminLogin, adminLogout, refreshCitizen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
