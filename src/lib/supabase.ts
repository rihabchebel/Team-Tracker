// src/lib/supabase.ts
import { createClient, Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials not found. Using mock data.");
}

// Regular client for frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: "supabase.auth.token",
  },
});

// Admin client for backend operations (requires service role key)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// ============================================
// ROLE HELPERS - Handle JSONB arrays and strings
// ============================================

/**
 * Get the primary role from either a string or JSONB array
 */
export const getPrimaryRole = (role: any): string => {
  if (!role) return 'developer';
  
  // If it's an array, get the first element
  if (Array.isArray(role)) {
    return role.length > 0 ? String(role[0]).toLowerCase() : 'developer';
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof role === 'string') {
    try {
      const parsed = JSON.parse(role);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return String(parsed[0]).toLowerCase();
      }
      if (typeof parsed === 'string') {
        return parsed.toLowerCase();
      }
    } catch {
      // Not JSON, treat as string
      return role.toLowerCase();
    }
  }
  
  return 'developer';
};

/**
 * Get all roles from either a string or JSONB array
 */
export const getAllRoles = (role: any): string[] => {
  if (!role) return ['developer'];
  
  // If it's an array
  if (Array.isArray(role)) {
    return role.map(r => String(r).toLowerCase());
  }
  
  // If it's a string
  if (typeof role === 'string') {
    try {
      const parsed = JSON.parse(role);
      if (Array.isArray(parsed)) {
        return parsed.map(r => String(r).toLowerCase());
      }
      return [String(parsed).toLowerCase()];
    } catch {
      return [role.toLowerCase()];
    }
  }
  
  return ['developer'];
};

/**
 * Check if a user has a specific role
 */
export const hasRole = (role: any, roleToCheck: string): boolean => {
  const roles = getAllRoles(role);
  return roles.includes(roleToCheck.toLowerCase());
};

/**
 * Check if a user has multiple roles
 */
export const hasMultipleRoles = (role: any): boolean => {
  const roles = getAllRoles(role);
  return roles.length > 1;
};

// ============================================
// ADMIN HELPERS (for backend operations)
// ============================================
export const adminAuth = {
  createUser: async (email: string, password: string, userData?: any) => {
    if (!supabaseAdmin) {
      throw new Error("Service role key not configured. Cannot create user.");
    }
    
    console.log("📝 Creating user via admin API:", email);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData || {},
    });
    
    if (error) {
      console.error("❌ Admin create user error:", error);
      throw error;
    }
    console.log("✅ User created via admin API:", data.user.id);
    return data;
  },

  createUserProfile: async (userId: string, fullName: string, email: string, role: string) => {
    if (!supabaseAdmin) {
      throw new Error("Service role key not configured.");
    }
    
    // ✅ Store role as JSONB array
    const rolesArray = [role.toLowerCase()];
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: fullName,
        email: email,
        role: rolesArray, // Store as JSONB array
        roles: rolesArray, // Also store in roles column
        status: 'active',
        created: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error("❌ Admin create profile error:", error);
      throw error;
    }
    return data;
  },

  deleteUser: async (userId: string) => {
    if (!supabaseAdmin) {
      throw new Error("Service role key not configured.");
    }
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("❌ Admin delete user error:", error);
      throw error;
    }
    console.log("✅ User deleted:", userId);
  },

  // ✅ Update user roles
  updateUserRoles: async (userId: string, roles: string[]) => {
    if (!supabaseAdmin) {
      throw new Error("Service role key not configured.");
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        role: roles,
        roles: roles,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error("❌ Admin update roles error:", error);
      throw error;
    }
    return data;
  },
};

// ============================================
// AUTH HELPERS (frontend)
// ============================================
export const auth = {
  signUp: async (
    email: string,
    password: string,
    userData?: any,
    redirectTo?: string,
  ) => {
    console.log("📝 Signing up:", email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
        emailRedirectTo: redirectTo,
      },
    });
    
    if (error) {
      console.error("❌ Sign up error:", error);
      throw error;
    }
    console.log("✅ Sign up successful:", data);
    return data;
  },

  signIn: async (email: string, password: string) => {
    console.log("🔑 Signing in:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("❌ Sign in error:", error);
      throw error;
    }
    console.log("✅ Sign in successful:", data);

    if (data.session) {
      localStorage.setItem("supabase.auth.token", JSON.stringify(data.session));
    }

    return data;
  },

  signOut: async () => {
    console.log("👤 Signing out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("❌ Sign out error:", error);
      throw error;
    }
    localStorage.removeItem("supabase.auth.token");
    console.log("✅ Sign out successful");
  },

  getSession: async () => {
    console.log("🔍 Getting session...");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("❌ Get session error:", error);
      throw error;
    }
    console.log("✅ Session:", data.session ? "Found" : "Not found");
    return data.session;
  },

  getUser: async () => {
    console.log("👤 Getting user...");
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("❌ Get user error:", error);
      throw error;
    }
    console.log("✅ User:", data.user ? data.user.email : "Not found");
    return data.user;
  },

  onAuthStateChange: (
    callback: (event: string, session: Session | null) => void,
  ) => {
    console.log("🔔 Setting up auth state change listener");
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "🔄 Auth state changed:",
        event,
        session?.user?.email || "No user",
      );
      callback(event, session);
    });
  },

  resetPassword: async (email: string) => {
    console.log("🔐 Resetting password for:", email);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error("❌ Reset password error:", error);
      throw error;
    }
    console.log("✅ Reset password email sent");
    return data;
  },

  updatePassword: async (newPassword: string) => {
    console.log("🔐 Updating password");
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      console.error("❌ Update password error:", error);
      throw error;
    }
    console.log("✅ Password updated");
    return data;
  },

  updateUser: async (updates: {
    email?: string;
    password?: string;
    data?: any;
  }) => {
    console.log("👤 Updating user:", updates);
    const { data, error } = await supabase.auth.updateUser(updates);
    if (error) {
      console.error("❌ Update user error:", error);
      throw error;
    }
    console.log("✅ User updated");
    return data;
  },

  refreshSession: async () => {
    console.log("🔄 Refreshing session...");
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("❌ Refresh session error:", error);
        return null;
      }
      console.log(
        "✅ Session refreshed:",
        data.session?.user?.email || "No user",
      );
      return data.session;
    } catch (error) {
      console.error("❌ Refresh session error:", error);
      return null;
    }
  },

  isAuthenticated: async (): Promise<boolean> => {
    const session = await auth.getSession();
    return !!session;
  },
};

// Export types
export type {
  User as SupabaseUser,
  Session as SupabaseSession,
} from "@supabase/supabase-js";

// ============================================
// DATABASE TYPES
// ============================================
export type Tables = {
  user_profiles: {
    id: string;
    full_name: string;
    email: string;
    role: string | string[]; // ✅ Can be string or array
    roles: string[]; // ✅ JSONB array of roles
    status: string;
    created: string;
    updated_at: string;
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
    role: string | string[]; // ✅ Can be string or array
    joined_at: string;
    left_at: string | null;
  };
  task_logs: {
    id: string;
    project_id: string;
    user_id: string;
    sub_project_id?: string;
    date: string;
    status: "full" | "partial" | "unavailable" | "overtime";
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
    note_type:
      | "feedback"
      | "warning"
      | "praise"
      | "general"
      | "performance"
      | "task_review";
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
    console.error("Error getting user ID:", error);
    return null;
  }
};

export const getCurrentSession = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};

// ✅ FIXED: Get user profile with proper role handling
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
    
    // ✅ Normalize the role field
    if (data) {
      // Process role field
      if (data.role) {
        // If role is a string, try to parse it
        if (typeof data.role === 'string') {
          try {
            const parsed = JSON.parse(data.role);
            if (Array.isArray(parsed)) {
              data.role = parsed;
            }
          } catch {
            // Keep as string
          }
        }
      }
      
      // If roles field exists and is a string, try to parse it
      if (data.roles) {
        if (typeof data.roles === 'string') {
          try {
            const parsed = JSON.parse(data.roles);
            if (Array.isArray(parsed)) {
              data.roles = parsed;
            }
          } catch {
            // Keep as is
          }
        }
      }
    }

    return data;
  } catch (error) {
    console.error("Error getting user profile:", error);
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
    console.error("Error getting current user with profile:", error);
    return null;
  }
};

export const formatDateForDB = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
};

export const getCurrentDateISO = (): string => {
  return new Date().toISOString();
};

export const getCurrentDateFormatted = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// ============================================
// TEST HELPERS
// ============================================

export const testAuth = async () => {
  console.log("🧪 Testing auth...");
  try {
    const session = await auth.getSession();
    const user = await auth.getUser();
    console.log("Session:", session ? "✅ Active" : "❌ No session");
    console.log("User:", user ? `✅ ${user.email}` : "❌ No user");
    return { session, user };
  } catch (error) {
    console.error("❌ Auth test failed:", error);
    return null;
  }
};