// src/lib/dataService.ts
import { supabase } from "./supabase";
import {
  User,
  Project,
  SubProject,
  TeamMember,
  LogEntry,
  ProjectTimelineEvent,
  UserActivity,
} from "../types/models";
import {
  getPrimaryRole,
  getAllRoles,
} from "../utils/roleUtils";

// ============================================
// CACHE MANAGER
// ============================================

class DataCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes default

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.TTL
  ): Promise<T> {
    // Check if there's a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    // Start new request
    const promise = fetcher()
      .then((data) => {
        this.cache.set(key, { data, timestamp: Date.now() });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

const cache = new DataCache();

// ============================================
// EVENT RECORDING HELPERS
// ============================================

const safeRecordEvent = async (
  table: "project_timeline" | "user_activity",
  payload: Record<string, any>,
) => {
  try {
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      console.warn(`Could not write ${table} event:`, error);
    }
  } catch (error) {
    console.warn(`Could not write ${table} event:`, error);
  }
};

const recordTimelineEvent = async (payload: Record<string, any>) =>
  safeRecordEvent("project_timeline", payload);

const recordUserActivity = async (payload: Record<string, any>) =>
  safeRecordEvent("user_activity", payload);

// ============================================
// ROLE MAPPING HELPERS
// ============================================

const profileRoleMap: Record<string, string> = {
  developer: "developer",
  supervisor: "supervisor",
  admin: "admin",
  Developer: "developer",
  Supervisor: "supervisor",
  Admin: "admin",
};

const teamRoleMap: Record<string, string> = {
  developer: "Developer",
  supervisor: "Supervisor",
  admin: "Admin",
  Developer: "Developer",
  Supervisor: "Supervisor",
  Admin: "Admin",
};

const normalizeProfileRole = (role: string): string => {
  return profileRoleMap[role?.toLowerCase()] || "developer";
};

const normalizeTeamRole = (role: string): string => {
  return teamRoleMap[role?.toLowerCase()] || "Developer";
};

// ============================================
// DATA SERVICE FUNCTIONS (Module Scoped)
// ============================================

// -------------------- CACHE MANAGEMENT --------------------

const clearCache = () => {
  cache.clear();
  console.log("🧹 Cache cleared");
};

const invalidateCache = (pattern?: string) => {
  if (pattern) {
    cache.invalidatePattern(pattern);
    console.log(`🧹 Cache invalidated for pattern: ${pattern}`);
  } else {
    cache.clear();
    console.log("🧹 Cache completely cleared");
  }
};

const getCacheSize = () => {
  return cache.getCacheSize();
};

// -------------------- PROJECTS --------------------

const getAllProjects = async (): Promise<Project[]> => {
  return cache.get("projects", async () => {
    try {
      console.log("📋 Fetching projects...");

      // Fetch all data in parallel
      const [
        { data: projects, error: projectsError },
        { data: subProjects },
        { data: teamMembers },
        { data: userProfiles },
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("sub_projects").select("*"),
        supabase.from("team_members").select("*"),
        supabase.from("user_profiles").select("*"),
      ]);

      if (projectsError) {
        console.warn("Could not fetch projects:", projectsError);
        return [];
      }

      console.log(`📋 Found ${projects?.length || 0} projects`);
      console.log(`📋 Found ${subProjects?.length || 0} sub-projects`);
      console.log(`👥 Found ${teamMembers?.length || 0} team members`);

      // Create lookup maps for faster joins
      const subProjectsMap = new Map();
      (subProjects || []).forEach((sp: any) => {
        if (!subProjectsMap.has(sp.project_id)) {
          subProjectsMap.set(sp.project_id, []);
        }
        subProjectsMap.get(sp.project_id).push(sp);
      });

      const teamMembersMap = new Map();
      (teamMembers || []).forEach((tm: any) => {
        if (!teamMembersMap.has(tm.project_id)) {
          teamMembersMap.set(tm.project_id, []);
        }
        teamMembersMap.get(tm.project_id).push(tm);
      });

      const userProfilesMap = new Map();
      (userProfiles || []).forEach((up: any) => {
        userProfilesMap.set(up.id, up);
      });

      // Transform projects
      return (projects || []).map((project: any) => {
        const projectSubProjects = (subProjectsMap.get(project.id) || []).map(
          (sp: any) => ({
            id: sp.id,
            name: sp.name,
            timeUsed: sp.time_used || 0,
            timeTotal: sp.time_total || 0,
          })
        );

        const projectTeamMembers = (teamMembersMap.get(project.id) || []).map(
          (tm: any) => {
            const profile = userProfilesMap.get(tm.user_id);
            return {
              id: tm.user_id,
              name: profile?.full_name || "Unknown",
              email: profile?.email || "",
              role: tm.role || "Developer",
              status: profile?.status
                ? ((profile.status.charAt(0).toUpperCase() +
                    profile.status.slice(1)) as any)
                : ("Active" as any),
              joined: tm.joined_at || new Date().toISOString(),
              left: tm.left_at || undefined,
            };
          }
        );

        return {
          id: project.id,
          name: project.name,
          description: project.description || "",
          status: (project.status || "active") as any,
          priority: (project.priority || "medium") as any,
          totalHours: project.total_hours || 0,
          usedHours: project.used_hours || 0,
          subProjects: projectSubProjects,
          teamMembers: projectTeamMembers,
        };
      });
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  });
};

const getProjects = async (): Promise<Project[]> => {
  return await getAllProjects();
};

const getProjectById = async (projectId: string): Promise<Project | null> => {
  return cache.get(`project_${projectId}`, async () => {
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      const { data: subProjects, error: subError } = await supabase
        .from("sub_projects")
        .select("*")
        .eq("project_id", projectId);

      if (subError) throw subError;

      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("*")
        .eq("project_id", projectId);

      if (teamError) throw teamError;

      const { data: userProfiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("*");

      if (profileError) throw profileError;

      return {
        id: project.id,
        name: project.name,
        description: project.description || "",
        status: (project.status || "active") as any,
        priority: (project.priority || "medium") as any,
        totalHours: project.total_hours || 0,
        usedHours: project.used_hours || 0,
        subProjects: subProjects.map((sp: any) => ({
          id: sp.id,
          name: sp.name,
          timeUsed: sp.time_used || 0,
          timeTotal: sp.time_total || 0,
        })),
        teamMembers: teamMembers.map((tm: any) => {
          const profile = userProfiles.find((up: any) => up.id === tm.user_id);
          return {
            id: tm.user_id,
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            role: tm.role || "Developer",
            joined: tm.joined_at || new Date().toISOString(),
            left: tm.left_at || undefined,
          };
        }),
      };
    } catch (error) {
      console.error("Error fetching project:", error);
      return null;
    }
  });
};

const createProject = async (projectData: Partial<Project>): Promise<Project> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: projectData.name,
        description: projectData.description || "",
        total_hours: projectData.totalHours || 0,
        used_hours: 0,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cache.invalidate("projects");

    await recordTimelineEvent({
      project_id: data.id,
      user_id: user?.id || null,
      event_type: "project_created",
      description: `Project ${data.name} created`,
      metadata: { name: data.name, total_hours: data.total_hours },
      created_at: new Date().toISOString(),
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      status: (data.status || "active") as any,
      priority: (data.priority || "medium") as any,
      totalHours: data.total_hours || 0,
      usedHours: data.used_hours || 0,
      subProjects: [],
      teamMembers: [],
    };
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

const updateProject = async (
  projectId: string,
  updates: Partial<Project>,
): Promise<Project> => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .update({
        name: updates.name,
        description: updates.description,
        total_hours: updates.totalHours,
        used_hours: updates.usedHours,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate(`project_${projectId}`);

    await recordTimelineEvent({
      project_id: projectId,
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      event_type: "project_updated",
      description: `Project ${data.name} updated`,
      metadata: updates,
      created_at: new Date().toISOString(),
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      status: (data.status || "active") as any,
      priority: (data.priority || "medium") as any,
      totalHours: data.total_hours || 0,
      usedHours: data.used_hours || 0,
      subProjects: [],
      teamMembers: [],
    };
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
};

const deleteProject = async (projectId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate(`project_${projectId}`);
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
};

// -------------------- SUB-PROJECTS --------------------

const updateProjectTotals = async (projectId: string): Promise<void> => {
  try {
    const { data: subProjects, error } = await supabase
      .from("sub_projects")
      .select("time_used, time_total")
      .eq("project_id", projectId);

    if (error) {
      console.warn("Could not fetch sub-projects for totals:", error);
      return;
    }

    const totalHours = subProjects.reduce(
      (sum: number, sp: any) => sum + (sp.time_total || 0),
      0,
    );
    const usedHours = subProjects.reduce(
      (sum: number, sp: any) => sum + (sp.time_used || 0),
      0,
    );

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        total_hours: totalHours,
        used_hours: usedHours,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error("Error updating project totals:", error);
  }
};

const addSubProject = async (
  projectId: string,
  subProject: Partial<SubProject>,
): Promise<SubProject> => {
  try {
    const { data, error } = await supabase
      .from("sub_projects")
      .insert({
        project_id: projectId,
        name: subProject.name,
        time_used: subProject.timeUsed || 0,
        time_total: subProject.timeTotal || 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate(`project_${projectId}`);

    await updateProjectTotals(projectId);

    await recordTimelineEvent({
      project_id: projectId,
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      event_type: "sub_project_created",
      description: `Sub-project ${data.name} created`,
      metadata: { sub_project_id: data.id, time_total: data.time_total },
      created_at: new Date().toISOString(),
    });

    return {
      id: data.id,
      name: data.name,
      timeUsed: data.time_used || 0,
      timeTotal: data.time_total || 0,
    };
  } catch (error) {
    console.error("Error adding sub-project:", error);
    throw error;
  }
};

const updateSubProject = async (
  projectId: string,
  subProjectId: string,
  updates: Partial<SubProject>,
): Promise<SubProject> => {
  try {
    const { data, error } = await supabase
      .from("sub_projects")
      .update({
        name: updates.name,
        time_used: updates.timeUsed,
        time_total: updates.timeTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subProjectId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate(`project_${projectId}`);

    await updateProjectTotals(projectId);

    await recordTimelineEvent({
      project_id: projectId,
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      event_type: "sub_project_updated",
      description: `Sub-project ${data.name} updated`,
      metadata: { sub_project_id: subProjectId, ...updates },
      created_at: new Date().toISOString(),
    });

    return {
      id: data.id,
      name: data.name,
      timeUsed: data.time_used || 0,
      timeTotal: data.time_total || 0,
    };
  } catch (error) {
    console.error("Error updating sub-project:", error);
    throw error;
  }
};

const deleteSubProject = async (
  projectId: string,
  subProjectId: string,
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("sub_projects")
      .delete()
      .eq("id", subProjectId)
      .eq("project_id", projectId);

    if (error) throw error;

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate(`project_${projectId}`);

    await updateProjectTotals(projectId);

    await recordTimelineEvent({
      project_id: projectId,
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      event_type: "sub_project_deleted",
      description: `Sub-project removed`,
      metadata: { sub_project_id: subProjectId },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting sub-project:", error);
    throw error;
  }
};

// -------------------- TEAM MEMBERS --------------------

const addTeamMember = async (
  projectId: string,
  userId: string,
  role: string,
): Promise<TeamMember> => {
  try {
    const finalRole = normalizeTeamRole(role);

    console.log(
      `📝 Adding team member: userId=${userId}, projectId=${projectId}, role=${finalRole}`,
    );

    // Check if membership already exists
    const { data: existingMembership, error: checkError } = await supabase
      .from("team_members")
      .select("id, role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.warn("Error checking existing membership:", checkError);
    }

    // ✅ Store role as JSONB array
    const rolesArray = [finalRole];

    if (existingMembership) {
      console.log(
        `User already has role ${existingMembership.role}, updating to ${finalRole}`,
      );

      const { error: updateError } = await supabase
        .from("team_members")
        .update({
          role: rolesArray, // ✅ Store as JSONB array
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMembership.id);

      if (updateError) {
        console.error("Error updating team member:", updateError);
        throw updateError;
      }

      // Invalidate cache
      cache.invalidate("projects");
      cache.invalidate(`project_${projectId}`);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      return {
        id: userId,
        name: profile?.full_name || "Unknown",
        email: profile?.email || "",
        role: finalRole,
        joined: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("team_members")
      .insert({
        project_id: projectId,
        user_id: userId,
        role: rolesArray, // ✅ Store as JSONB array
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding team member:", error);
      throw error;
    }

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate(`project_${projectId}`);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    await recordTimelineEvent({
      project_id: projectId,
      user_id: userId,
      event_type: "team_member_added",
      description: `${profile?.full_name || "Team member"} added as ${finalRole}`,
      metadata: { role: finalRole, user_id: userId },
      created_at: new Date().toISOString(),
    });

    return {
      id: userId,
      name: profile?.full_name || "Unknown",
      email: profile?.email || "",
      role: finalRole,
      joined: data.joined_at || new Date().toISOString(),
      left: data.left_at || undefined,
    };
  } catch (error) {
    console.error("Error adding team member:", error);
    throw error;
  }
};

const updateTeamMemberRole = async (
  projectId: string,
  userId: string,
  role: string,
): Promise<void> => {
  try {
    const finalRole = normalizeTeamRole(role);

    console.log(
      `📝 Updating team member role: userId=${userId}, projectId=${projectId}, role=${finalRole}`,
    );

    const { data: existingMembership, error: checkError } = await supabase
      .from("team_members")
      .select("id, role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.warn("Error checking existing membership:", checkError);
    }

    if (!existingMembership) {
      console.log("No existing membership found, adding new one...");
      // ⚠️ Fixed: referenced module-scoped function instead of dataService.addTeamMember
      await addTeamMember(projectId, userId, finalRole);
      cache.invalidate("users");
      return;
    }

    // ✅ Store role as JSONB array in team_members
    const rolesArray = [finalRole];

    const { error: updateError } = await supabase
      .from("team_members")
      .update({
        role: rolesArray, // ✅ Store as JSONB array
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMembership.id);

    if (updateError) {
      console.error("Error updating team member:", updateError);
      throw updateError;
    }

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate("users");
    cache.invalidate(`project_${projectId}`);
    
    console.log(`✅ Team member role updated to ${finalRole}`);
  } catch (error) {
    console.error("Error updating team member role:", error);
    throw error;
  }
};

const removeTeamMember = async (
  projectId: string,
  userId: string,
): Promise<void> => {
  try {
    console.log(`🗑️ Removing user ${userId} from project ${projectId} ONLY`);

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing team member:", error);
      throw error;
    }

    // Invalidate cache
    cache.invalidate("projects");
    cache.invalidate(`project_${projectId}`);

    console.log(`✅ User ${userId} removed from project ${projectId} only`);
  } catch (error) {
    console.error("Error removing team member:", error);
    throw error;
  }
};

// -------------------- USERS / PROFILES --------------------

const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      throw error;
    }

    return data.map((profile) => ({
      id: profile.id,
      name: profile.full_name || profile.email || "Unknown",
      email: profile.email || "",
      created: profile.created || new Date().toISOString(),
      role: getPrimaryRole(profile.role),
      roles: getAllRoles(profile.role),
      status: profile.status || "active",
      project: "",
      projectId: profile.project_id || "",
      projectIds: [],
      memberships: [],
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }

    return {
      id: data.id,
      name: data.full_name || data.email || "Unknown",
      email: data.email || "",
      created: data.created || new Date().toISOString(),
      role: getPrimaryRole(data.role),
      roles: getAllRoles(data.role),
      status: data.status || "active",
      project: "",
      projectId: data.project_id || "",
      projectIds: [],
      memberships: [],
    };
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
};

const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    // First delete related team memberships to avoid FK errors
    await supabase
      .from("team_members")
      .delete()
      .eq("user_id", userId);

    const { error } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("Error deleting user:", error);
      return false;
    }

    cache.invalidate("users");
    cache.invalidate(`user_${userId}`);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
};

const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  try {
    // ✅ Build update data with proper JSONB handling
    const updateData: any = {
      full_name: updates.name,
      email: updates.email,
      status: updates.status || "active",
      updated_at: new Date().toISOString(),
    };

    // ✅ Handle role updates properly for JSONB array
    if (updates.role) {
      // If role is a string, convert to JSONB array
      if (typeof updates.role === 'string') {
        // Check if it's a single role or comma-separated
        if (updates.role.includes(',')) {
          // Comma-separated roles
          const roles = updates.role.split(',').map(r => r.trim().toLowerCase());
          updateData.role = roles;
          updateData.roles = roles;
        } else {
          // Single role
          const role = updates.role.toLowerCase();
          // First, get existing roles from the user profile
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('role, roles')
            .eq('id', userId)
            .single();
          
          if (existingProfile) {
            // Get existing roles as array
            let existingRoles: string[] = [];
            if (existingProfile.roles && Array.isArray(existingProfile.roles)) {
              existingRoles = existingProfile.roles;
            } else if (existingProfile.role) {
              if (Array.isArray(existingProfile.role)) {
                existingRoles = existingProfile.role;
              } else if (typeof existingProfile.role === 'string') {
                try {
                  const parsed = JSON.parse(existingProfile.role);
                  if (Array.isArray(parsed)) {
                    existingRoles = parsed;
                  }
                } catch {
                  existingRoles = [existingProfile.role];
                }
              }
            }
            
            // Add new role if not already present
            if (!existingRoles.includes(role)) {
              existingRoles.push(role);
            }
            
            updateData.role = existingRoles;
            updateData.roles = existingRoles;
          } else {
            // No existing profile, create new array
            updateData.role = [role];
            updateData.roles = [role];
          }
        }
      } else if (Array.isArray(updates.role)) {
        // If role is already an array, use it directly
        updateData.role = updates.role;
        updateData.roles = updates.role;
      }
    }

    console.log('📝 Updating user with data:', updateData);

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase update error:", error);
      throw error;
    }

    // ✅ Normalize the response
    const userData = data;
    const primaryRole = getPrimaryRole(userData.role);
    const allRoles = getAllRoles(userData.role);

    // Invalidate cache
    cache.invalidate("users");
    cache.invalidate(`user_${userId}`);

    return {
      id: userData.id,
      name: userData.full_name || userData.email || "Unknown",
      email: userData.email || "",
      created: userData.created || new Date().toISOString(),
      role: primaryRole,
      roles: allRoles,
      status: userData.status || "active",
      project: updates.project || "",
      projectId: userData.project_id || "",
      projectIds: [],
      memberships: [],
    };
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

const createUserProfile = async (
  user: Partial<User> & { password?: string },
): Promise<User | null> => {
  try {
    const normalizedRole = normalizeProfileRole(user.role || "developer");
    
    // ✅ Store role as JSONB array
    const rolesArray = [normalizedRole];

    // First, check if user profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing profile:", checkError);
    }

    if (existingProfile) {
      // User profile already exists - update it
      console.log(`📝 User profile already exists for ${user.email}, updating...`);

      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          full_name: user.name,
          email: user.email,
          role: rolesArray, // ✅ Store as JSONB array
          roles: rolesArray, // ✅ Store as JSONB array
          status: user.status || "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user profile:", error);
        return null;
      }

      // Invalidate cache
      cache.invalidate("users");
      cache.invalidate(`user_${user.id}`);

      return {
        id: data.id,
        name: data.full_name || data.email || "Unknown",
        email: data.email || "",
        created: data.created || new Date().toISOString(),
        role: data.role?.[0] || "developer",
        status: data.status || "active",
      };
    }

    // Insert new user profile
    const insertData: any = {
      full_name: user.name,
      email: user.email,
      role: rolesArray, // ✅ Store as JSONB array
      roles: rolesArray, // ✅ Store as JSONB array
      status: user.status || "active",
      created: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (user.id) {
      insertData.id = user.id;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating user profile:", error);
      return null;
    }

    // Invalidate cache
    cache.invalidate("users");

    return {
      id: data.id,
      name: data.full_name || data.email || "Unknown",
      email: data.email || "",
      created: data.created || new Date().toISOString(),
      role: data.role?.[0] || "developer",
      status: data.status || "active",
    };
  } catch (error) {
    console.error("Error creating user profile:", error);
    return null;
  }
};

// -------------------- TASK LOGS --------------------

const getAllLogs = async (): Promise<LogEntry[]> => {
  return cache.get("logs", async () => {
    try {
      console.log("📝 Fetching logs...");

      let logs: any[] = [];
      try {
        const { data, error } = await supabase
          .from("task_logs")
          .select("*")
          .order("submitted_at", { ascending: false });
        if (!error && data) {
          logs = data;
          console.log(`📝 Found ${logs.length} logs`);
        } else {
          console.warn("Could not fetch logs:", error);
          return [];
        }
      } catch (error) {
        console.warn("Error fetching logs:", error);
        return [];
      }

      let projects: any[] = [];
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name");
        if (!error && data) {
          projects = data;
        }
      } catch (error) {
        console.warn("Could not fetch projects for logs:", error);
      }

      return logs.map((log: any) => {
        const project = projects.find((p: any) => p.id === log.project_id);
        return {
          id: log.id,
          project: project?.name || "",
          projectId: log.project_id,
          date: log.date,
          status: log.status || "full",
          hoursWorked: log.hours_worked || 0,
          tasks: log.tasks || [],
          partialReason: log.partial_reason,
          unavailableReason: log.unavailable_reason,
          submittedBy: log.submitted_by || "",
          submittedById: log.user_id,
          submittedAt: log.submitted_at,
        };
      });
    } catch (error) {
      console.error("Error fetching all logs:", error);
      return [];
    }
  });
};

const createLog = async (log: Partial<LogEntry>): Promise<LogEntry> => {
  try {
    const { data, error } = await supabase
      .from("task_logs")
      .insert({
        project_id: log.projectId,
        user_id: log.submittedById,
        date: log.date,
        hours_worked: log.hoursWorked,
        status: log.status || "full",
        tasks: log.tasks || [],
        partial_reason: log.partialReason || null,
        unavailable_reason: log.unavailableReason || null,
        submitted_at: new Date().toISOString(),
        submitted_by: log.submittedBy || "",
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cache.invalidate("logs");

    await recordTimelineEvent({
      project_id: log.projectId || "",
      user_id: log.submittedById || null,
      event_type: "task_log_created",
      description: `Task log submitted by ${log.submittedBy || "user"}`,
      metadata: {
        status: log.status,
        hours: log.hoursWorked,
        tasks: log.tasks || [],
      },
      created_at: new Date().toISOString(),
    });

    if (log.projectId && log.submittedById) {
      await recordUserActivity({
        user_id: log.submittedById,
        project_id: log.projectId,
        activity_type: "task_log",
        description: `Logged ${log.hoursWorked || 0} hours`,
        metadata: { status: log.status, tasks: log.tasks || [] },
        hours: log.hoursWorked || 0,
        created_at: new Date().toISOString(),
      });
    }

    if (log.projectId) {
      // ⚠️ Fixed: referenced module-scoped function instead of dataService.updateProjectTotals
      await updateProjectTotals(log.projectId);
      cache.invalidate("projects");
      cache.invalidate(`project_${log.projectId}`);
    }

    return {
      id: data.id,
      project: log.project || "",
      projectId: data.project_id,
      date: data.date,
      status: data.status,
      hoursWorked: data.hours_worked,
      tasks: data.tasks || [],
      partialReason: data.partial_reason,
      unavailableReason: data.unavailable_reason,
      submittedBy: data.submitted_by || "",
      submittedById: data.user_id,
      submittedAt: data.submitted_at,
    };
  } catch (error) {
    console.error("Error creating log:", error);
    throw error;
  }
};

const getTaskLogs = async (projectId: string): Promise<LogEntry[]> => {
  return cache.get(`logs_${projectId}`, async () => {
    try {
      let logs: any[] = [];
      try {
        const { data, error } = await supabase
          .from("task_logs")
          .select("*")
          .eq("project_id", projectId)
          .order("submitted_at", { ascending: false });
        if (!error && data) {
          logs = data;
        } else {
          console.warn("Could not fetch task logs:", error);
          return [];
        }
      } catch (error) {
        console.warn("Error fetching task logs:", error);
        return [];
      }

      let projectName = "";
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single();
        if (!error && data) {
          projectName = data.name;
        }
      } catch (error) {
        console.warn("Could not fetch project name:", error);
      }

      return logs.map((log: any) => ({
        id: log.id,
        project: projectName || "",
        projectId: log.project_id,
        date: log.date,
        status: log.status,
        hoursWorked: log.hours_worked,
        tasks: log.tasks || [],
        partialReason: log.partial_reason,
        unavailableReason: log.unavailable_reason,
        submittedBy: log.submitted_by || "",
        submittedById: log.user_id,
        submittedAt: log.submitted_at,
      }));
    } catch (error) {
      console.error("Error fetching task logs:", error);
      return [];
    }
  });
};

// -------------------- TIMELINE & ACTIVITY --------------------

const getProjectTimeline = async (
  projectId?: string,
): Promise<ProjectTimelineEvent[]> => {
  const cacheKey = projectId ? `timeline_${projectId}` : "timeline";
  return cache.get(cacheKey, async () => {
    try {
      let query = supabase
        .from("project_timeline")
        .select("*")
        .order("created_at", { ascending: false });
      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Could not fetch project timeline:", error);
        return [];
      }

      const { data: projects } = await supabase
        .from("projects")
        .select("id, name");
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name");

      return (data || []).map((event: any) => ({
        id: event.id,
        project_id: event.project_id,
        user_id: event.user_id,
        event_type: event.event_type,
        description: event.description,
        metadata: event.metadata,
        created_at: event.created_at,
        project_name: projects?.find((p: any) => p.id === event.project_id)
          ?.name,
        user_name: profiles?.find((u: any) => u.id === event.user_id)
          ?.full_name,
      }));
    } catch (error) {
      console.error("Error fetching project timeline:", error);
      return [];
    }
  });
};

const getUserActivity = async (projectId?: string): Promise<UserActivity[]> => {
  const cacheKey = projectId ? `activity_${projectId}` : "activity";
  return cache.get(cacheKey, async () => {
    try {
      let query = supabase
        .from("user_activity")
        .select("*")
        .order("created_at", { ascending: false });
      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Could not fetch user activity:", error);
        return [];
      }

      const { data: projects } = await supabase
        .from("projects")
        .select("id, name");
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name");

      return (data || []).map((activity: any) => ({
        id: activity.id,
        user_id: activity.user_id,
        project_id: activity.project_id,
        sub_project_id: activity.sub_project_id,
        activity_type: activity.activity_type,
        description: activity.description,
        metadata: activity.metadata,
        created_at: activity.created_at,
        hours: activity.hours || 0,
        user_name: profiles?.find((u: any) => u.id === activity.user_id)
          ?.full_name,
        project_name: projects?.find((p: any) => p.id === activity.project_id)
          ?.name,
      }));
    } catch (error) {
      console.error("Error fetching user activity:", error);
      return [];
    }
  });
};

// -------------------- REAL-TIME SUBSCRIPTIONS --------------------

const subscribeToDataChanges = (callback: () => void) => {
  const channel = supabase
    .channel("teamtracker-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "projects" },
      () => {
        cache.invalidate("projects");
        callback();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sub_projects" },
      () => {
        cache.invalidate("projects");
        callback();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "team_members" },
      () => {
        cache.invalidate("projects");
        callback();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "task_logs" },
      () => {
        cache.invalidate("logs");
        callback();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_activity" },
      () => {
        cache.invalidate("activity");
        callback();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_timeline" },
      () => {
        cache.invalidate("timeline");
        callback();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_profiles" },
      () => {
        cache.invalidate("users");
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// -------------------- MISCELLANEOUS HELPERS --------------------

const getCurrentUserWithProfile = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await getUserById(user.id);
    return { ...user, profile };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

const getAllData = async () => {
  try {
    console.log("🔄 Fetching all data...");

    const [projects, users, logs, timeline, activity] = await Promise.all([
      getAllProjects(),
      getAllUsers(),
      getAllLogs(),
      getProjectTimeline(),
      getUserActivity(),
    ]);

    console.log("✅ Data loaded:", {
      projects: projects.length,
      users: users.length,
      logs: logs.length,
      timeline: timeline.length,
      activity: activity.length,
    });

    return {
      projects,
      users,
      logs,
      timeline,
      activity,
    };
  } catch (error) {
    console.error("Error fetching all data:", error);
    return {
      projects: [],
      users: [],
      logs: [],
      timeline: [],
      activity: [],
    };
  }
};

const refreshData = async () => {
  // Force clear cache and reload
  cache.clear();
  return await getAllData();
};

// ============================================
// EXPORT THE DATA SERVICE
// ============================================

export const dataService = {
  clearCache,
  invalidateCache,
  getCacheSize,
  getAllProjects,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addSubProject,
  updateSubProject,
  deleteSubProject,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser,
  createUserProfile,
  getAllLogs,
  createLog,
  getTaskLogs,
  getProjectTimeline,
  getUserActivity,
  subscribeToDataChanges,
  updateProjectTotals,
  getCurrentUserWithProfile,
  getAllData,
  refreshData,
};

export { supabase };
export default dataService;