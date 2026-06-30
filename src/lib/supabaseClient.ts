// src/lib/supabaseClient.ts
import { supabase, isSupabaseConfigured } from './supabase';
import { User, Project, LogEntry, SubProject } from '../types/models';

// Re-export supabase for convenience
export { supabase, isSupabaseConfigured };

// Remove unused formatDateForDB function

export const supabaseClient = {
  // ============ USERS ============
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    return data.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      created: u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : 'N/A',
      role: u.role || 'Developer',
      project: u.project,
      status: u.status || 'Active',
    }));
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User> => {
    const now = new Date();
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: user.name,
        email: user.email,
        role: user.role || 'Developer',
        project: user.project || null,
        status: user.status || 'Active',
        created_at: now.toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      created: now.toLocaleDateString('en-GB'),
      role: data.role,
      project: data.project,
      status: data.status,
    };
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        email: updates.email,
        role: updates.role,
        project: updates.project || null,
        status: updates.status,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      created: data.created_at ? new Date(data.created_at).toLocaleDateString('en-GB') : 'N/A',
      role: data.role,
      project: data.project,
      status: data.status,
    };
  },

  deleteUser: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // ============ PROJECTS ============
  getProjects: async (): Promise<Project[]> => {
    console.log('📊 Fetching projects from Supabase...');
    
    const { data: projects, error: pError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (pError) {
      console.error('❌ Error fetching projects:', pError);
      throw pError;
    }
    
    console.log('📊 Projects raw data:', projects);
    
    const projectsWithDetails = await Promise.all(
      (projects || []).map(async (project: any) => {
        const { data: subProjects, error: spError } = await supabase
          .from('sub_projects')
          .select('*')
          .eq('project_id', project.id);
        
        if (spError) {
          console.error('❌ Error fetching sub-projects:', spError);
        }
        
        const { data: teamMembers, error: tmError } = await supabase
          .from('team_members')
          .select(`
            *,
            user:user_id (id, name, email)
          `)
          .eq('project_id', project.id);
        
        if (tmError) {
          console.error('❌ Error fetching team members:', tmError);
        }
        
        return {
          id: project.id,
          name: project.name,
          description: project.description || '',
          totalHours: project.total_hours || 0,
          usedHours: project.used_hours || 0,
          subProjects: (subProjects || []).map((sp: any) => ({
            id: sp.id,
            name: sp.name,
            timeUsed: sp.time_used || 0,
            timeTotal: sp.time_total || 0,
          })),
          teamMembers: (teamMembers || []).map((tm: any) => ({
            id: tm.user_id,
            name: tm.user?.name || '',
            role: tm.role || 'Developer',
            joined: tm.joined_at ? new Date(tm.joined_at).toLocaleDateString('en-GB') : 'N/A',
            left: tm.left_at ? new Date(tm.left_at).toLocaleDateString('en-GB') : undefined,
          })),
        };
      })
    );
    
    console.log('📊 Projects with details:', projectsWithDetails);
    return projectsWithDetails;
  },

  getProjectById: async (id: string): Promise<Project | null> => {
    const projects = await supabaseClient.getProjects();
    return projects.find(p => p.id === id) || null;
  },

  createProject: async (project: Omit<Project, 'id'>): Promise<Project> => {
    const now = new Date();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        description: project.description || '',
        total_hours: project.totalHours || 0,
        used_hours: project.usedHours || 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      totalHours: data.total_hours || 0,
      usedHours: data.used_hours || 0,
      subProjects: [],
      teamMembers: [],
    };
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        description: updates.description,
        total_hours: updates.totalHours,
        used_hours: updates.usedHours,
        updated_at: new Date().toISOString(),
      })
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
      totalHours: data.total_hours || 0,
      usedHours: data.used_hours || 0,
      subProjects: [],
      teamMembers: [],
    };
  },

  deleteProject: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  // ============ SUB-PROJECTS ============
  addSubProject: async (projectId: string, subProject: Omit<SubProject, 'id'>): Promise<SubProject> => {
    const { data, error } = await supabase
      .from('sub_projects')
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
      console.error('Error adding sub-project:', error);
      throw error;
    }
    return {
      id: data.id,
      name: data.name,
      timeUsed: data.time_used || 0,
      timeTotal: data.time_total || 0,
    };
  },

  updateSubProject: async (id: string, updates: Partial<SubProject>): Promise<SubProject> => {
    const { data, error } = await supabase
      .from('sub_projects')
      .update({
        name: updates.name,
        time_used: updates.timeUsed,
        time_total: updates.timeTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating sub-project:', error);
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
    const { error } = await supabase
      .from('sub_projects')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting sub-project:', error);
      throw error;
    }
  },

  // ============ TEAM MEMBERS ============
  addTeamMember: async (projectId: string, userId: string, role: string): Promise<void> => {
    const { error } = await supabase
      .from('team_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role: role || 'Developer',
        joined_at: new Date().toISOString(),
      });
    if (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  },

  removeTeamMember: async (projectId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  },

  // ============ TASK LOGS ============
  getLogs: async (): Promise<LogEntry[]> => {
    const { data, error } = await supabase
      .from('task_logs')
      .select(`
        *,
        user:user_id (id, name, email),
        project:project_id (id, name)
      `)
      .order('submitted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
    
    return data.map((log: any) => ({
      id: log.id,
      project: log.project?.name || '',
      projectId: log.project_id,
      date: log.date || new Date().toISOString().split('T')[0],
      status: log.status || 'full',
      hoursWorked: log.hours_worked || 0,
      tasks: log.tasks || [],
      partialReason: log.partial_reason,
      unavailableReason: log.unavailable_reason,
      submittedBy: log.user?.name || '',
      submittedById: log.user_id,
      submittedAt: log.submitted_at || new Date().toISOString(),
    }));
  },

  createLog: async (log: Omit<LogEntry, 'id' | 'submittedAt'>): Promise<LogEntry> => {
    const { data, error } = await supabase
      .from('task_logs')
      .insert({
        project_id: log.projectId,
        user_id: log.submittedById,
        date: log.date || new Date().toISOString().split('T')[0],
        status: log.status || 'full',
        hours_worked: log.hoursWorked || 0,
        tasks: log.tasks || [],
        partial_reason: log.partialReason || null,
        unavailable_reason: log.unavailableReason || null,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating log:', error);
      throw error;
    }
    
    return {
      id: data.id,
      project: log.project,
      projectId: data.project_id,
      date: data.date || new Date().toISOString().split('T')[0],
      status: data.status || 'full',
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