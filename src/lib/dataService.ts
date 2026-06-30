// src/lib/dataService.ts
import { testDB } from './testDB';
import { User, Project, LogEntry, TeamMember, SubProject } from '../types/models';

// Always use mock with localStorage for now
const USE_LOCAL_STORAGE = true;

export const dataService = {
  // ============ USERS ============
  getUsers: async (): Promise<User[]> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.getUsers();
    }
    // Supabase code (for future)
    return [];
  },

  createUser: async (user: Omit<User, 'id'>): Promise<User> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.createUser(user);
    }
    throw new Error('Supabase not implemented yet');
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.updateUser(id, updates);
    }
    throw new Error('Supabase not implemented yet');
  },

  deleteUser: async (id: string): Promise<void> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.deleteUser(id);
    }
    throw new Error('Supabase not implemented yet');
  },

  // ============ PROJECTS ============
  getProjects: async (): Promise<Project[]> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.getProjects();
    }
    return [];
  },

  getProjectByName: async (name: string): Promise<Project | null> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.getProjectByName(name);
    }
    return null;
  },

  createProject: async (project: Omit<Project, 'id'>): Promise<Project> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.createProject(project);
    }
    throw new Error('Supabase not implemented yet');
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.updateProject(id, updates);
    }
    throw new Error('Supabase not implemented yet');
  },

  deleteProject: async (id: string): Promise<void> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.deleteProject(id);
    }
    throw new Error('Supabase not implemented yet');
  },

  // ============ SUB-PROJECTS ============
  addSubProject: async (projectId: string, subProject: Omit<SubProject, 'id'>): Promise<Project> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.addSubProject(projectId, subProject);
    }
    throw new Error('Supabase not implemented yet');
  },

  updateSubProject: async (projectId: string, subProjectId: string, updates: Partial<SubProject>): Promise<Project> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.updateSubProject(projectId, subProjectId, updates);
    }
    throw new Error('Supabase not implemented yet');
  },

  deleteSubProject: async (projectId: string, subProjectId: string): Promise<Project> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.deleteSubProject(projectId, subProjectId);
    }
    throw new Error('Supabase not implemented yet');
  },

  // ============ TEAM MEMBERS ============
  addTeamMember: async (projectId: string, member: TeamMember): Promise<Project> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.addTeamMember(projectId, member);
    }
    throw new Error('Supabase not implemented yet');
  },

  removeTeamMember: async (projectId: string, memberId: string): Promise<Project> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.removeTeamMember(projectId, memberId);
    }
    throw new Error('Supabase not implemented yet');
  },

  // ============ TASK LOGS ============
  getLogs: async (): Promise<LogEntry[]> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.getLogs();
    }
    return [];
  },

  createLog: async (log: Omit<LogEntry, 'id' | 'submittedAt'>): Promise<LogEntry> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.createLog(log);
    }
    throw new Error('Supabase not implemented yet');
  },

  updateLog: async (id: string, updates: Partial<LogEntry>): Promise<LogEntry> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.updateLog(id, updates);
    }
    throw new Error('Supabase not implemented yet');
  },

  deleteLog: async (id: string): Promise<void> => {
    if (USE_LOCAL_STORAGE) {
      return await testDB.deleteLog(id);
    }
    throw new Error('Supabase not implemented yet');
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
    if (USE_LOCAL_STORAGE) {
      testDB.clearAllData();
    }
  },

  syncUserMemberships: async (userId: string): Promise<User> => {
    if (USE_LOCAL_STORAGE) {
      const users = await testDB.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');
      return user;
    }
    throw new Error('Supabase not implemented yet');
  },
};

export const useDataService = () => {
  return dataService;
};