// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  getUserProfile,
  getUserTeamMemberships,
  getSupervisorProjects,
  getDeveloperProjects,
  isUserAdmin,
  DashboardMode,
  getUserDashboardMode,
} from "../utils/roleUtils";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
  teamMemberships: any[];
  supervisorProjects: any[];
  developerProjects: any[];
  isAdmin: boolean;
  dashboardMode: DashboardMode;
  setDashboardMode: (m: DashboardMode) => void;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [teamMemberships, setTeamMemberships] = useState<any[]>([]);
  const [supervisorProjects, setSupervisorProjects] = useState<any[]>([]);
  const [developerProjects, setDeveloperProjects] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("none");

  const refreshUser = async () => {
    try {
      const currentUser = await auth.getUser();
      const u = currentUser || null;
      setUser(u);

      if (u?.id) {
        const p = await getUserProfile(u.id);
        setProfile(p || null);

        const memberships = await getUserTeamMemberships(u.id);
        setTeamMemberships(memberships || []);

        const [sProjects, dProjects] = await Promise.all([
          getSupervisorProjects(u.id),
          getDeveloperProjects(u.id),
        ]);
        setSupervisorProjects(sProjects || []);
        setDeveloperProjects(dProjects || []);

        const adminFlag = await isUserAdmin(u.id);
        setIsAdmin(!!adminFlag);

        const mode = await getUserDashboardMode(u.id);
        setDashboardMode(mode);
      } else {
        setProfile(null);
        setTeamMemberships([]);
        setSupervisorProjects([]);
        setDeveloperProjects([]);
        setIsAdmin(false);
        setDashboardMode("none");
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("🔄 Initializing auth...");

        const session = await auth.getSession();
        if (session?.user) {
          console.log("✅ Session found for:", session.user.email);
          setUser(session.user);

          // Fetch profile and memberships for the signed-in user
          try {
            const p = await getUserProfile(session.user.id);
            setProfile(p || null);

            const memberships = await getUserTeamMemberships(session.user.id);
            setTeamMemberships(memberships || []);

            const [sProjects, dProjects] = await Promise.all([
              getSupervisorProjects(session.user.id),
              getDeveloperProjects(session.user.id),
            ]);
            setSupervisorProjects(sProjects || []);
            setDeveloperProjects(dProjects || []);

            const adminFlag = await isUserAdmin(session.user.id);
            setIsAdmin(!!adminFlag);

            const mode = await getUserDashboardMode(session.user.id);
            setDashboardMode(mode);
          } catch (err) {
            console.error("Error fetching profile/memberships on init:", err);
          }
        } else {
          console.log("ℹ️ No session found");
          localStorage.removeItem("supabase.auth.token");
          setUser(null);
        }
      } catch (error) {
        console.error("❌ Auth init error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, session) => {
      console.log(
        "🔄 Auth state changed:",
        event,
        session?.user?.email || "No user",
      );

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session?.user || null);

        // refresh profile + memberships
        if (session?.user?.id) {
          refreshUser().catch((e) => console.error(e));
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "USER_UPDATED") {
        setUser(session?.user || null);
        if (session?.user?.id) refreshUser().catch((e) => console.error(e));
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    console.log("📝 Signing up:", email);
    try {
      const data = await auth.signUp(email, password, userData);
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("❌ Sign up error:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log("🔑 Signing in:", email);
    try {
      const data = await auth.signIn(email, password);
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("❌ Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log("👤 Signing out");
    try {
      await auth.signOut();
      setUser(null);
      setProfile(null);
      setTeamMemberships([]);
      setSupervisorProjects([]);
      setDeveloperProjects([]);
      setIsAdmin(false);
      setDashboardMode("none");
    } catch (error) {
      console.error("❌ Sign out error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profile,
        teamMemberships,
        supervisorProjects,
        developerProjects,
        isAdmin,
        dashboardMode,
        setDashboardMode,
        signUp,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
