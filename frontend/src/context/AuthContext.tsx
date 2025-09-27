import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CreateUserRequest,
  LoginRequest,
  UserProfile,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
} from '../api/user';
import { registerAccessTokenListener, setAxiosAccessToken } from '../api/axios';

interface AuthContextValue {
  user: UserProfile | null;
  accessToken: string | null;
  initializing: boolean;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: CreateUserRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const syncAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setAxiosAccessToken(token);
  }, []);

  const loadProfile = useCallback(async () => {
    const profile = await getCurrentUser();
    setUser(profile);
    return profile;
  }, []);

  const refresh = useCallback(async () => {
    const { accessToken: token } = await refreshSession();
    syncAccessToken(token);
    await loadProfile();
  }, [loadProfile, syncAccessToken]);

  const login = useCallback(async (req: LoginRequest) => {
    try {
      const { accessToken: token } = await loginUser(req);
      syncAccessToken(token);
      await loadProfile();
    } catch (err) {
      syncAccessToken(null);
      setUser(null);
      throw err;
    }
  }, [loadProfile, syncAccessToken]);

  const register = useCallback(async (req: CreateUserRequest) => {
    try {
      const { accessToken: token } = await registerUser(req);
      syncAccessToken(token);
      await loadProfile();
    } catch (err) {
      syncAccessToken(null);
      setUser(null);
      throw err;
    }
  }, [loadProfile, syncAccessToken]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      syncAccessToken(null);
      setUser(null);
    }
  }, [syncAccessToken]);

  useEffect(() => {
    registerAccessTokenListener((token) => {
      syncAccessToken(token);
      if (!token) {
        setUser(null);
      }
    });
  }, [syncAccessToken]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refresh();
      } catch {
        if (mounted) {
          syncAccessToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh, syncAccessToken]);

  const value: AuthContextValue = {
    user,
    accessToken,
    initializing,
    login,
    register,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
