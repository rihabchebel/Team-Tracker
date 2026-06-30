// src/lib/dataService.ts
import { supabaseClient, isSupabaseConfigured } from './supabaseClient';
import { testDB } from './testDB';
import { User, Project, LogEntry, TeamMember, SubProject } from '../types/models';

// Determine which data source to use
const shouldUseSupabase = () => {
  const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';
  return useSupabase && isSupabaseConfigured();
};

export const dataService = {
  // ============ USERS ============
  getUsers: async (): Promise<User[]> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.getUsers();
    }
    return await testDB.getUsers();
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.createUser(user);
    }
    return await testDB.createUser(user);
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.updateUser(id, updates);
    }
    return await testDB.updateUser(id, updates);
  },

  deleteUser: async (id: string): Promise<void> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.deleteUser(id);
    }
    return await testDB.deleteUser(id);
  },

  // ============ PROJECTS ============
  getProjects: async (): Promise<Project[]> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.getProjects();
    }
    return await testDB.getProjects();
  },

  getProjectByName: async (name: string): Promise<Project | null> => {
    if (shouldUseSupabase()) {
      const projects = await supabaseClient.getProjects();
      return projects.find(p => p.name === name) || null;
    }
    return await testDB.getProjectByName(name);
  },

  createProject: async (project: Omit<Project, 'id'>): Promise<Project> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.createProject(project);
    }
    return await testDB.createProject(project);
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.updateProject(id, updates);
    }
    return await testDB.updateProject(id, updates);
  },

  deleteProject: async (id: string): Promise<void> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.deleteProject(id);
    }
    return await testDB.deleteProject(id);
  },

  // ============ SUB-PROJECTS ============
  addSubProject: async (projectId: string, subProject: Omit<SubProject, 'id'>): Promise<Project> => {
    if (shouldUseSupabase()) {
      await supabaseClient.addSubProject(projectId, subProject);
      const projects = await supabaseClient.getProjects();
      return projects.find(p => p.id === projectId)!;
    }
    return await testDB.addSubProject(projectId, subProject);
  },

  updateSubProject: async (projectId: string, subProjectId: string, updates: Partial<SubProject>): Promise<Project> => {
    if (shouldUseSupabase()) {
      await supabaseClient.updateSubProject(subProjectId, updates);
      const projects = await supabaseClient.getProjects();
      return projects.find(p => p.id === projectId)!;
    }
    return await testDB.updateSubProject(projectId, subProjectId, updates);
  },

  deleteSubProject: async (projectId: string, subProjectId: string): Promise<Project> => {
    if (shouldUseSupabase()) {
      await supabaseClient.deleteSubProject(subProjectId);
      const projects = await supabaseClient.getProjects();
      return projects.find(p => p.id === projectId)!;
    }
    return await testDB.deleteSubProject(projectId, subProjectId);
  },

  // ============ TEAM MEMBERS ============
  addTeamMember: async (projectId: string, member: TeamMember): Promise<Project> => {
    if (shouldUseSupabase()) {
      await supabaseClient.addTeamMember(projectId, member.id, member.role);
      const projects = await supabaseClient.getProjects();
      return projects.find(p => p.id === projectId)!;
    }
    return await testDB.addTeamMember(projectId, member);
  },

  removeTeamMember: async (projectId: string, memberId: string): Promise<Project> => {
    if (shouldUseSupabase()) {
      await supabaseClient.removeTeamMember(projectId, memberId);
      const projects = await supabaseClient.getProjects();
      return projects.find(p => p.id === projectId)!;
    }
    return await testDB.removeTeamMember(projectId, memberId);
  },

  // ============ TASK LOGS ============
  getLogs: async (): Promise<LogEntry[]> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.getLogs();
    }
    return await testDB.getLogs();
  },

  createLog: async (log: Omit<LogEntry, 'id' | 'submittedAt'>): Promise<LogEntry> => {
    if (shouldUseSupabase()) {
      return await supabaseClient.createLog(log);
    }
    return await testDB.createLog(log);
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

  clearAllData: (): void => {
    if (!shouldUseSupabase()) {
      testDB.clearAllData();
    } else {
      console.warn('Cannot clear data from Supabase via this method');
    }
  },

  syncUserMemberships: async (userId: string): Promise<User> => {
    if (shouldUseSupabase()) {
      const users = await supabaseClient.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');
      return user;
    }
    const users = await testDB.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    return user;
  },

  getUserById: async (userId: string): Promise<User | null> => {
    if (shouldUseSupabase()) {
      const users = await supabaseClient.getUsers();
      return users.find(u => u.id === userId) || null;
    }
    const users = await testDB.getUsers();
    return users.find(u => u.id === userId) || null;
  },

  getProjectMembers: async (projectId: string): Promise<TeamMember[]> => {
    if (shouldUseSupabase()) {
      const project = await supabaseClient.getProjectById(projectId);
      return project?.teamMembers || [];
    }
    const projects = await testDB.getProjects();
    const project = projects.find(p => p.id === projectId);
    return project?.teamMembers || [];
  },

  getProjectSubProjects: async (projectId: string): Promise<SubProject[]> => {
    if (shouldUseSupabase()) {
      const project = await supabaseClient.getProjectById(projectId);
      return project?.subProjects || [];
    }
    const projects = await testDB.getProjects();
    const project = projects.find(p => p.id === projectId);
    return project?.subProjects || [];
  },
};

export const useDataService = () => {
  return dataService;
};