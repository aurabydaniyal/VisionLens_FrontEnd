import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  api,
  getStoredToken,
  QuotaInfo,
  registerApiInterceptors,
  setStoredToken,
  UserProfile,
} from '../api/client';

interface UpgradePromptState {
  open: boolean;
  reason: string;
  isQuota: boolean;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  upgradePrompt: UpgradePromptState;
  openUpgradeModal: (reason?: string, isQuota?: boolean) => void;
  closeUpgradeModal: () => void;
  loginWithToken: (token: string, profile: UserProfile) => void;
  refreshProfile: () => Promise<void>;
  setUserProfile: (profile: UserProfile) => void;
  updateQuota: (quota: QuotaInfo) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptState>({
    open: false,
    reason: '',
    isQuota: false,
  });

  const openUpgradeModal = useCallback((reason = '', isQuota = false) => {
    setUpgradePrompt({ open: true, reason, isQuota });
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradePrompt((prev) => ({ ...prev, open: false }));
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    registerApiInterceptors({
      onUnauthorized: () => {
        setUser(null);
      },
      onUpgradeRequired: (detail) => {
        openUpgradeModal(detail, false);
      },
      onQuotaExceeded: (detail) => {
        openUpgradeModal(detail, true);
      },
    });
    void refreshProfile();
  }, [openUpgradeModal, refreshProfile]);

  const loginWithToken = useCallback((token: string, profile: UserProfile) => {
    setStoredToken(token);
    setUser(profile);
    setLoading(false);
  }, []);

  const setUserProfile = useCallback((profile: UserProfile) => {
    setUser(profile);
  }, []);

  const updateQuota = useCallback((quota: QuotaInfo) => {
    setUser((prev) => (prev ? { ...prev, quota } : prev));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Revoke locally even if network fails
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        upgradePrompt,
        openUpgradeModal,
        closeUpgradeModal,
        loginWithToken,
        refreshProfile,
        setUserProfile,
        updateQuota,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
