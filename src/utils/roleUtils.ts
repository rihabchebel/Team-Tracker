// src/utils/roleUtils.ts
import { supabase, getUserProfile as getProfileFromLib } from "../lib/supabase";

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

/**
 * Get the display name for a role
 */
export const getRoleDisplayName = (role: any): string => {
  const primaryRole = getPrimaryRole(role);
  const displayMap: Record<string, string> = {
    admin: 'Admin',
    supervisor: 'Supervisor',
    developer: 'Developer',
    guest: 'Guest',
    'project manager': 'Project Manager',
    'project-manager': 'Project Manager',
    pm: 'Project Manager',
    lead: 'Team Lead',
    'team lead': 'Team Lead',
    'team-lead': 'Team Lead',
    designer: 'Designer',
    'ui/ux': 'UI/UX Designer',
    'ui-ux': 'UI/UX Designer',
    qa: 'QA Engineer',
    tester: 'Tester',
    devops: 'DevOps Engineer',
    analyst: 'Analyst',
    'business analyst': 'Business Analyst',
    'business-analyst': 'Business Analyst',
    contractor: 'Contractor',
    intern: 'Intern',
    consultant: 'Consultant',
  };
  return displayMap[primaryRole] || primaryRole || 'Developer';
};

/**
 * Get the CSS class for a role badge
 */
export const getRoleBadgeClass = (role: any): string => {
  const primaryRole = getPrimaryRole(role);
  const roleMap: Record<string, string> = {
    admin: 'role-admin',
    supervisor: 'role-supervisor',
    developer: 'role-developer',
    guest: 'role-guest',
    'project manager': 'role-project-manager',
    'project-manager': 'role-project-manager',
    pm: 'role-pm',
    lead: 'role-lead',
    'team lead': 'role-team-lead',
    'team-lead': 'role-team-lead',
    designer: 'role-designer',
    'ui/ux': 'role-ui-ux',
    'ui-ux': 'role-ui-ux',
    qa: 'role-qa',
    tester: 'role-tester',
    devops: 'role-devops',
    analyst: 'role-analyst',
    'business analyst': 'role-business-analyst',
    'business-analyst': 'role-business-analyst',
    contractor: 'role-contractor',
    intern: 'role-intern',
    consultant: 'role-consultant',
  };
  return roleMap[primaryRole] || 'role-developer';
};

/**
 * Get the priority of a role for sorting
 */
export const getRolePriority = (role: any): number => {
  const primaryRole = getPrimaryRole(role);
  switch (primaryRole) {
    case 'admin': return 0;
    case 'supervisor': return 1;
    case 'developer': return 2;
    default: return 3;
  }
};

// ============================================
// EXISTING FUNCTIONS - FIXED for JSONB arrays
// ============================================

export async function getUserProfile(userId: string) {
  return await getProfileFromLib(userId);
}

export async function getUserTeamMemberships(userId: string) {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching team memberships:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error getting team memberships:", err);
    return [];
  }
}

// ✅ FIXED: Check if user is supervisor in any project
export async function getSupervisorProjects(userId: string) {
  const memberships = await getUserTeamMemberships(userId);
  
  // ✅ Check both string and JSONB array roles
  const supervisorIds = (memberships || [])
    .filter((m: any) => {
      const role = m.role;
      // Check if role is "Supervisor" (string) or contains "supervisor" in array
      if (typeof role === 'string') {
        return role.toLowerCase() === 'supervisor';
      }
      if (Array.isArray(role)) {
        return role.some(r => String(r).toLowerCase() === 'supervisor');
      }
      // Try to parse JSON
      try {
        const parsed = JSON.parse(role);
        if (Array.isArray(parsed)) {
          return parsed.some(r => String(r).toLowerCase() === 'supervisor');
        }
        return String(parsed).toLowerCase() === 'supervisor';
      } catch {
        return String(role).toLowerCase() === 'supervisor';
      }
    })
    .map((m: any) => m.project_id);

  if (supervisorIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("id", supervisorIds);

    if (error) {
      console.error("Error fetching supervisor projects:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error getting supervisor projects:", err);
    return [];
  }
}

// ✅ FIXED: Check if user is developer in any project
export async function getDeveloperProjects(userId: string) {
  const memberships = await getUserTeamMemberships(userId);
  
  // ✅ Check both string and JSONB array roles
  const developerIds = (memberships || [])
    .filter((m: any) => {
      const role = m.role;
      // Check if role is "Developer" (string) or contains "developer" in array
      if (typeof role === 'string') {
        return role.toLowerCase() === 'developer';
      }
      if (Array.isArray(role)) {
        return role.some(r => String(r).toLowerCase() === 'developer');
      }
      // Try to parse JSON
      try {
        const parsed = JSON.parse(role);
        if (Array.isArray(parsed)) {
          return parsed.some(r => String(r).toLowerCase() === 'developer');
        }
        return String(parsed).toLowerCase() === 'developer';
      } catch {
        return String(role).toLowerCase() === 'developer';
      }
    })
    .map((m: any) => m.project_id);

  if (developerIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("id", developerIds);

    if (error) {
      console.error("Error fetching developer projects:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error getting developer projects:", err);
    return [];
  }
}

// ✅ FIXED: Check if user is admin
export async function isUserAdmin(userId: string) {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return false;
    
    // Check both role and roles fields
    const role = profile.role;
    const roles = profile.roles;
    
    // Check role field
    if (role) {
      const primaryRole = getPrimaryRole(role);
      if (primaryRole === 'admin') return true;
    }
    
    // Check roles field
    if (roles) {
      const allRoles = getAllRoles(roles);
      if (allRoles.includes('admin')) return true;
    }
    
    return false;
  } catch (err) {
    console.error("Error checking admin status:", err);
    return false;
  }
}

// ✅ FIXED: Get user's dashboard mode
export async function getUserDashboardMode(userId: string): Promise<DashboardMode> {
  try {
    if (!userId) return "none";

    // Check if admin first
    const admin = await isUserAdmin(userId);
    if (admin) return "admin";

    const [supervisorProjects, developerProjects] = await Promise.all([
      getSupervisorProjects(userId),
      getDeveloperProjects(userId),
    ]);

    const sCount = (supervisorProjects || []).length;
    const dCount = (developerProjects || []).length;

    if (sCount > 0 && dCount === 0) return "supervisor";
    if (dCount > 0 && sCount === 0) return "developer";
    if (sCount > 0 && dCount > 0) return "both";

    return "none";
  } catch (err) {
    console.error("Error determining dashboard mode:", err);
    return "none";
  }
}

export type DashboardMode =
  | "admin"
  | "supervisor"
  | "developer"
  | "both"
  | "none";