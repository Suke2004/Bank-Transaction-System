"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, getMe, logoutUser } from "../api/auth";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  hasPinSetup: boolean;
  loading: boolean;
  login: (userData: User, hasPin: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasPinSetup, setHasPinSetup] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const data = await getMe();
      if (data && data.user) {
        setUser(data.user);
        setHasPinSetup(data.hasPinSetup);
      } else {
        setUser(null);
        setHasPinSetup(false);
      }
    } catch (err) {
      setUser(null);
      setHasPinSetup(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((userData: User, hasPin: boolean) => {
    setUser(userData);
    setHasPinSetup(hasPin);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      // Even if API fails, clear client state
    } finally {
      setUser(null);
      setHasPinSetup(false);
      router.push("/login");
    }
  }, [router]);

  // Check auth session on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listener for token expiration events (from client.ts interceptor)
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setHasPinSetup(false);
      router.push("/login?expired=true");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unauthorized-session-expired", handleSessionExpired);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("unauthorized-session-expired", handleSessionExpired);
      }
    };
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, hasPinSetup, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
