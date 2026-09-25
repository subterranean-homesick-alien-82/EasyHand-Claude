import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError, setAuthToken, setUnauthorizedHandler, type PrivateUser, type ProfileUpdate } from './api';

const TOKEN_KEY = 'easyhand.token';

interface AuthContextValue {
  user: PrivateUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { email: string; password: string; name: string; neighborhood: string; accepted_terms: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  /** Replace the cached user after an API call that returns the updated account (e.g. block/unblock). */
  setUser: (user: PrivateUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PrivateUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    (async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          setUser(await api.me());
        }
      } catch (err) {
        // A network failure keeps the stored token for next launch; an auth failure clears it.
        if (err instanceof ApiError && err.status === 401) await signOut();
        else setAuthToken(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const handleAuth = useCallback(async (promise: ReturnType<typeof api.login>) => {
    const { access_token, user: me } = await promise;
    setAuthToken(access_token);
    await AsyncStorage.setItem(TOKEN_KEY, access_token).catch(() => {});
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: (email, password) => handleAuth(api.login(email, password)),
      signUp: (data) => handleAuth(api.register(data)),
      signOut,
      updateProfile: async (data) => setUser(await api.updateProfile(data)),
      setUser,
    }),
    [user, loading, handleAuth, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

