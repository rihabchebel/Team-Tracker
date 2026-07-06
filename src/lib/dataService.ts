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

export const dataService = {
  // ============================================
  // PROJECTS
  // ============================================

  getAllProjects: async (): Promise<Project[]> => {
    try {
      console.log("📋 Fetching projects...");

      // Get projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.warn("Could not fetch projects:", projectsError);
        return [];
      }

      console.log(`📋 Found ${projects?.length || 0} projects`);

      // Get sub-projects - SIMPLE QUERY without joins
      let subProjects: any[] = [];
      try {
        const { data, error } = await supabase.from("sub_projects").select("*");
        if (!error && data) {
          subProjects = data;
          console.log(`📋 Found ${subProjects.length} sub-projects`);
        } else {
          console.warn("Could not fetch sub-projects:", error);
        }
      } catch (error) {
        console.warn("Error fetching sub-projects:", error);
      }

      // Get team members - SIMPLE QUERY without joins
      let teamMembers: any[] = [];
      try {
        const { data, error } = await supabase.from("team_members").select("*");
        if (!error && data) {
          teamMembers = data;
          console.log(`👥 Found ${teamMembers.length} team members`);
        } else {
          console.warn("Could not fetch team members:", error);
        }
      } catch (error) {
        console.warn("Error fetching team members:", error);
      }

      // Get user profiles separately to join in memory
      let userProfiles: any[] = [];
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*");
        if (!error && data) {
          userProfiles = data;
        }
      } catch (error) {
        console.warn("Error fetching user profiles:", error);
      }

      // Transform projects - join data in memory
      return projects.map((project: any) => {
        // Get sub-projects for this project
        const projectSubProjects = subProjects
          .filter((sp: any) => sp.project_id === project.id)
          .map((sp: any) => ({
            id: sp.id,
            name: sp.name,
            timeUsed: sp.time_used || 0,
            timeTotal: sp.time_total || 0,
          }));

        // Get team members for this project
        const projectTeamMembers = teamMembers
          .filter((tm: any) => tm.project_id === project.id)
          .map((tm: any) => {
            const profile = userProfiles.find(
              (up: any) => up.id === tm.user_id,
            );
            return {
              id: tm.user_id,
              name: profile?.full_name || "Unknown",
              email: profile?.email || "",
              role: tm.role || "developer",
              status: profile?.status
                ? ((profile.status.charAt(0).toUpperCase() +
                    profile.status.slice(1)) as any)
                : ("Active" as any),
              joined: tm.joined_at || new Date().toISOString(),
              left: tm.left_at || undefined,
            };
          });

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
  },

  getProjects: async (): Promise<Project[]> => {
    return await dataService.getAllProjects();
  },

  getProjectById: async (projectId: string): Promise<Project | null> => {
    try {
      // Get project
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      // Get sub-projects
      const { data: subProjects, error: subError } = await supabase
        .from("sub_projects")
        .select("*")
        .eq("project_id", projectId);

      if (subError) throw subError;

      // Get team members
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("*")
        .eq("project_id", projectId);

      if (teamError) throw teamError;

      // Get user profiles
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
            role: tm.role || "developer",
            joined: tm.joined_at || new Date().toISOString(),
            left: tm.left_at || undefined,
          };
        }),
      };
    } catch (error) {
      console.error("Error fetching project:", error);
      return null;
    }
  },

  createProject: async (projectData: Partial<Project>): Promise<Project> => {
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
  },

  updateProject: async (
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
  },

  deleteProject: async (projectId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  },

  // ============================================
  // SUB-PROJECTS
  // ============================================

  addSubProject: async (
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

      // Update project totals
      await dataService.updateProjectTotals(projectId);

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
  },

  updateSubProject: async (
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

      // Update project totals
      await dataService.updateProjectTotals(projectId);

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
  },

  deleteSubProject: async (
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

      // Update project totals
      await dataService.updateProjectTotals(projectId);

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
  },

  // ============================================
  // TEAM MEMBERS
  // ============================================

  updateTeamMemberRole: async (
    projectId: string,
    userId: string,
    role: string,
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role })
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating team member:", error);
      throw error;
    }
  },

  removeTeamMember: async (
    projectId: string,
    userId: string,
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing team member:", error);
      throw error;
    }
  },

  // ============================================
  // USERS / PROFILES
  // ============================================

  getAllUsers: async (): Promise<User[]> => {
    try {
      console.log("👤 Fetching users...");

      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (profilesError) {
        console.warn("Could not fetch user_profiles:", profilesError);
        return [];
      }

      console.log(`👤 Found ${profiles?.length || 0} user profiles`);

      // Get team members - SIMPLE QUERY
      let memberships: any[] = [];
      try {
        const { data, error } = await supabase.from("team_members").select("*");
        if (!error && data) {
          memberships = data;
        }
      } catch (error) {
        console.warn("Could not fetch memberships:", error);
      }

      // Get projects separately to join in memory
      let projects: any[] = [];
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name");
        if (!error && data) {
          projects = data;
        }
      } catch (error) {
        console.warn("Could not fetch projects:", error);
      }

      // Transform users - join data in memory
      return profiles.map((user: any) => {
        const userMemberships =
          memberships?.filter((m: any) => m.user_id === user.id) || [];

        // Get project names for each membership
        const membershipsWithProjects = userMemberships.map((m: any) => {
          const project = projects.find((p: any) => p.id === m.project_id);
          return {
            projectName: project?.name || "",
            role: m.role || "developer",
          };
        });

        return {
          id: user.id,
          name: user.full_name || user.email || "Unknown",
          email: user.email || "",
          created: user.created || new Date().toISOString(),
          role: user.role || "developer",
          status: user.status || "active",
          project: membershipsWithProjects[0]?.projectName || "",
          projectId: userMemberships[0]?.project_id || "",
          projectIds: userMemberships.map((m: any) => m.project_id),
          memberships: membershipsWithProjects,
        };
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  getUserById: async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("User not found:", error);
        return null;
      }

      return {
        id: data.id,
        name: data.full_name || data.email || "Unknown",
        email: data.email || "",
        created: data.created || new Date().toISOString(),
        role: data.role || "developer",
        status: data.status || "active",
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  },

  createUserProfile: async (
    user: Partial<User> & { password?: string },
  ): Promise<User | null> => {
    try {
      const insertData: any = {
        full_name: user.name,
        email: user.email,
        role: user.role || "developer",
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

      return {
        id: data.id,
        name: data.full_name || data.email || "Unknown",
        email: data.email || "",
        created: data.created || new Date().toISOString(),
        role: data.role || "developer",
        status: data.status || "active",
      };
    } catch (error) {
      console.error("Error creating user profile:", error);
      return null;
    }
  },

  addTeamMember: async (
    projectId: string,
    userId: string,
    role: string,
  ): Promise<TeamMember> => {
    try {
      const normalizedRole = String(role || "developer").toLowerCase();

      const { data: existingMembership } = await supabase
        .from("team_members")
        .select("id, role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("role", normalizedRole)
        .maybeSingle();

      if (existingMembership) {
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("full_name, email")
          .eq("id", userId)
          .single();

        return {
          id: userId,
          name: existingProfile?.full_name || "Unknown",
          email: existingProfile?.email || "",
          role: normalizedRole,
          joined: new Date().toISOString(),
        };
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      const { data, error } = await supabase
        .from("team_members")
        .insert({
          project_id: projectId,
          user_id: userId,
          role: normalizedRole,
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await recordTimelineEvent({
        project_id: projectId,
        user_id: userId,
        event_type: "team_member_added",
        description: `${profile?.full_name || "Team member"} added as ${normalizedRole}`,
        metadata: { role: normalizedRole, user_id: userId },
        created_at: new Date().toISOString(),
      });

      return {
        id: userId,
        name: profile?.full_name || "Unknown",
        email: profile?.email || "",
        role: normalizedRole,
        joined: data.joined_at || new Date().toISOString(),
        left: data.left_at || undefined,
      };
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          full_name: updates.name,
          email: updates.email,
          role: updates.role,
          status: updates.status || "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.full_name || data.email || "Unknown",
        email: data.email || "",
        created: data.created || new Date().toISOString(),
        role: data.role || "developer",
        status: data.status || "active",
      };
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    try {
      // Delete from team_members first
      const { error: teamError } = await supabase
        .from("team_members")
        .delete()
        .eq("user_id", userId);

      if (teamError) throw teamError;

      // Delete from user_profiles
      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      // Delete from auth.users (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  // ============================================
  // TASK LOGS
  // ============================================

  getAllLogs: async (): Promise<LogEntry[]> => {
    try {
      console.log("📝 Fetching logs...");

      // Get task logs - SIMPLE QUERY
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

      // Get projects separately to join in memory
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

      // Transform logs - join project names in memory
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
  },

  createLog: async (log: Partial<LogEntry>): Promise<LogEntry> => {
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

      // Update project used hours
      if (log.projectId) {
        await dataService.updateProjectTotals(log.projectId);
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
  },

  getTaskLogs: async (projectId: string): Promise<LogEntry[]> => {
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

      // Get project name
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
  },

  getProjectTimeline: async (
    projectId?: string,
  ): Promise<ProjectTimelineEvent[]> => {
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
  },

  getUserActivity: async (projectId?: string): Promise<UserActivity[]> => {
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
  },

  subscribeToDataChanges: (callback: () => void) => {
    const channel = supabase
      .channel("teamtracker-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sub_projects" },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_logs" },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_activity" },
        callback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_timeline" },
        callback,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  updateProjectTotals: async (projectId: string): Promise<void> => {
    try {
      // Get sub-project totals
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
  },

  getCurrentUserWithProfile: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const profile = await dataService.getUserById(user.id);
      return { ...user, profile };
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  // ============================================
  // FULL DATA FETCH
  // ============================================

  getAllData: async () => {
    try {
      console.log("🔄 Fetching all data...");

      const [projects, users, logs, timeline, activity] = await Promise.all([
        dataService.getAllProjects(),
        dataService.getAllUsers(),
        dataService.getAllLogs(),
        dataService.getProjectTimeline(),
        dataService.getUserActivity(),
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
  },

  refreshData: async () => {
    return await dataService.getAllData();
  },
};

export { supabase };
export default dataService;
