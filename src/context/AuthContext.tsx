// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await auth.getUser();
      setUser(currentUser || null);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        
        const session = await auth.getSession();
        if (session?.user) {
          console.log('✅ Session found for:', session.user.email);
          setUser(session.user);
        } else {
          console.log('ℹ️ No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth init error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user || null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    console.log('📝 Signing up:', email);
    try {
      const data = await auth.signUp(email, password, userData);
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('❌ Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in:', email);
    try {
      const data = await auth.signIn(email, password);
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('👤 Signing out');
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refreshUser }}>
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