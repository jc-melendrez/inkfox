import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "../api";
import type { LoginInput, MethodKey, SignupInput, User, UserRole } from "../api/types";

interface AuthApi {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  completeOnboarding: (patch: { role?: UserRole; method?: MethodKey }) => Promise<User>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.auth
      .getCurrentUser()
      .then((u) => {
        if (alive) setUserState(u);
      })
      .catch(() => {
        if (alive) setUserState(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const u = await api.auth.login(input);
    setUserState(u);
    return u;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const u = await api.auth.signup(input);
    setUserState(u);
    return u;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const u = await api.auth.loginWithGoogle();
    setUserState(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUserState(null);
  }, []);

  const completeOnboarding = useCallback(
    async (patch: { role?: UserRole; method?: MethodKey }) => {
      const u = await api.auth.completeOnboarding(patch);
      setUserState(u);
      return u;
    },
    [],
  );

  const value = useMemo<AuthApi>(
    () => ({
      user,
      loading,
      login,
      signup,
      loginWithGoogle,
      logout,
      completeOnboarding,
      setUser: setUserState,
    }),
    [user, loading, login, signup, loginWithGoogle, logout, completeOnboarding],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
