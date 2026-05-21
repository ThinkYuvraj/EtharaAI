/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, clearStoredAuth, getStoredToken, storeAuthToken, USER_KEY } from '../frontend-api';

export type Role = 'admin' | 'member';

export type User = {
  id: string;
  email: string;
  role: Role;
  name?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(() => safeJsonParse<User>(localStorage.getItem(USER_KEY)));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
    setUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    // keep UI responsive; validate token by fetching current user if we have one
    const run = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      await refreshUser();
    };
    run().catch(() => {
      clearStoredAuth();
      setToken(null);
      setUser(null);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    storeAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setLoading(false);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    storeAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearStoredAuth();
  };

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout, refreshUser }),
    [user, token, loading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

