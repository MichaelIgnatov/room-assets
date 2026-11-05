import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchCurrentUser, logoutRequest } from "../api/authApi";
import { clearToken, getToken, onUnauthorized, setToken } from "../api/tokenStorage";

export interface UserBrief { 
  id?: string; 
  name?: string; 
  avatarUrl?: string; 
  email?: string; 
  role?: "ADMIN" | "USER"; 
}

export interface AuthContextValue {
  user: UserBrief | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  // Сохраняет JWT в localStorage и загружает профиль (GET /api/auth/me). Бросает ошибку, если профиль не получен.
  signIn(token: string): Promise<void>;
  signOut(): void;
  update(patch: Partial<UserBrief>): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null);

  useEffect(() => {
    if (getToken() === null) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await fetchCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          clearToken();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onUnauthorized(() => setUser(null)), []);

  // Метод входа
  const signIn = useCallback(async (token: string) => {
    setToken(token);
    try {
      setUser(await fetchCurrentUser());
    } catch (err) {
      clearToken();
      setUser(null);
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    void logoutRequest().catch(() => undefined);
  }, []);

  const update = useCallback((p: Partial<UserBrief>) => setUser((u) => ({ ...(u ?? {}), ...p })), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, isAdmin: user?.role === "ADMIN", loading, signIn, signOut, update }),
    [user, loading, signIn, signOut, update]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
