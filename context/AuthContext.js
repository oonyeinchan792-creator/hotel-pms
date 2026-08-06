"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getAllowedModules } from '../lib/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [allowedModules, setAllowedModules] = useState(null); // null = not loaded yet
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return; // still checking
    if (!session && pathname !== '/login') {
      router.replace('/login');
      return;
    }
    if (session) {
      supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(async ({ data }) => {
          setProfile(data);
          const modules = await getAllowedModules(data);
          setAllowedModules(modules);
        });
    } else {
      setProfile(null);
      setAllowedModules(null);
    }
  }, [session, pathname]);

  if (session === undefined && pathname !== '/login') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, profile, allowedModules }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
