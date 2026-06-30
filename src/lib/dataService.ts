// src/lib/dataService.ts
import { supabase } from './supabase';
import { testDB } from './testDB';
import { User, Project, LogEntry, TeamMember, SubProject } from '../types/models';

// Use mock data or real supabase based on environment
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true' || true;

export const dataService = {
  // ============ USERS ============
  getUsers: async (): Promise<User[]> => {
    if (USE_MOCK) {
      return await testDB.getUsers();
    }
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      created: u.created_at || u.created,
      role: u.role,
      project: u.project,
      projectId: u.project_id,
      status: u.status || 'Active',
    }));
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User> => {
    if (USE_MOCK) {
      return await testDB.createUser(user);
    }
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: user.name,
        email: user.email,
        role: user.role,
        project: user.project,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      created: data.created_at,
      role: data.role,
      project: data.project,
    };
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    if (USE_MOCK) {
      return await testDB.updateUser(id, updates);
    }
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        email: updates.email,
        role: updates.role,
        project: updates.project,
        status: updates.status,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteUser: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      return await testDB.deleteUser(id);
    }
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // ============ PROJECTS ============
  getProjects: async (): Promise<Project[]> => {
    if (USE_MOCK) {
      return await testDB.getProjects();
    }
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        sub_projects (*),
        team_members (
          *,
          users (id, name, email)
        )
      `);
    if (error) throw error;
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      totalHours: p.total_hours,
      usedHours: p.used_hours,
      subProjects: p.sub_projects?.map((sp: any) => ({
        id: sp.id,
        name: sp.name,
        timeUsed: sp.time_used,
        timeTotal: sp.time_total,
      })) || [],
      teamMembers: p.team_members?.map((tm: any) => ({
        id: tm.user_id,
        name: tm.users?.name || '',
        role: tm.role,
        joined: tm.joined_at || tm.joined,
        left: tm.left_at || tm.left,
      })) || [],
    }));
  },

  getProjectByName: async (name: string): Promise<Project | null> => {
    if (USE_MOCK) {
      return await testDB.getProjectByName(name);
    }
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        sub_projects (*),
        team_members (
          *,
          users (id, name, email)
        )
      `)
      .eq('name', name)
      .single();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      totalHours: data.total_hours,
      usedHours: data.used_hours,
      subProjects: data.sub_projects?.map((sp: any) => ({
        id: sp.id,
        name: sp.name,
        timeUsed: sp.time_used,
        timeTotal: sp.time_total,
      })) || [],
      teamMembers: data.team_members?.map((tm: any) => ({
        id: tm.user_id,
        name: tm.users?.name || '',
        role: tm.role,
        joined: tm.joined_at || tm.joined,
        left: tm.left_at || tm.left,
      })) || [],
    };
  },

  createProject: async (project: Omit<Project, 'id'>): Promise<Project> => {
    if (USE_MOCK) {
      return await testDB.createProject(project);
    }
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        description: project.description,
        total_hours: project.totalHours,
        used_hours: project.usedHours || 0,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      totalHours: data.total_hours,
      usedHours: data.used_hours,
      subProjects: [],
      teamMembers: [],
    };
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    if (USE_MOCK) {
      return await testDB.updateProject(id, updates);
    }
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        description: updates.description,
        total_hours: updates.totalHours,
        used_hours: updates.usedHours,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteProject: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      return await testDB.deleteProject(id);
    }
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },

  // ============ SUB-PROJECTS ============
  addSubProject: async (projectId: string, subProject: Omit<SubProject, 'id'>): Promise<Project> => {
    if (USE_MOCK) {
      return await testDB.addSubProject(projectId, subProject);
    }
    const { error } = await supabase
      .from('sub_projects')
      .insert({
        project_id: projectId,
        name: subProject.name,
        time_used: subProject.timeUsed || 0,
        time_total: subProject.timeTotal,
      });
    if (error) throw error;
    const project = await dataService.getProjectByName((await dataService.getProjects()).find(p => p.id === projectId)?.name || '');
    return project!;
  },

  updateSubProject: async (projectId: string, subProjectId: string, updates: Partial<SubProject>): Promise<Project> => {
    if (USE_MOCK) {
      return await testDB.updateSubProject(projectId, subProjectId, updates);
    }
    const { error } = await supabase
      .from('sub_projects')
      .update({
        name: updates.name,
        time_used: updates.timeUsed,
        time_total: updates.timeTotal,
      })
      .eq('id', subProjectId);
    if (error) throw error;
    const project = await dataService.getProjectByName((await dataService.getProjects()).find(p => p.id === projectId)?.name || '');
    return project!;
  },

  deleteSubProject: async (projectId: string, subProjectId: string): Promise<Project> => {
    if (USE_MOCK) {
      return await testDB.deleteSubProject(projectId, subProjectId);
    }
    const { error } = await supabase.from('sub_projects').delete().eq('id', subProjectId);
    if (error) throw error;
    const project = await dataService.getProjectByName((await dataService.getProjects()).find(p => p.id === projectId)?.name || '');
    return project!;
  },

  // ============ TEAM MEMBERS ============
  addTeamMember: async (projectId: string, member: TeamMember): Promise<Project> => {
    if (USE_MOCK) {
      return await testDB.addTeamMember(projectId, member);
    }
    const { error } = await supabase
      .from('team_members')
      .insert({
        project_id: projectId,
        user_id: member.id,
        role: member.role,
        joined_at: member.joined || new Date().toISOString(),
      });
    if (error) throw error;
    const project = await dataService.getProjectByName((await dataService.getProjects()).find(p => p.id === projectId)?.name || '');
    return project!;
  },

  removeTeamMember: async (projectId: string, memberId: string): Promise<Project> => {
    if (USE_MOCK) {
      return await testDB.removeTeamMember(projectId, memberId);
    }
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId);
    if (error) throw error;
    const project = await dataService.getProjectByName((await dataService.getProjects()).find(p => p.id === projectId)?.name || '');
    return project!;
  },

  // ============ TASK LOGS ============
  getLogs: async (): Promise<LogEntry[]> => {
    if (USE_MOCK) {
      return await testDB.getLogs();
    }
    const { data, error } = await supabase
      .from('task_logs')
      .select(`
        *,
        users (id, name, email),
        projects (id, name)
      `)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data.map((log: any) => ({
      id: log.id,
      project: log.projects?.name || '',
      projectId: log.project_id,
      date: log.date,
      status: log.status,
      hoursWorked: log.hours_worked,
      tasks: log.tasks || [],
      partialReason: log.partial_reason,
      unavailableReason: log.unavailable_reason,
      submittedBy: log.users?.name || '',
      submittedById: log.user_id,
      submittedAt: log.submitted_at,
    }));
  },

  createLog: async (log: Omit<LogEntry, 'id' | 'submittedAt'>): Promise<LogEntry> => {
    if (USE_MOCK) {
      return await testDB.createLog(log);
    }
    const { data, error } = await supabase
      .from('task_logs')
      .insert({
        project_id: log.projectId,
        user_id: log.submittedById,
        date: log.date,
        status: log.status,
        hours_worked: log.hoursWorked,
        tasks: log.tasks,
        partial_reason: log.partialReason,
        unavailable_reason: log.unavailableReason,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      project: log.project,
      projectId: data.project_id,
      date: data.date,
      status: data.status,
      hoursWorked: data.hours_worked,
      tasks: data.tasks || [],
      partialReason: data.partial_reason,
      unavailableReason: data.unavailable_reason,
      submittedBy: log.submittedBy,
      submittedById: data.user_id,
      submittedAt: data.submitted_at,
    };
  },

  // ============ SYNC HELPERS ============
  getAllData: async () => {
    const [users, projects, logs] = await Promise.all([
      dataService.getUsers(),
      dataService.getProjects(),
      dataService.getLogs(),
    ]);
    return { users, projects, logs };
  },

  syncUserMemberships: async (userId: string): Promise<User> => {
    if (USE_MOCK) {
      const user = await testDB.getUsers().then(users => users.find(u => u.id === userId));
      return user!;
    }
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        memberships:team_members(
          project_id,
          role,
          joined_at,
          left_at,
          projects(name)
        )
      `)
      .eq('id', userId)
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      created: data.created_at,
      role: data.role,
      project: data.project,
      memberships: data.memberships?.map((m: any) => ({
        projectName: m.projects?.name || '',
        role: m.role,
      })),
    };
  },
};

export const useDataService = () => {
  return dataService;
};