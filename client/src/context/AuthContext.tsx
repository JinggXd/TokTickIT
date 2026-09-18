import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SafeUser } from "../types.js";
import * as api from "../api.js";

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  sessionLost: boolean;
  authError: any;
  csrfToken: string | null;
  login: (email: string, password: string) => Promise<SafeUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  refreshMe: () => Promise<SafeUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionLost, setSessionLost] = useState<boolean>(false);
  const [authError, setAuthError] = useState<any>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const fetchCsrf = useCallback(async () => {
    try {
      const data = await api.fetchCsrf();
      setCsrfToken(data.csrfToken);
      api.setGlobalCsrfToken(data.csrfToken);
    } catch {
      setCsrfToken(null);
      api.setGlobalCsrfToken(null);
    }
  }, []);

  const refreshMe = useCallback(async (): Promise<SafeUser | null> => {
    try {
      const data = await api.fetchMe();
      setUser(data.user);
      setSessionLost(false);
      setAuthError(null);
      await fetchCsrf();
      return data.user;
    } catch (err: any) {
      setUser(null);
      setSessionLost(true);
      setAuthError(err);
      try {
        localStorage.removeItem("toktickit_current_requester");
        localStorage.removeItem("toktickit_session");
      } catch {
        // Ignore localStorage errors in non-browser env
      }
      setCsrfToken(null);
      api.setGlobalCsrfToken(null);
      return null;
    }
  }, [fetchCsrf]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await api.fetchMe();
        if (isMounted) {
          setUser(data.user);
          setSessionLost(false);
          setAuthError(null);
          await fetchCsrf();
        }
      } catch (err: any) {
        if (isMounted) {
          setUser(null);
          setSessionLost(true);
          setAuthError(err);
          try {
            localStorage.removeItem("toktickit_current_requester");
            localStorage.removeItem("toktickit_session");
          } catch {
            // Ignore localStorage errors
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchCsrf]);

  const login = useCallback(
    async (email: string, password: string): Promise<SafeUser> => {
      const data = await api.login({ email, password });
      setUser(data.user);
      setSessionLost(false);
      setAuthError(null);
      await fetchCsrf();
      return data.user;
    },
    [fetchCsrf],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setSessionLost(true);
      setAuthError(null);
      try {
        localStorage.removeItem("toktickit_current_requester");
        localStorage.removeItem("toktickit_session");
      } catch {
        // Ignore localStorage errors
      }
      setCsrfToken(null);
      api.setGlobalCsrfToken(null);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
      const res = await api.changePassword({ currentPassword, newPassword, confirmPassword });
      setUser(res.user);
      await fetchCsrf();
    },
    [fetchCsrf],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sessionLost,
        authError,
        csrfToken,
        login,
        logout,
        changePassword,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      sessionLost: false,
      authError: null,
      login: async () => {
        throw new Error("useAuth must be used within an AuthProvider");
      },
      logout: async () => {},
      changePassword: async () => {},
      refreshMe: async () => null,
      csrfToken: null,
    };
  }
  return context;
}
