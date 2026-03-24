import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, ParticipationLogin } from '../types/auth.types';
import { STORAGE_KEYS } from '../utils/constants';
import { authService } from '../api/services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (
    accessToken: string,
    user: AuthUser,
    participation: ParticipationLogin | null,
    refreshToken: string,
  ) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Carregar do localStorage sincronamente na inicialização
  const getStoredAuth = () => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (storedToken && storedUser) {
      try {
        return {
          token: storedToken,
          user: JSON.parse(storedUser) as AuthUser,
        };
      } catch {
        return { token: null, user: null };
      }
    }
    return { token: null, user: null };
  };

  const stored = getStoredAuth();
  const [user, setUser] = useState<AuthUser | null>(stored.user);
  const [token, setToken] = useState<string | null>(stored.token);

  const login = (
    accessToken: string,
    newUser: AuthUser,
    participation: ParticipationLogin | null,
    refreshToken: string,
  ) => {
    const userWithParticipation: AuthUser = {
      ...newUser,
      participation,
    };
    setToken(accessToken);
    setUser(userWithParticipation);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithParticipation));
  };

  const logout = () => {
    const rt = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    void authService.revokeRefreshToken(rt);
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

