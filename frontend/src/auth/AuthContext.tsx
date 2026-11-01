import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import type { Role, User } from '../lib/types';

const TOKEN_KEY = 'zambus_token';
const USER_KEY = 'zambus_user';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() =>
    localStorage.getItem(TOKEN_KEY) ? readStoredUser() : null,
  );
  const [loading, setLoading] = useState<boolean>(Boolean(localStorage.getItem(TOKEN_KEY)));

  const saveSession = useCallback((nextUser: User, nextToken: string) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('zambus:unauthorized', onUnauthorized);
    return () => window.removeEventListener('zambus:unauthorized', onUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api<User>('/auth/me', { token })
      .then((freshUser) => {
        if (cancelled) return;
        setUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, user, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      saveSession(data.user, data.token);
      return data.user;
    },
    [saveSession],
  );

  const register = useCallback(
    async (input: { fullName: string; email: string; phoneNumber: string; password: string }) => {
      const data = await api<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: input,
      });
      saveSession(data.user, data.token);
      return data.user;
    },
    [saveSession],
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const freshUser = await api<User>('/auth/me', { token });
    localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    setUser(freshUser);
  }, [token]);

  const hasRole = useCallback(
    (...roles: Role[]) => Boolean(user && roles.includes(user.role)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, register, logout, refreshUser, hasRole }),
    [user, token, loading, login, register, logout, refreshUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
