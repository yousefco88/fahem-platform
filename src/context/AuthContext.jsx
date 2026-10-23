import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const configured = Boolean(supabase);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, role, full_name }
  const [loading, setLoading] = useState(configured);
  const [authError, setAuthError] = useState('');

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('profiles fetch failed:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data || null);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession || null);
      if (newSession?.user) loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: 'الربط مع Supabase غير مكوّن.' };
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'بيانات الدخول غير صحيحة.'
        : error.message;
      setAuthError(msg);
      return { error: msg };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!supabase) return { error: 'الربط مع Supabase غير مكوّن.' };
    setAuthError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } }
    });
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = {
    configured,
    loading,
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || null,
    authError,
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
