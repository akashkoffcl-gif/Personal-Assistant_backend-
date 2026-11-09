'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { api, setApiAuthToken } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  timezone?: string;
  dateFormat?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  loginAsDemo: () => void;
  register: (fullName: string, email: string, password: string) => Promise<{ error?: string; requireVerification?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  updateProfile: (data: { fullName?: string; timezone?: string; dateFormat?: string }) => Promise<{ error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => ({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo@assistant.local',
    user_metadata: { full_name: 'Selma Knight' },
  } as any));
  const [profile, setProfile] = useState<UserProfile | null>(() => ({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo@assistant.local',
    fullName: 'Selma Knight',
    timezone: 'UTC',
  }));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Synchronize profile from backend
  const fetchProfile = useCallback(async (token: string) => {
    try {
      setApiAuthToken(token);
      const res = await api.getAuthProfile();
      if (res?.user) {
        setProfile({
          id: res.user.id,
          email: res.user.email,
          fullName: res.user.fullName,
          timezone: res.user.timezone,
        });
      }
    } catch {
      // Fallback to user metadata if API is pending
    }
  }, []);

  useEffect(() => {
    // 1. Initial session bootstrap
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user ?? null);
        if (session.access_token) {
          setApiAuthToken(session.access_token);
          fetchProfile(session.access_token);
        }
        setIsLoading(false);
      } else {
        // Default to demo session for instant local access if no active session
        const isDemo = true;
        if (isDemo) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('assistant_demo_mode', 'true');
          }
          const demoUser: any = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'demo@assistant.local',
            user_metadata: { full_name: 'Selma Knight' },
          };
          setUser(demoUser);
          setProfile({
            id: '00000000-0000-0000-0000-000000000001',
            email: 'demo@assistant.local',
            fullName: 'Selma Knight',
            timezone: 'UTC',
          });
          const demoToken =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';
          setApiAuthToken(demoToken);
        } else {
          setSession(null);
          setUser(null);
          const demoToken =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';
          setApiAuthToken(demoToken);
          setProfile(null);
        }
        setIsLoading(false);
      }
    });

    // 2. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.access_token) {
        setApiAuthToken(newSession.access_token);
        await fetchProfile(newSession.access_token);
      } else {
        setApiAuthToken(null);
        setProfile(null);
        queryClient.clear(); // Wipe query cache to ensure zero data flashing across accounts
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, queryClient]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          setApiAuthToken(data.session.access_token);
          queryClient.clear();
          await fetchProfile(data.session.access_token);
        }

        setIsLoading(false);
        return {};
      } catch (err: any) {
        setIsLoading(false);
        return { error: err.message || 'Login failed unexpectedly' };
      }
    },
    [fetchProfile, queryClient]
  );

  const loginAsDemo = useCallback(() => {
    setIsLoading(true);
    const demoUser: any = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@assistant.local',
      user_metadata: { full_name: 'Selma Knight' },
    };
    setUser(demoUser);
    setProfile({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@assistant.local',
      fullName: 'Selma Knight',
      timezone: 'UTC',
    });
    setApiAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('assistant_demo_mode', 'true');
    }
    setIsLoading(false);
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string): Promise<{ error?: string; requireVerification?: boolean }> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          setApiAuthToken(data.session.access_token);
          queryClient.clear();
          await fetchProfile(data.session.access_token);
          setIsLoading(false);
          return {};
        }

        // If email confirmation is enabled in Supabase
        setIsLoading(false);
        return { requireVerification: true };
      } catch (err: any) {
        setIsLoading(false);
        return { error: err.message || 'Registration failed unexpectedly' };
      }
    },
    [fetchProfile, queryClient]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during Supabase signout:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('assistant_demo_mode');
        sessionStorage.clear();
      }
      setSession(null);
      setUser(null);
      setProfile(null);
      setApiAuthToken(null);
      queryClient.clear();
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }, [queryClient]);

  const resetPassword = useCallback(async (email: string): Promise<{ error?: string }> => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to send recovery email' };
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update password' };
    }
  }, []);

  const updateProfile = useCallback(
    async (data: { fullName?: string; timezone?: string; dateFormat?: string }): Promise<{ error?: string }> => {
      try {
        await api.updateAuthProfile(data);
        setProfile((prev) => (prev ? { ...prev, ...data } : null));
        return {};
      } catch (err: any) {
        return { error: err.message || 'Failed to update profile' };
      }
    },
    []
  );

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setApiAuthToken(data.session.access_token);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isAuthenticated: !!user,
      login,
      loginAsDemo,
      register,
      logout,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshSession,
    }),
    [user, session, profile, isLoading, login, loginAsDemo, register, logout, resetPassword, updatePassword, updateProfile, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
