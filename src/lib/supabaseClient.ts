// src/lib/supabaseClient.ts
import { supabase, isSupabaseConfigured } from "./supabase";
import { User, Project, LogEntry, SubProject } from "../types/models";

// Re-export supabase for convenience
export { supabase, isSupabaseConfigured };

export const supabaseClient = {
  // ============ USERS ============
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from("user_profiles") // Changed from 'users' to 'user_profiles'
      .select("*")
      .order("created", { ascending: false }); // Changed from 'created_at' to 'created'

    if (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
    return data.map((u: any) => ({
      id: u.id,
      name: u.full_name, // Changed from 'name' to 'full_name'
      email: u.email,
      created: u.created
        ? new Date(u.created).toLocaleDateString("en-GB")
        : "N/A",
      role: u.role || "Developer",
      project: u.project,
      status: u.status || "Active",
    }));
  },

  createUser: async (user: Omit<User, "id">): Promise<User> => {
    const now = new Date();
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        full_name: user.name, // Changed from 'name' to 'full_name'
        email: user.email,
        role: user.role?.toLowerCase() || "developer", // Changed to lowercase
        project: user.project || null,
        status: user.status?.toLowerCase() || "active", // Changed to lowercase
        created: now.toISOString(), // Changed from 'created_at' to 'created'
        updated_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }
    return {
      id: data.id,
      name: data.full_name,
      email: data.email,
      created: now.toLocaleDateString("en-GB"),
      role: data.role,
      project: data.project,
      status: data.status,
    };
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    const updateData: any = {};
    if (updates.name) updateData.full_name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role.toLowerCase();
    if (updates.project !== undefined) updateData.project = updates.project;
    if (updates.status) updateData.status = updates.status.toLowerCase();
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }
    return {
      id: data.id,
      name: data.full_name,
      email: data.email,
      created: data.created
        ? new Date(data.created).toLocaleDateString("en-GB")
        : "N/A",
      role: data.role,
      project: data.project,
      status: data.status,
    };
  },

  deleteUser: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  getUserByEmail: async (email: string): Promise<any> => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user by email:", error);
      throw error;
    }
    return data;
  },

  // ============ PROJECTS ============

  getProjects: async (): Promise<Project[]> => {
    console.log("📊 Fetching projects from Supabase...");

    const { data: projects, error: pError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (pError) {
      console.error("❌ Error fetching projects:", pError);
      throw pError;
    }

    console.log("📊 Projects raw data:", projects);

    const projectsWithDetails = await Promise.all(
      (projects || []).map(async (project: any) => {
        const { data: subProjects, error: spError } = await supabase
          .from("sub_projects")
          .select("*")
          .eq("project_id", project.id);

        if (spError) {
          console.error("❌ Error fetching sub-projects:", spError);
        }

        const { data: teamMembers, error: tmError } = await supabase
          .from("team_members")
          .select(
            `
          *,
          user:user_id (id, full_name, email)
        `,
          )
          .eq("project_id", project.id);

        if (tmError) {
          console.error("❌ Error fetching team members:", tmError);
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description || "",
          status: project.status || "active", // Required by Project interface
          priority: project.priority || "medium", // Required by Project interface
          totalHours: project.total_hours || 0,
          usedHours: project.used_hours || 0,
          createdAt: project.created_at || new Date().toISOString(),
          updatedAt: project.updated_at || new Date().toISOString(),
          subProjects: (subProjects || []).map((sp: any) => ({
            id: sp.id,
            name: sp.name,
            timeUsed: sp.time_used || 0,
            timeTotal: sp.time_total || 0,
            description: sp.description || "",
            createdAt: sp.created_at || new Date().toISOString(),
            updatedAt: sp.updated_at || new Date().toISOString(),
          })),
          teamMembers: (teamMembers || []).map((tm: any) => ({
            id: tm.user_id,
            name: tm.user?.full_name || "",
            email: tm.user?.email || "",
            role: tm.role || "Developer",
            joined: tm.joined_at
              ? new Date(tm.joined_at).toLocaleDateString("en-GB")
              : "N/A",
            left: tm.left_at
              ? new Date(tm.left_at).toLocaleDateString("en-GB")
              : undefined,
          })),
        };
      }),
    );

    console.log("📊 Projects with details:", projectsWithDetails);
    return projectsWithDetails;
  },

  getProjectById: async (id: string): Promise<Project | null> => {
    const projects = await supabaseClient.getProjects();
    return projects.find((p) => p.id === id) || null;
  },


  createProject: async (project: Omit<Project, "id">): Promise<Project> => {
    const now = new Date();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: project.name,
        description: project.description || "",
        status: project.status || "active",
        priority: project.priority || "medium",
        total_hours: project.totalHours || 0,
        used_hours: project.usedHours || 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      status: data.status || "active",
      priority: data.priority || "medium",
      totalHours: data.total_hours || 0,
      usedHours: data.used_hours || 0,
      createdAt: data.created_at || now.toISOString(),
      updatedAt: data.updated_at || now.toISOString(),
      subProjects: [],
      teamMembers: [],
    };
  },


updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.totalHours !== undefined) updateData.total_hours = updates.totalHours;
  if (updates.usedHours !== undefined) updateData.used_hours = updates.usedHours;

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    status: data.status || 'active',
    priority: data.priority || 'medium',
    totalHours: data.total_hours || 0,
    usedHours: data.used_hours || 0,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    subProjects: [],
    teamMembers: [],
  };
},

  deleteProject: async (id: string): Promise<void> => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  },

  // ============ SUB-PROJECTS ============
  addSubProject: async (
    projectId: string,
    subProject: Omit<SubProject, "id">,
  ): Promise<SubProject> => {
    const { data, error } = await supabase
      .from("sub_projects")
      .insert({
        project_id: projectId,
        name: subProject.name,
        time_used: subProject.timeUsed || 0,
        time_total: subProject.timeTotal,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding sub-project:", error);
      throw error;
    }
    return {
      id: data.id,
      name: data.name,
      timeUsed: data.time_used || 0,
      timeTotal: data.time_total || 0,
    };
  },

  updateSubProject: async (
    id: string,
    updates: Partial<SubProject>,
  ): Promise<SubProject> => {
    const { data, error } = await supabase
      .from("sub_projects")
      .update({
        name: updates.name,
        time_used: updates.timeUsed,
        time_total: updates.timeTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating sub-project:", error);
      throw error;
    }
    return {
      id: data.id,
      name: data.name,
      timeUsed: data.time_used || 0,
      timeTotal: data.time_total || 0,
    };
  },

  deleteSubProject: async (id: string): Promise<void> => {
    const { error } = await supabase.from("sub_projects").delete().eq("id", id);
    if (error) {
      console.error("Error deleting sub-project:", error);
      throw error;
    }
  },

  // ============ TEAM MEMBERS ============
  // src/lib/supabaseClient.ts - Fix addTeamMember

  addTeamMember: async (
    projectId: string,
    userId: string,
    role: string,
  ): Promise<void> => {
    // Map to the exact case expected by the constraint
    const roleMap: Record<string, string> = {
      developer: "Developer",
      supervisor: "Supervisor",
      admin: "Admin",
      Developer: "Developer",
      Supervisor: "Supervisor",
      Admin: "Admin",
    };

    const normalizedInput = role?.toLowerCase() || "developer";
    const finalRole = roleMap[normalizedInput] || "Developer";

    const { error } = await supabase.from("team_members").insert({
      project_id: projectId,
      user_id: userId,
      role: finalRole, // Must be 'Supervisor', 'Developer', or 'Admin'
      joined_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  },

  removeTeamMember: async (
    projectId: string,
    userId: string,
  ): Promise<void> => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (error) {
      console.error("Error removing team member:", error);
      throw error;
    }
  },

  // ============ TASK LOGS ============
  getLogs: async (): Promise<LogEntry[]> => {
    const { data, error } = await supabase
      .from("task_logs")
      .select(
        `
        *,
        user:user_id (id, full_name, email),
        project:project_id (id, name)
      `,
      )
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error fetching logs:", error);
      throw error;
    }

    return data.map((log: any) => ({
      id: log.id,
      project: log.project?.name || "",
      projectId: log.project_id,
      date: log.date || new Date().toISOString().split("T")[0],
      status: log.status || "full",
      hoursWorked: log.hours_worked || 0,
      tasks: log.tasks || [],
      partialReason: log.partial_reason,
      unavailableReason: log.unavailable_reason,
      submittedBy: log.user?.full_name || "",
      submittedById: log.user_id,
      submittedAt: log.submitted_at || new Date().toISOString(),
    }));
  },

  createLog: async (
    log: Omit<LogEntry, "id" | "submittedAt">,
  ): Promise<LogEntry> => {
    const { data, error } = await supabase
      .from("task_logs")
      .insert({
        project_id: log.projectId,
        user_id: log.submittedById,
        date: log.date || new Date().toISOString().split("T")[0],
        status: log.status || "full",
        hours_worked: log.hoursWorked || 0,
        tasks: log.tasks || [],
        partial_reason: log.partialReason || null,
        unavailable_reason: log.unavailableReason || null,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating log:", error);
      throw error;
    }

    return {
      id: data.id,
      project: log.project,
      projectId: data.project_id,
      date: data.date || new Date().toISOString().split("T")[0],
      status: data.status || "full",
      hoursWorked: data.hours_worked || 0,
      tasks: data.tasks || [],
      partialReason: data.partial_reason,
      unavailableReason: data.unavailable_reason,
      submittedBy: log.submittedBy,
      submittedById: data.user_id,
      submittedAt: data.submitted_at || new Date().toISOString(),
    };
  },
};
