// src/lib/supabase.ts
import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Using mock data.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
  },
});

// ============================================
// AUTH HELPERS
// ============================================
export const auth = {
  signUp: async (email: string, password: string, userData?: any) => {
    console.log('📝 Signing up:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      console.error('❌ Sign up error:', error);
      throw error;
    }
    console.log('✅ Sign up successful:', data);
    return data;
  },

  signIn: async (email: string, password: string) => {
    console.log('🔑 Signing in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
    console.log('✅ Sign in successful:', data);
    
    if (data.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
    }
    
    return data;
  },

  signOut: async () => {
    console.log('👤 Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
    localStorage.removeItem('supabase.auth.token');
    console.log('✅ Sign out successful');
  },

  getSession: async () => {
    console.log('🔍 Getting session...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Get session error:', error);
      throw error;
    }
    console.log('✅ Session:', data.session ? 'Found' : 'Not found');
    return data.session;
  },

  getUser: async () => {
    console.log('👤 Getting user...');
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('❌ Get user error:', error);
      throw error;
    }
    console.log('✅ User:', data.user ? data.user.email : 'Not found');
    return data.user;
  },

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    console.log('🔔 Setting up auth state change listener');
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
      callback(event, session);
    });
  },

  resetPassword: async (email: string) => {
    console.log('🔐 Resetting password for:', email);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error('❌ Reset password error:', error);
      throw error;
    }
    console.log('✅ Reset password email sent');
    return data;
  },

  updatePassword: async (newPassword: string) => {
    console.log('🔐 Updating password');
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      console.error('❌ Update password error:', error);
      throw error;
    }
    console.log('✅ Password updated');
    return data;
  },

  updateUser: async (updates: { email?: string; password?: string; data?: any }) => {
    console.log('👤 Updating user:', updates);
    const { data, error } = await supabase.auth.updateUser(updates);
    if (error) {
      console.error('❌ Update user error:', error);
      throw error;
    }
    console.log('✅ User updated');
    return data;
  },

  refreshSession: async () => {
    console.log('🔄 Refreshing session...');
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('❌ Refresh session error:', error);
        return null;
      }
      console.log('✅ Session refreshed:', data.session?.user?.email || 'No user');
      return data.session;
    } catch (error) {
      console.error('❌ Refresh session error:', error);
      return null;
    }
  },

  isAuthenticated: async (): Promise<boolean> => {
    const session = await auth.getSession();
    return !!session;
  },
};

// Export types
export type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

// ============================================
// DATABASE TYPES
// ============================================
export type Tables = {
  users: {
    id: string;
    name: string;
    email: string;
    created_at: string;
    role: string;
    project: string | null;
    status: string | null;
    avatar_url?: string;
    department?: string;
  };
  projects: {
    id: string;
    name: string;
    description: string;
    total_hours: number;
    used_hours: number;
    created_at: string;
    updated_at: string;
    status: string;
    priority: string;
    budget: number;
  };
  sub_projects: {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    time_used: number;
    time_total: number;
    created_at: string;
    updated_at: string;
    status: string;
    priority: string;
    assigned_to: string | null;
    due_date: string | null;
  };
  team_members: {
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    left_at: string | null;
  };
  task_logs: {
    id: string;
    project_id: string;
    user_id: string;
    sub_project_id?: string;
    date: string;
    status: 'full' | 'partial' | 'unavailable' | 'overtime';
    hours_worked: number;
    tasks: { id: string; description: string }[];
    partial_reason?: string;
    unavailable_reason?: string;
    submitted_at: string;
    updated_at: string;
    approved_by: string | null;
    approved_at: string | null;
    is_approved: boolean;
  };
  supervisor_notes: {
    id: string;
    user_id: string;
    project_id: string;
    sub_project_id?: string;
    note_text: string;
    note_type: 'feedback' | 'warning' | 'praise' | 'general' | 'performance' | 'task_review';
    created_by: string;
    created_at: string;
    updated_at: string;
    is_private: boolean;
    is_archived: boolean;
    tags: string[];
  };
  user_activity: {
    id: string;
    user_id: string;
    project_id: string;
    sub_project_id?: string;
    activity_type: string;
    description: string;
    metadata: any;
    created_at: string;
    hours: number;
  };
  project_timeline: {
    id: string;
    project_id: string;
    user_id?: string;
    event_type: string;
    description: string;
    metadata: any;
    created_at: string;
  };
};

export type SupabaseClient = typeof supabase;

// ============================================
// HELPER FUNCTIONS
// ============================================

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

export const getCurrentUserId = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

export const getCurrentSession = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
    // Return the data directly, not data.user
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const getCurrentUserWithProfile = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;
    
    const profile = await getUserProfile(data.user.id);
    return { ...data.user, profile };
  } catch (error) {
    console.error('Error getting current user with profile:', error);
    return null;
  }
};

export const formatDateForDB = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

export const getCurrentDateISO = (): string => {
  return new Date().toISOString();
};

export const getCurrentDateFormatted = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// ============================================
// TEST HELPERS
// ============================================

export const testAuth = async () => {
  console.log('🧪 Testing auth...');
  try {
    const session = await auth.getSession();
    const user = await auth.getUser();
    console.log('Session:', session ? '✅ Active' : '❌ No session');
    console.log('User:', user ? `✅ ${user.email}` : '❌ No user');
    return { session, user };
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    return null;
  }
};